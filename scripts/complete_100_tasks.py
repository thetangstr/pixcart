#!/usr/bin/env python3
"""
Complete generation to reach exactly 100 tasks
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

def generate_remaining():
    """Generate remaining tasks to reach 100"""
    
    existing_tasks = list((OUTPUT_DIR / "tasks").glob("*.json"))
    current_count = len(existing_tasks)
    target = 100
    needed = target - current_count
    
    logger.info(f"Current tasks: {current_count}")
    logger.info(f"Need {needed} more to reach {target}")
    
    if needed <= 0:
        logger.info(f"✅ Already have {current_count} tasks!")
        return current_count
    
    success = 0
    for i in range(needed):
        try:
            # Download
            category = "cat" if (current_count + i) % 2 == 0 else "dog"
            num = 300 + i
            url = f"https://picsum.photos/512/512?random={category}_{num}_{time.time()}"
            
            response = requests.get(url, timeout=5)
            if response.status_code != 200:
                continue
                
            img_b64 = base64.b64encode(response.content).decode()
            
            # Convert with ultra-fast settings
            payload = {
                "init_images": [img_b64],
                "prompt": "oil painting",
                "negative_prompt": "photo",
                "denoising_strength": 0.15,
                "cfg_scale": 2.0,
                "steps": 8,  # Ultra fast
                "sampler_name": "DPM++ 2M Karras",
                "width": 512,
                "height": 512
            }
            
            sd_resp = requests.post(f"{SD_API_URL}/sdapi/v1/img2img", json=payload, timeout=30)
            
            if sd_resp.status_code == 200:
                result = sd_resp.json()
                
                task = {
                    "id": current_count + success + 1,
                    "category": category,
                    "original_image": f"data:image/jpeg;base64,{img_b64}",
                    "converted_image": f"data:image/png;base64,{result['images'][0]}",
                    "parameters": {
                        "denoising_strength": 0.15,
                        "cfg_scale": 2.0,
                        "steps": 8
                    },
                    "timestamp": time.time(),
                    "evaluated": False,
                    "scores": None
                }
                
                task_file = OUTPUT_DIR / "tasks" / f"task_{task['id']:03d}.json"
                with open(task_file, 'w') as f:
                    json.dump(task, f, indent=2)
                
                success += 1
                logger.info(f"[{current_count + success}/{target}] Created task #{task['id']} ({category})")
                
        except Exception as e:
            logger.error(f"Error: {e}")
            continue
    
    final_count = len(list((OUTPUT_DIR / "tasks").glob("*.json")))
    logger.info(f"\n{'=' * 50}")
    logger.info(f"✅ Total tasks: {final_count}/100")
    return final_count

if __name__ == "__main__":
    final = generate_remaining()
    if final >= 100:
        logger.info("🎯 SUCCESS: 100 tasks ready for evaluation!")
    else:
        logger.info(f"⚠️  Only {final} tasks ready, run again to complete")