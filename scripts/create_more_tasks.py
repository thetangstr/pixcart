#!/usr/bin/env python3
"""
Create more evaluation tasks with improved parameters based on feedback
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

# IMPROVED PARAMETERS based on feedback
IMPROVED_CONFIGS = {
    "classic": {
        "name": "Classic Oil Portrait",
        "prompt": "thick oil painting with visible brushstrokes, traditional oil on canvas, impasto texture, classical portrait style",
        "negative_prompt": "digital, smooth, photograph, 3d render",
        "denoising_strength": 0.50,  # Increased from 0.35 for more effect
        "cfg_scale": 6.0,  # Increased for stronger style
        "sampler_name": "DPM++ 2M Karras",
        "controlnet_weight": 0.65  # Balanced
    },
    "impressionist": {
        "name": "Impressionist Style",
        "prompt": "impressionist oil painting, soft brushstrokes, pastel colors, atmospheric light, painterly texture",
        "negative_prompt": "sharp, detailed, photographic",
        "denoising_strength": 0.40,  # Reduced from 0.45 to preserve pet better
        "cfg_scale": 5.0,
        "sampler_name": "Euler a",
        "controlnet_weight": 0.70  # Increased to preserve pet
    },
    "modern": {
        "name": "Modern Expressive",
        "prompt": "expressive oil painting, bold brushstrokes, vibrant colors, Van Gogh style texture",
        "negative_prompt": "realistic, smooth, photographic",
        "denoising_strength": 0.42,  # Reduced from 0.55 to preserve pet
        "cfg_scale": 5.5,
        "sampler_name": "DPM++ SDE Karras",
        "controlnet_weight": 0.65  # Increased to preserve pet
    }
}

def convert_image(img_path, style_key):
    """Convert with improved parameters"""
    try:
        with open(img_path, 'rb') as f:
            img_data = f.read()
        img_base64 = base64.b64encode(img_data).decode()
        
        style = IMPROVED_CONFIGS[style_key]
        
        payload = {
            "init_images": [f"data:image/jpeg;base64,{img_base64}"],
            "prompt": style["prompt"],
            "negative_prompt": style["negative_prompt"],
            "denoising_strength": style["denoising_strength"],
            "cfg_scale": style["cfg_scale"],
            "sampler_name": style["sampler_name"],
            "width": 512,
            "height": 512,
            "steps": 30,
            "seed": 42,
            "controlnet_units": [{
                "input_image": f"data:image/jpeg;base64,{img_base64}",
                "module": "canny",
                "model": "control_v11p_sd15_canny",
                "weight": style["controlnet_weight"],
                "guidance_start": 0,
                "guidance_end": 1
            }]
        }
        
        response = requests.post("http://localhost:7860/sdapi/v1/img2img", json=payload, timeout=60)
        
        if response.status_code == 200:
            result = response.json()
            converted_data = base64.b64decode(result['images'][0])
            return Image.open(io.BytesIO(converted_data))
        return None
    except Exception as e:
        logger.error(f"Error: {str(e)[:50]}")
        return None

def main():
    input_dir = Path("evaluation_dataset/quality_portraits")
    output_dir = Path("public/evaluation-images/improved_styles")
    output_dir.mkdir(parents=True, exist_ok=True)
    tasks_dir = Path("evaluation_dataset/distinct_demo_tasks")
    tasks_dir.mkdir(exist_ok=True)
    
    # Get next portraits (skip the first one already done)
    portraits = [
        sorted(input_dir.glob("cat_*.jpg"))[1],  # Second cat
        sorted(input_dir.glob("cat_*.jpg"))[2],  # Third cat
        sorted(input_dir.glob("dog_*.jpg"))[0],  # First dog
        sorted(input_dir.glob("dog_*.jpg"))[1],  # Second dog
    ]
    
    logger.info("CREATING MORE EVALUATION TASKS")
    logger.info("Using improved parameters based on feedback:")
    logger.info("- Increased denoising for classic (0.35→0.50)")
    logger.info("- Better ControlNet balance for pet preservation")
    logger.info("=" * 40)
    
    start_id = 2  # Start from task 2
    
    for idx, img_path in enumerate(portraits, start_id):
        if not img_path.exists():
            continue
            
        animal = "cat" if "cat" in img_path.name else "dog"
        logger.info(f"\nTask {idx}: {animal} ({img_path.name})")
        
        # Copy original
        orig = Image.open(img_path)
        orig_path = output_dir / f"task_{idx}_original.jpg"
        orig.save(orig_path, quality=95)
        
        task_data = {
            "id": idx,
            "category": animal,
            "original_image": f"/evaluation-images/improved_styles/task_{idx}_original.jpg",
            "conversions": {}
        }
        
        for style_key in ["classic", "impressionist", "modern"]:
            logger.info(f"  {IMPROVED_CONFIGS[style_key]['name']}...")
            converted = convert_image(img_path, style_key)
            
            if converted:
                output_path = output_dir / f"task_{idx}_{style_key}.jpg"
                converted.save(output_path, quality=95)
                
                task_data["conversions"][style_key] = {
                    "image": f"/evaluation-images/improved_styles/task_{idx}_{style_key}.jpg",
                    "style_name": IMPROVED_CONFIGS[style_key]["name"]
                }
                logger.info(f"    ✓ Done")
            else:
                logger.info(f"    ✗ Failed")
                
            time.sleep(1)
        
        # Save task file
        with open(tasks_dir / f"task_{idx}.json", 'w') as f:
            json.dump(task_data, f, indent=2)
    
    logger.info(f"\n✅ Created {len(portraits)} more tasks!")
    logger.info("Visit http://localhost:3000/evaluation to continue")

if __name__ == "__main__":
    main()