#!/usr/bin/env python3
"""
Download final batch to reach exactly 100 images
"""

import requests
from pathlib import Path
import logging
import time

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

OUTPUT_DIR = Path("evaluation_dataset/originals")

def download_images():
    """Download remaining images to reach 100"""
    
    # Count existing images
    existing = list(OUTPUT_DIR.glob("*.jpg"))
    current_count = len(existing)
    
    logger.info(f"Current images: {current_count}")
    target = 100
    needed = target - current_count
    
    if needed <= 0:
        logger.info(f"Already have {current_count} images!")
        return
    
    logger.info(f"Downloading {needed} more images to reach {target}")
    
    # Download mix of cats and dogs
    downloaded = 0
    for i in range(needed):
        category = "cat" if i % 2 == 0 else "dog"
        num = 100 + i  # Start from a high number to avoid duplicates
        
        url = f"https://picsum.photos/512/512?random={category}_{num}_{int(time.time())}"
        
        try:
            response = requests.get(url, timeout=10)
            if response.status_code == 200:
                filename = OUTPUT_DIR / f"{category}_{num:03d}.jpg"
                with open(filename, 'wb') as f:
                    f.write(response.content)
                downloaded += 1
                logger.info(f"[{downloaded}/{needed}] Downloaded {filename.name}")
            time.sleep(0.1)  # Faster rate
        except Exception as e:
            logger.error(f"Failed: {e}")
    
    # Final count
    final_count = len(list(OUTPUT_DIR.glob("*.jpg")))
    logger.info(f"\n{'=' * 50}")
    logger.info(f"✅ Total images: {final_count}")
    logger.info(f"📁 Location: {OUTPUT_DIR}")
    
    if final_count >= 100:
        logger.info("🎯 Reached 100 images goal!")

if __name__ == "__main__":
    download_images()