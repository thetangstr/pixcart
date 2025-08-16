#!/usr/bin/env python3
"""
Download REAL cat and dog images from proper APIs
"""

import requests
import json
import time
from pathlib import Path
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

OUTPUT_DIR = Path("evaluation_dataset/real_pets")
OUTPUT_DIR.mkdir(exist_ok=True, parents=True)

def download_cats(count=50):
    """Download cat images from The Cat API"""
    logger.info(f"Downloading {count} cat images...")
    
    cat_count = 0
    for i in range(count):
        try:
            # The Cat API - free, no key needed for basic use
            response = requests.get(
                "https://api.thecatapi.com/v1/images/search",
                params={"limit": 1, "size": "med"}
            )
            
            if response.status_code == 200:
                data = response.json()
                if data and len(data) > 0:
                    img_url = data[0]['url']
                    
                    # Download the image
                    img_response = requests.get(img_url)
                    if img_response.status_code == 200:
                        filename = OUTPUT_DIR / f"cat_{i+1:03d}.jpg"
                        with open(filename, 'wb') as f:
                            f.write(img_response.content)
                        cat_count += 1
                        logger.info(f"Downloaded cat #{cat_count}")
            
            time.sleep(0.5)  # Rate limit
            
        except Exception as e:
            logger.error(f"Error downloading cat {i+1}: {e}")
    
    return cat_count

def download_dogs(count=50):
    """Download dog images from Dog CEO API"""
    logger.info(f"Downloading {count} dog images...")
    
    dog_count = 0
    for i in range(count):
        try:
            # Dog CEO API - completely free
            response = requests.get("https://dog.ceo/api/breeds/image/random")
            
            if response.status_code == 200:
                data = response.json()
                if data['status'] == 'success':
                    img_url = data['message']
                    
                    # Download the image
                    img_response = requests.get(img_url)
                    if img_response.status_code == 200:
                        filename = OUTPUT_DIR / f"dog_{i+1:03d}.jpg"
                        with open(filename, 'wb') as f:
                            f.write(img_response.content)
                        dog_count += 1
                        logger.info(f"Downloaded dog #{dog_count}")
            
            time.sleep(0.3)  # Rate limit
            
        except Exception as e:
            logger.error(f"Error downloading dog {i+1}: {e}")
    
    return dog_count

def main():
    logger.info("=" * 60)
    logger.info("DOWNLOADING REAL CAT AND DOG IMAGES")
    logger.info("=" * 60)
    
    # Download cats
    cats = download_cats(50)
    
    # Download dogs
    dogs = download_dogs(50)
    
    logger.info("\n" + "=" * 60)
    logger.info(f"✅ Downloaded {cats} cat images")
    logger.info(f"✅ Downloaded {dogs} dog images")
    logger.info(f"📁 Location: {OUTPUT_DIR}")
    logger.info("=" * 60)

if __name__ == "__main__":
    main()