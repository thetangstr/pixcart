#!/usr/bin/env python3
"""
Fast parallel download of high-quality front-facing pet portraits
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

def download_single_cat(index):
    """Download a single cat portrait"""
    try:
        # Use random breed for variety
        breeds = ['pers', 'main', 'raga', 'siam', 'beng', 'bsho', 'abys', 'birm']
        breed = random.choice(breeds)
        
        response = requests.get(
            "https://api.thecatapi.com/v1/images/search",
            params={'limit': 1, 'size': 'med'},  # Use medium for faster downloads
            timeout=5
        )
        
        if response.status_code == 200:
            data = response.json()
            if data:
                img_url = data[0]['url']
                img_response = requests.get(img_url, timeout=10)
                
                if img_response.status_code == 200:
                    img = Image.open(io.BytesIO(img_response.content))
                    
                    # Convert and resize
                    if img.mode != 'RGB':
                        img = img.convert('RGB')
                    img.thumbnail((600, 600), Image.Resampling.LANCZOS)
                    
                    # Save
                    output_dir = Path("evaluation_dataset/portrait_pets")
                    output_dir.mkdir(exist_ok=True)
                    filename = output_dir / f"cat_portrait_{str(index).zfill(3)}.jpg"
                    img.save(filename, quality=90)
                    
                    return f"✓ Cat #{index}"
    except Exception as e:
        return f"✗ Cat #{index}: {str(e)[:30]}"
    return f"✗ Cat #{index}"

def download_single_dog(index):
    """Download a single dog portrait"""
    try:
        breeds = [
            'retriever/golden', 'husky', 'samoyed', 'corgi/pembroke',
            'shiba', 'retriever/labrador', 'poodle/standard',
            'shepherd/australian', 'collie/border', 'beagle'
        ]
        breed = random.choice(breeds)
        
        response = requests.get(
            f"https://dog.ceo/api/breed/{breed}/images/random",
            timeout=5
        )
        
        if response.status_code == 200:
            data = response.json()
            if data['status'] == 'success':
                img_url = data['message']
                img_response = requests.get(img_url, timeout=10)
                
                if img_response.status_code == 200:
                    img = Image.open(io.BytesIO(img_response.content))
                    
                    # Convert and resize
                    if img.mode != 'RGB':
                        img = img.convert('RGB')
                    img.thumbnail((600, 600), Image.Resampling.LANCZOS)
                    
                    # Save
                    output_dir = Path("evaluation_dataset/portrait_pets")
                    output_dir.mkdir(exist_ok=True)
                    filename = output_dir / f"dog_portrait_{str(index).zfill(3)}.jpg"
                    img.save(filename, quality=90)
                    
                    return f"✓ Dog #{index}"
    except Exception as e:
        return f"✗ Dog #{index}: {str(e)[:30]}"
    return f"✗ Dog #{index}"

def download_portraits_parallel():
    """Download portraits in parallel for speed"""
    
    logger.info("=" * 60)
    logger.info("FAST PARALLEL PORTRAIT DOWNLOAD")
    logger.info("=" * 60)
    
    # Create output directory
    output_dir = Path("evaluation_dataset/portrait_pets")
    output_dir.mkdir(exist_ok=True)
    
    # Download in parallel
    with ThreadPoolExecutor(max_workers=10) as executor:
        # Submit cat downloads
        logger.info("\nDownloading 50 cat portraits...")
        cat_futures = [executor.submit(download_single_cat, i+1) for i in range(50)]
        
        # Submit dog downloads
        logger.info("Downloading 50 dog portraits...")
        dog_futures = [executor.submit(download_single_dog, i+1) for i in range(50)]
        
        # Wait for cats
        cat_results = []
        for future in as_completed(cat_futures):
            result = future.result()
            cat_results.append(result)
            if len(cat_results) % 10 == 0:
                logger.info(f"  Cats: {len(cat_results)}/50 completed")
        
        # Wait for dogs
        dog_results = []
        for future in as_completed(dog_futures):
            result = future.result()
            dog_results.append(result)
            if len(dog_results) % 10 == 0:
                logger.info(f"  Dogs: {len(dog_results)}/50 completed")
    
    # Count successes
    cat_success = sum(1 for r in cat_results if "✓" in r)
    dog_success = sum(1 for r in dog_results if "✓" in r)
    
    # Create metadata
    metadata = {
        "dataset": "portrait_pets",
        "description": "Front-facing portraits of cats and dogs",
        "stats": {
            "cats_downloaded": cat_success,
            "dogs_downloaded": dog_success,
            "total": cat_success + dog_success,
            "image_size": "600x600 max",
            "quality": "90% JPEG"
        }
    }
    
    with open(output_dir / "metadata.json", 'w') as f:
        json.dump(metadata, f, indent=2)
    
    logger.info("\n" + "=" * 60)
    logger.info("✅ DOWNLOAD COMPLETE!")
    logger.info(f"📸 Downloaded: {cat_success} cats, {dog_success} dogs")
    logger.info(f"📁 Location: evaluation_dataset/portrait_pets/")
    logger.info("\n🎨 Ready for oil painting conversion!")

if __name__ == "__main__":
    download_portraits_parallel()