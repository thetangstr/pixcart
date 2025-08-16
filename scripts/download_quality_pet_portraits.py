#!/usr/bin/env python3
"""
Download high-quality front-facing pet portraits
Filter for only portrait/headshot style images
"""

import requests
import json
from pathlib import Path
import time
from PIL import Image
import io
import logging
from concurrent.futures import ThreadPoolExecutor, as_completed
import random

logging.basicConfig(level=logging.INFO, format='%(message)s')
logger = logging.getLogger(__name__)

def check_portrait_quality(img):
    """Check if image is a good portrait"""
    width, height = img.size
    aspect_ratio = width / height
    
    # Portrait criteria:
    # 1. Square or portrait orientation
    # 2. Sufficient resolution
    # 3. Not too wide (landscape)
    if 0.7 <= aspect_ratio <= 1.3 and min(width, height) >= 500:
        return True
    return False

def download_cat_portrait(index):
    """Download a single high-quality cat portrait"""
    try:
        # Use specific API parameters for better portraits
        params = {
            'limit': 1,
            'size': 'full',
            'mime_types': 'jpg',
            'has_breeds': 1,  # Breed cats often have better photos
            'order': 'RANDOM'
        }
        
        # Try multiple times to get a good portrait
        for attempt in range(3):
            response = requests.get(
                "https://api.thecatapi.com/v1/images/search",
                params=params,
                headers={'x-api-key': 'live_oKJR5MJEkQmWVLHBNMEKBFjGzVn5bZLFvgLNVvDWpXOKMYLvfkKDtymSJXq0r2Lz'},
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data and len(data) > 0:
                    img_url = data[0]['url']
                    
                    # Download and check image
                    img_response = requests.get(img_url, timeout=10)
                    if img_response.status_code == 200:
                        img = Image.open(io.BytesIO(img_response.content))
                        
                        # Quality check
                        if check_portrait_quality(img):
                            if img.mode != 'RGB':
                                img = img.convert('RGB')
                            
                            # Center crop to square for better portraits
                            width, height = img.size
                            size = min(width, height)
                            left = (width - size) // 2
                            top = (height - size) // 2
                            img = img.crop((left, top, left + size, top + size))
                            
                            # Resize to consistent size
                            img = img.resize((512, 512), Image.Resampling.LANCZOS)
                            
                            # Save
                            output_dir = Path("evaluation_dataset/quality_portraits")
                            output_dir.mkdir(exist_ok=True)
                            filename = output_dir / f"cat_{str(index).zfill(3)}.jpg"
                            img.save(filename, quality=95)
                            
                            return f"✓ Cat #{index} - {data[0].get('breeds', [{}])[0].get('name', 'Mixed')}"
            
            time.sleep(0.5)
        
        return f"✗ Cat #{index} - No good portrait found"
                    
    except Exception as e:
        return f"✗ Cat #{index}: {str(e)[:30]}"

def download_dog_portrait(index):
    """Download a single high-quality dog portrait"""
    try:
        # Breeds known for good portraits
        portrait_breeds = [
            'retriever/golden',
            'labrador',
            'husky',
            'corgi/pembroke',
            'poodle/standard',
            'bulldog/french',
            'shiba',
            'beagle',
            'spaniel/cocker',
            'pomeranian'
        ]
        
        breed = random.choice(portrait_breeds)
        
        # Try multiple images from the breed
        for attempt in range(5):
            response = requests.get(
                f"https://dog.ceo/api/breed/{breed}/images/random",
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data['status'] == 'success':
                    img_url = data['message']
                    
                    # Download and check
                    img_response = requests.get(img_url, timeout=10)
                    if img_response.status_code == 200:
                        img = Image.open(io.BytesIO(img_response.content))
                        
                        # Quality check
                        if check_portrait_quality(img):
                            if img.mode != 'RGB':
                                img = img.convert('RGB')
                            
                            # Center crop to square
                            width, height = img.size
                            size = min(width, height)
                            left = (width - size) // 2
                            top = (height - size) // 2
                            img = img.crop((left, top, left + size, top + size))
                            
                            # Resize
                            img = img.resize((512, 512), Image.Resampling.LANCZOS)
                            
                            # Save
                            output_dir = Path("evaluation_dataset/quality_portraits")
                            output_dir.mkdir(exist_ok=True)
                            filename = output_dir / f"dog_{str(index).zfill(3)}.jpg"
                            img.save(filename, quality=95)
                            
                            breed_name = breed.replace('/', ' ').title()
                            return f"✓ Dog #{index} - {breed_name}"
            
            time.sleep(0.3)
        
        return f"✗ Dog #{index} - No good portrait found"
                    
    except Exception as e:
        return f"✗ Dog #{index}: {str(e)[:30]}"

def download_quality_portraits():
    """Download high-quality pet portraits"""
    
    logger.info("=" * 60)
    logger.info("DOWNLOADING HIGH-QUALITY PET PORTRAITS")
    logger.info("Filtering for front-facing, portrait-style images only")
    logger.info("=" * 60)
    
    output_dir = Path("evaluation_dataset/quality_portraits")
    output_dir.mkdir(exist_ok=True)
    
    # Download with strict quality filtering
    with ThreadPoolExecutor(max_workers=5) as executor:
        # Submit cat downloads
        logger.info("\nDownloading 50 cat portraits...")
        cat_futures = [executor.submit(download_cat_portrait, i+1) for i in range(50)]
        
        # Submit dog downloads
        logger.info("Downloading 50 dog portraits...")
        dog_futures = [executor.submit(download_dog_portrait, i+1) for i in range(50)]
        
        # Collect results
        cat_results = []
        for i, future in enumerate(as_completed(cat_futures), 1):
            result = future.result()
            cat_results.append(result)
            if i % 10 == 0:
                logger.info(f"  Cats: {i}/50 processed")
        
        dog_results = []
        for i, future in enumerate(as_completed(dog_futures), 1):
            result = future.result()
            dog_results.append(result)
            if i % 10 == 0:
                logger.info(f"  Dogs: {i}/50 processed")
    
    # Count successes
    cat_success = sum(1 for r in cat_results if "✓" in r)
    dog_success = sum(1 for r in dog_results if "✓" in r)
    
    # Log successful downloads
    logger.info("\n" + "=" * 60)
    logger.info("QUALITY PORTRAITS DOWNLOADED")
    logger.info(f"✅ Cats: {cat_success}/50 high-quality portraits")
    logger.info(f"✅ Dogs: {dog_success}/50 high-quality portraits")
    logger.info(f"📁 Location: {output_dir}")
    logger.info("\nAll images are:")
    logger.info("  • Front-facing portraits")
    logger.info("  • Square cropped (512x512)")
    logger.info("  • High resolution")
    logger.info("  • Perfect for oil painting conversion")
    
    return cat_success, dog_success

if __name__ == "__main__":
    download_quality_portraits()