#!/usr/bin/env python3
"""
Quick demo with 3 portraits showing distinct styles
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

# DISTINCT STYLE CONFIGS - Key differences for visibility
STYLE_CONFIGS = {
    "classic": {
        "name": "Classic Oil Portrait",
        "prompt": "baroque oil painting, classical old masters technique, Rembrandt lighting, dark background, traditional canvas",
        "negative_prompt": "modern, bright, impressionist",
        "denoising_strength": 0.35,
        "cfg_scale": 5.0,
        "sampler_name": "DPM++ 2M Karras",
        "controlnet_weight": 0.7
    },
    "impressionist": {
        "name": "Impressionist Style",
        "prompt": "impressionist oil painting, Monet style, soft brushstrokes, pastel colors, garden setting, dappled light",
        "negative_prompt": "dark, sharp, detailed",
        "denoising_strength": 0.45,  # Higher for more effect
        "cfg_scale": 4.5,
        "sampler_name": "Euler a",  # Different sampler
        "controlnet_weight": 0.55  # Lower for more freedom
    },
    "modern": {
        "name": "Modern Expressive",
        "prompt": "expressive oil painting, Van Gogh style, swirling brushstrokes, vibrant colors, emotional intensity",
        "negative_prompt": "realistic, muted, traditional",
        "denoising_strength": 0.55,  # Even higher
        "cfg_scale": 5.5,
        "sampler_name": "DPM++ SDE Karras",  # Different sampler
        "controlnet_weight": 0.45  # Much lower
    }
}

def convert_image(img_path, style_key, task_id):
    """Quick conversion"""
    try:
        with open(img_path, 'rb') as f:
            img_data = f.read()
        img_base64 = base64.b64encode(img_data).decode()
        
        style = STYLE_CONFIGS[style_key]
        
        payload = {
            "init_images": [f"data:image/jpeg;base64,{img_base64}"],
            "prompt": style["prompt"],
            "negative_prompt": style["negative_prompt"],
            "denoising_strength": style["denoising_strength"],
            "cfg_scale": style["cfg_scale"],
            "sampler_name": style["sampler_name"],
            "width": 512,
            "height": 512,
            "steps": 25,  # Faster
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
            converted_img = Image.open(io.BytesIO(converted_data))
            
            output_dir = Path("public/evaluation-images/distinct_demo")
            output_dir.mkdir(parents=True, exist_ok=True)
            output_path = output_dir / f"task_{task_id}_{style_key}.jpg"
            converted_img.save(output_path, quality=95)
            
            return True
        return False
    except Exception as e:
        logger.error(f"Error: {str(e)[:50]}")
        return False

def main():
    input_dir = Path("evaluation_dataset/quality_portraits")
    output_dir = Path("public/evaluation-images/distinct_demo")
    output_dir.mkdir(parents=True, exist_ok=True)
    tasks_dir = Path("evaluation_dataset/distinct_demo_tasks")
    tasks_dir.mkdir(exist_ok=True)
    
    # Just 3 portraits for quick demo
    portraits = [
        sorted(input_dir.glob("cat_*.jpg"))[0],
        sorted(input_dir.glob("cat_*.jpg"))[1],
        sorted(input_dir.glob("dog_*.jpg"))[0]
    ]
    
    logger.info("QUICK DISTINCT STYLES DEMO")
    logger.info("=" * 40)
    logger.info("Key differences:")
    logger.info("  Classic: 0.35 denoising, DPM++ 2M")
    logger.info("  Impressionist: 0.45 denoising, Euler a")
    logger.info("  Modern: 0.55 denoising, DPM++ SDE")
    logger.info("=" * 40)
    
    for task_id, img_path in enumerate(portraits, 1):
        animal = "cat" if "cat" in img_path.name else "dog"
        logger.info(f"\nTask {task_id}: {animal}")
        
        # Copy original
        orig = Image.open(img_path)
        orig_path = output_dir / f"task_{task_id}_original.jpg"
        orig.save(orig_path, quality=95)
        
        task_data = {
            "id": task_id,
            "category": animal,
            "original_image": f"/evaluation-images/distinct_demo/task_{task_id}_original.jpg",
            "conversions": {}
        }
        
        for style_key in ["classic", "impressionist", "modern"]:
            logger.info(f"  {STYLE_CONFIGS[style_key]['name']}...")
            if convert_image(img_path, style_key, task_id):
                task_data["conversions"][style_key] = {
                    "image": f"/evaluation-images/distinct_demo/task_{task_id}_{style_key}.jpg",
                    "style_name": STYLE_CONFIGS[style_key]["name"]
                }
                logger.info(f"    ✓ Done")
            else:
                logger.info(f"    ✗ Failed")
            time.sleep(1)
        
        # Save task
        with open(tasks_dir / f"task_{task_id}.json", 'w') as f:
            json.dump(task_data, f, indent=2)
    
    logger.info("\n✅ Demo complete!")
    logger.info(f"View at: http://localhost:3000/evaluation")

if __name__ == "__main__":
    main()