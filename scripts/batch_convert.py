#!/usr/bin/env python3
"""
Batch convert downloaded images to oil paintings
"""

import os
import json
import base64
import requests
from pathlib import Path
import logging
from concurrent.futures import ThreadPoolExecutor
import time

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

SD_API_URL = "http://localhost:7860"
OUTPUT_DIR = Path("evaluation_dataset")

def convert_single_image(args):
    """Convert one image to oil painting"""
    image_path, index, total = args
    
    try:
        logger.info(f"[{index}/{total}] Converting {image_path.name}")
        
        with open(image_path, 'rb') as f:
            img_b64 = base64.b64encode(f.read()).decode()
        
        # Simple, fast parameters
        payload = {
            "init_images": [img_b64],
            "prompt": "oil painting, thick brushstrokes, artistic",
            "negative_prompt": "photo, digital",
            "denoising_strength": 0.15,
            "cfg_scale": 2.0,
            "steps": 15,  # Reduced steps for speed
            "sampler_name": "DPM++ 2M Karras",
            "width": 512,
            "height": 512
        }
        
        response = requests.post(
            f"{SD_API_URL}/sdapi/v1/img2img",
            json=payload,
            timeout=60
        )
        
        if response.status_code == 200:
            result = response.json()
            output_path = OUTPUT_DIR / "converted" / f"oil_{image_path.name}"
            
            with open(output_path, 'wb') as f:
                f.write(base64.b64decode(result['images'][0]))
            
            # Create task file
            category = "cat" if "cat" in image_path.name else "dog"
            task_id = index
            
            with open(image_path, 'rb') as f:
                orig_b64 = base64.b64encode(f.read()).decode()
            with open(output_path, 'rb') as f:
                conv_b64 = base64.b64encode(f.read()).decode()
            
            task = {
                "id": task_id,
                "category": category,
                "original_image": f"data:image/jpeg;base64,{orig_b64}",
                "converted_image": f"data:image/jpeg;base64,{conv_b64}",
                "parameters": {
                    "denoising_strength": 0.15,
                    "cfg_scale": 2.0,
                    "steps": 15,
                    "sampler_name": "DPM++ 2M Karras"
                },
                "timestamp": time.time(),
                "evaluated": False,
                "scores": None
            }
            
            task_file = OUTPUT_DIR / "tasks" / f"task_{task_id:03d}.json"
            with open(task_file, 'w') as f:
                json.dump(task, f)
            
            logger.info(f"[{index}/{total}] ✓ Completed {image_path.name}")
            return True
            
    except Exception as e:
        logger.error(f"[{index}/{total}] ✗ Failed {image_path.name}: {e}")
        return False

def main():
    logger.info("Batch Oil Painting Conversion")
    logger.info("=" * 40)
    
    # Get all original images
    originals_dir = OUTPUT_DIR / "originals"
    converted_dir = OUTPUT_DIR / "converted"
    all_images = list(originals_dir.glob("*.jpg"))
    
    # Filter out already converted images
    converted_names = {f.name.replace("oil_", "") for f in converted_dir.glob("*.jpg")}
    images = [img for img in all_images if img.name not in converted_names]
    
    if not images:
        logger.info(f"All {len(all_images)} images already converted!")
        logger.info(f"📁 Tasks ready in: evaluation_dataset/tasks/")
        logger.info("🔗 Visit http://localhost:3000/human-eval")
        return
    
    logger.info(f"Found {len(images)} new images to convert (of {len(all_images)} total)")
    
    # Get next task ID
    existing_tasks = list((OUTPUT_DIR / "tasks").glob("task_*.json"))
    next_id = len(existing_tasks) + 1
    
    # Convert all images
    tasks = [(img, next_id + i, len(images)) for i, img in enumerate(images)]
    
    success = 0
    failed = 0
    
    for task in tasks:
        if convert_single_image(task):
            success += 1
        else:
            failed += 1
    
    logger.info("\n" + "=" * 40)
    logger.info(f"✅ Successful: {success}")
    logger.info(f"❌ Failed: {failed}")
    logger.info(f"📁 Tasks in: evaluation_dataset/tasks/")
    logger.info("🔗 Visit http://localhost:3000/human-eval")

if __name__ == "__main__":
    main()