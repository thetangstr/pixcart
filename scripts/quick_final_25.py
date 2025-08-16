#!/usr/bin/env python3
"""
Quick download and convert final 25 images
"""

import requests
import base64
import json
import time
from pathlib import Path
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

SD_API_URL = "http://localhost:7860"
OUTPUT_DIR = Path("evaluation_dataset")

def process_batch():
    """Download and immediately convert images"""
    
    existing_count = len(list((OUTPUT_DIR / "tasks").glob("*.json")))
    target = 100
    needed = target - existing_count
    
    logger.info(f"Have {existing_count} tasks, need {needed} more to reach {target}")
    
    if needed <= 0:
        logger.info("Already have enough tasks!")
        return
        
    success = 0
    for i in range(min(needed, 25)):  # Max 25 at a time
        try:
            # Download image
            category = "cat" if i % 2 == 0 else "dog"
            num = 200 + i
            url = f"https://picsum.photos/512/512?random={category}_{num}"
            
            response = requests.get(url, timeout=5)
            if response.status_code != 200:
                continue
                
            img_data = response.content
            img_b64 = base64.b64encode(img_data).decode()
            
            # Immediately convert
            payload = {
                "init_images": [img_b64],
                "prompt": "oil painting style, thick brushstrokes",
                "negative_prompt": "photo",
                "denoising_strength": 0.15,
                "cfg_scale": 2.0,
                "steps": 10,  # Very fast
                "sampler_name": "DPM++ 2M Karras"
            }
            
            sd_response = requests.post(
                f"{SD_API_URL}/sdapi/v1/img2img",
                json=payload,
                timeout=30
            )
            
            if sd_response.status_code == 200:
                result = sd_response.json()
                
                # Create task
                task = {
                    "id": existing_count + success + 1,
                    "category": category,
                    "original_image": f"data:image/jpeg;base64,{img_b64}",
                    "converted_image": f"data:image/png;base64,{result['images'][0]}",
                    "parameters": {
                        "denoising_strength": 0.15,
                        "cfg_scale": 2.0,
                        "steps": 10
                    },
                    "timestamp": time.time(),
                    "evaluated": False,
                    "scores": None
                }
                
                task_file = OUTPUT_DIR / "tasks" / f"task_{task['id']:03d}.json"
                with open(task_file, 'w') as f:
                    json.dump(task, f)
                
                success += 1
                logger.info(f"[{success}/{needed}] Created task #{task['id']} ({category})")
                
        except Exception as e:
            logger.error(f"Failed: {e}")
            continue
    
    total_tasks = len(list((OUTPUT_DIR / "tasks").glob("*.json")))
    logger.info(f"\n{'=' * 50}")
    logger.info(f"✅ Created {success} new tasks")
    logger.info(f"📊 Total tasks: {total_tasks}")
    logger.info("🔗 Visit http://localhost:3000/human-eval")

if __name__ == "__main__":
    process_batch()