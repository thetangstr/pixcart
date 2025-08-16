#!/usr/bin/env python3
"""
Quick setup: Download 10 test images (5 cats, 5 dogs) for evaluation testing
"""

import os
import json
import time
import base64
import requests
from pathlib import Path
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

SD_API_URL = "http://localhost:7860"
OUTPUT_DIR = Path("evaluation_dataset")

# Create directories
OUTPUT_DIR.mkdir(exist_ok=True)
(OUTPUT_DIR / "originals").mkdir(exist_ok=True)
(OUTPUT_DIR / "converted").mkdir(exist_ok=True)
(OUTPUT_DIR / "tasks").mkdir(exist_ok=True)

# Optimal params from RL training
PARAMS = {
    "denoising_strength": 0.15,
    "cfg_scale": 2.0,
    "steps": 20,
    "sampler_name": "DPM++ 2M Karras"
}

def download_test_images():
    """Download a few test images quickly"""
    images = []
    
    # Download 5 cats and 5 dogs
    for category in ["cat", "dog"]:
        for i in range(5):
            url = f"https://picsum.photos/512/512?random={category}_{i}"
            response = requests.get(url)
            
            if response.status_code == 200:
                filename = OUTPUT_DIR / "originals" / f"{category}_{i+1}.jpg"
                with open(filename, 'wb') as f:
                    f.write(response.content)
                images.append((filename, category))
                logger.info(f"Downloaded {category} #{i+1}")
    
    return images

def convert_image(image_path, category):
    """Convert to oil painting"""
    with open(image_path, 'rb') as f:
        img_b64 = base64.b64encode(f.read()).decode()
    
    payload = {
        "init_images": [img_b64],
        "prompt": "oil painting, soft impressionist style, thick brushstrokes",
        "negative_prompt": "photo, digital, smooth",
        **PARAMS,
        "alwayson_scripts": {
            "controlnet": {
                "args": [{
                    "enabled": True,
                    "module": "canny",
                    "model": "control_v11p_sd15_canny",
                    "weight": 0.98
                }]
            }
        }
    }
    
    try:
        response = requests.post(f"{SD_API_URL}/sdapi/v1/img2img", json=payload, timeout=60)
        if response.status_code == 200:
            result = response.json()
            output_path = OUTPUT_DIR / "converted" / f"oil_{image_path.name}"
            
            with open(output_path, 'wb') as f:
                f.write(base64.b64decode(result['images'][0]))
            
            logger.info(f"Converted {image_path.name}")
            return output_path
    except Exception as e:
        logger.error(f"Conversion failed: {e}")
    
    return None

def create_task_file(original, converted, category, task_id):
    """Create task JSON for evaluation"""
    with open(original, 'rb') as f:
        orig_b64 = base64.b64encode(f.read()).decode()
    with open(converted, 'rb') as f:
        conv_b64 = base64.b64encode(f.read()).decode()
    
    task = {
        "id": task_id,
        "category": category,
        "original_image": f"data:image/jpeg;base64,{orig_b64}",
        "converted_image": f"data:image/jpeg;base64,{conv_b64}",
        "parameters": PARAMS,
        "timestamp": time.time(),
        "evaluated": False,
        "scores": None  # Will be filled by evaluation
    }
    
    task_file = OUTPUT_DIR / "tasks" / f"task_{task_id:03d}.json"
    with open(task_file, 'w') as f:
        json.dump(task, f)
    
    logger.info(f"Created task #{task_id}")
    return task_file

def main():
    logger.info("Quick Evaluation Setup")
    logger.info("=" * 40)
    
    # Download test images
    images = download_test_images()
    logger.info(f"\nDownloaded {len(images)} test images")
    
    # Convert each and create tasks
    task_id = 1
    for image_path, category in images:
        logger.info(f"\nProcessing {image_path.name}...")
        converted = convert_image(image_path, category)
        
        if converted:
            create_task_file(image_path, converted, category, task_id)
            task_id += 1
    
    logger.info("\n" + "=" * 40)
    logger.info(f"✅ Created {task_id-1} evaluation tasks")
    logger.info("📁 Tasks saved in: evaluation_dataset/tasks/")
    logger.info("🔗 Open http://localhost:3000/human-eval to start evaluating")

if __name__ == "__main__":
    main()