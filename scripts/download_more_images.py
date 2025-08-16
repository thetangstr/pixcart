#!/usr/bin/env python3
"""
Download more cat and dog images to reach 100 total
"""

import requests
from pathlib import Path
import logging
import time

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

OUTPUT_DIR = Path("evaluation_dataset/originals")

def download_batch(category, start_num, count):
    """Download a batch of images"""
    downloaded = 0
    
    for i in range(count):
        num = start_num + i
        url = f"https://picsum.photos/512/512?random={category}_{num}_{int(time.time())}"
        
        try:
            response = requests.get(url, timeout=10)
            if response.status_code == 200:
                filename = OUTPUT_DIR / f"{category}_{num:03d}.jpg"
                with open(filename, 'wb') as f:
                    f.write(response.content)
                downloaded += 1
                logger.info(f"Downloaded {category}_{num:03d}.jpg ({downloaded}/{count})")
            time.sleep(0.2)  # Rate limit
        except Exception as e:
            logger.error(f"Failed {category}_{num}: {e}")
    
    return downloaded

def main():
    logger.info("Downloading additional images to reach 100 total")
    logger.info("=" * 50)
    
    # We have ~31 cats and ~6 dogs, need to reach 50 each
    cats_needed = 50 - 31  # ~19 more cats
    dogs_needed = 50 - 6   # ~44 more dogs
    
    logger.info(f"Need {cats_needed} more cats, {dogs_needed} more dogs")
    
    # Download missing cats
    if cats_needed > 0:
        logger.info(f"\nDownloading {cats_needed} more cat images...")
        cats_downloaded = download_batch("cat", 32, cats_needed)
        logger.info(f"Downloaded {cats_downloaded} cat images")
    
    # Download missing dogs  
    if dogs_needed > 0:
        logger.info(f"\nDownloading {dogs_needed} more dog images...")
        dogs_downloaded = download_batch("dog", 7, dogs_needed)
        logger.info(f"Downloaded {dogs_downloaded} dog images")
    
    # Count final total
    total_images = len(list(OUTPUT_DIR.glob("*.jpg")))
    logger.info(f"\n{'=' * 50}")
    logger.info(f"✅ Total images now: {total_images}")
    logger.info(f"📁 Ready for conversion in: {OUTPUT_DIR}")
    logger.info(f"🎨 Run: python3 scripts/batch_convert.py")

if __name__ == "__main__":
    main()