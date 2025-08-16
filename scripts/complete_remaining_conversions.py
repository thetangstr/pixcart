#!/usr/bin/env python3
"""
Complete remaining conversions with universal parameters
"""

import requests
import json
import base64
from PIL import Image
import io
from pathlib import Path
import time
import logging

logging.basicConfig(level=logging.INFO, format='%(message)s')
logger = logging.getLogger(__name__)

# UNIVERSAL OPTIMAL PARAMETERS (same for ALL)
UNIVERSAL_PARAMS = {
    "denoising_strength": 0.35,
    "cfg_scale": 5.0,
    "steps": 30,
    "controlnet_weight": 0.7,
    "sampler": "DPM++ 2M Karras"
}

# Style prompts
STYLE_PROMPTS = {
    "classic": {
        "name": "Classic Oil Portrait",
        "prompt_additions": "in the style of Rembrandt, old masters technique, dark chiaroscuro background, dramatic lighting, baroque painting",
        "negative_additions": "modern, impressionist, abstract",
        "seed_offset": 0
    },
    "impressionist": {
        "name": "Impressionist Style", 
        "prompt_additions": "in the style of Claude Monet, impressionist painting, soft brushstrokes, dappled light, pastel colors, dreamy atmosphere",
        "negative_additions": "realistic, sharp, detailed, dark",
        "seed_offset": 100
    },
    "modern": {
        "name": "Modern Expressive",
        "prompt_additions": "in the style of Van Gogh, expressive brushstrokes, vibrant colors, swirling patterns, emotional intensity",
        "negative_additions": "realistic, smooth, subtle, muted colors",
        "seed_offset": 200
    }
}

BASE_PROMPT = "professional oil painting portrait of a pet, thick brushstrokes, impasto technique, traditional canvas texture"
BASE_NEGATIVE = "digital art, anime, cartoon, 3d render, photograph, low quality"

def convert_image(img_path, style_key, output_dir):
    """Convert single image with style"""
    try:
        with open(img_path, 'rb') as f:
            img_data = f.read()
        img_base64 = base64.b64encode(img_data).decode()
        
        style = STYLE_PROMPTS[style_key]
        full_prompt = f"{BASE_PROMPT}, {style['prompt_additions']}"
        full_negative = f"{BASE_NEGATIVE}, {style['negative_additions']}"
        
        payload = {
            "init_images": [f"data:image/jpeg;base64,{img_base64}"],
            "prompt": full_prompt,
            "negative_prompt": full_negative,
            "denoising_strength": UNIVERSAL_PARAMS["denoising_strength"],
            "cfg_scale": UNIVERSAL_PARAMS["cfg_scale"],
            "steps": UNIVERSAL_PARAMS["steps"],
            "sampler_name": UNIVERSAL_PARAMS["sampler"],
            "width": 512,
            "height": 512,
            "seed": 42 + style["seed_offset"],
            "controlnet_units": [{
                "input_image": f"data:image/jpeg;base64,{img_base64}",
                "module": "canny",
                "model": "control_v11p_sd15_canny",
                "weight": UNIVERSAL_PARAMS["controlnet_weight"],
                "guidance_start": 0,
                "guidance_end": 1
            }]
        }
        
        response = requests.post("http://localhost:7860/sdapi/v1/img2img", json=payload, timeout=60)
        
        if response.status_code == 200:
            result = response.json()
            converted_data = base64.b64decode(result['images'][0])
            converted_img = Image.open(io.BytesIO(converted_data))
            output_path = output_dir / f"{img_path.stem}_{style_key}.jpg"
            converted_img.save(output_path, quality=95)
            return True
        return False
    except Exception as e:
        logger.error(f"Error: {str(e)[:50]}")
        return False

def main():
    input_dir = Path("evaluation_dataset/quality_portraits")
    output_dir = Path("public/evaluation-images/universal_params")
    output_dir.mkdir(parents=True, exist_ok=True)
    tasks_dir = Path("evaluation_dataset/universal_tasks")
    tasks_dir.mkdir(exist_ok=True)
    
    # Check what's already done
    existing_tasks = len(list(tasks_dir.glob("*.json")))
    logger.info(f"Found {existing_tasks} existing tasks")
    
    # Get next 6 portraits to process
    all_portraits = sorted(input_dir.glob("cat_*.jpg"))[:5] + sorted(input_dir.glob("dog_*.jpg"))[:5]
    
    # Start from where we left off
    start_idx = existing_tasks
    portraits_to_process = all_portraits[start_idx:start_idx+6]
    
    if not portraits_to_process:
        logger.info("All portraits already processed!")
        return
    
    logger.info(f"Processing {len(portraits_to_process)} remaining portraits")
    logger.info("=" * 60)
    
    task_id = existing_tasks + 1
    
    for img_path in portraits_to_process:
        animal_type = "cat" if "cat" in img_path.name else "dog"
        logger.info(f"\n[Task {task_id}] {animal_type} - {img_path.name}")
        
        # Copy original
        original_img = Image.open(img_path)
        original_output = output_dir / f"task_{task_id}_original.jpg"
        original_img.save(original_output, quality=95)
        
        # Task data
        task_data = {
            "id": task_id,
            "category": animal_type,
            "original_image": f"/evaluation-images/universal_params/task_{task_id}_original.jpg",
            "conversions": {},
            "parameters": UNIVERSAL_PARAMS,
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
        }
        
        # Convert each style
        for style_key in STYLE_PROMPTS.keys():
            logger.info(f"  Converting {STYLE_PROMPTS[style_key]['name']}...")
            success = convert_image(img_path, style_key, output_dir)
            
            if success:
                task_data["conversions"][style_key] = {
                    "image": f"/evaluation-images/universal_params/{img_path.stem}_{style_key}.jpg",
                    "style_name": STYLE_PROMPTS[style_key]["name"],
                    "prompt_additions": STYLE_PROMPTS[style_key]["prompt_additions"]
                }
                logger.info(f"    ✓ Done")
            else:
                logger.info(f"    ✗ Failed")
            
            time.sleep(1)
        
        # Save task file
        task_file = tasks_dir / f"task_{str(task_id).zfill(3)}.json"
        with open(task_file, 'w') as f:
            json.dump(task_data, f, indent=2)
        
        task_id += 1
    
    logger.info("\n" + "=" * 60)
    logger.info(f"✅ Processed {len(portraits_to_process)} portraits")
    logger.info(f"📁 Total tasks: {task_id - 1}")

if __name__ == "__main__":
    main()