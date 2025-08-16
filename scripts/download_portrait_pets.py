#!/usr/bin/env python3
"""
Download high-quality front-facing portrait shots of cats and dogs
Perfect for oil painting conversion
"""

import requests
import json
from pathlib import Path
import time
from PIL import Image
import io
import logging

logging.basicConfig(level=logging.INFO, format='%(message)s')
logger = logging.getLogger(__name__)

def download_portrait_cats(count=50):
    """Download front-facing cat portraits using The Cat API v2 with better filtering"""
    
    output_dir = Path("evaluation_dataset/portrait_pets")
    output_dir.mkdir(exist_ok=True)
    
    logger.info("Downloading high-quality cat portraits...")
    
    successful = 0
    attempts = 0
    max_attempts = count * 3  # Allow more attempts to get quality images
    
    # Use Cat API with specific breed IDs known for good portraits
    portrait_friendly_breeds = [
        'pers',  # Persian - great frontal shots
        'main',  # Maine Coon - majestic portraits  
        'raga',  # Ragdoll - photogenic
        'siam',  # Siamese - distinctive faces
        'beng',  # Bengal - beautiful patterns
        'bsho',  # British Shorthair - round faces
        'abys',  # Abyssinian - elegant
        'birm',  # Birman - blue eyes
        'norw',  # Norwegian Forest Cat
        'ragd',  # Ragdoll
    ]
    
    while successful < count and attempts < max_attempts:
        try:
            # Rotate through breeds for variety
            breed = portrait_friendly_breeds[successful % len(portrait_friendly_breeds)]
            
            # API call with breed filter and larger image size
            response = requests.get(
                "https://api.thecatapi.com/v1/images/search",
                params={
                    'breed_ids': breed,
                    'limit': 1,
                    'size': 'full',  # Get full resolution
                    'mime_types': 'jpg,png'
                },
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data and len(data) > 0:
                    img_url = data[0]['url']
                    
                    # Download image
                    img_response = requests.get(img_url, timeout=10)
                    if img_response.status_code == 200:
                        # Load and check image
                        img = Image.open(io.BytesIO(img_response.content))
                        
                        # Quality checks
                        width, height = img.size
                        aspect_ratio = width / height
                        
                        # Filter for portrait-oriented or square images
                        if 0.7 <= aspect_ratio <= 1.3 and min(width, height) >= 400:
                            # Convert to RGB if needed
                            if img.mode != 'RGB':
                                img = img.convert('RGB')
                            
                            # Resize to consistent size while maintaining aspect ratio
                            img.thumbnail((800, 800), Image.Resampling.LANCZOS)
                            
                            # Save image
                            filename = output_dir / f"cat_portrait_{str(successful + 1).zfill(3)}.jpg"
                            img.save(filename, quality=95)
                            
                            successful += 1
                            logger.info(f"  ✓ Cat #{successful}: {data[0].get('breeds', [{}])[0].get('name', breed)} ({width}x{height})")
                        else:
                            logger.debug(f"  Skip: Wrong aspect ratio or too small")
            
            attempts += 1
            time.sleep(0.5)  # Rate limiting
            
        except Exception as e:
            logger.debug(f"  Error: {e}")
            attempts += 1
            time.sleep(1)
    
    return successful

def download_portrait_dogs(count=50):
    """Download front-facing dog portraits with breed selection"""
    
    output_dir = Path("evaluation_dataset/portrait_pets")
    output_dir.mkdir(exist_ok=True)
    
    logger.info("\nDownloading high-quality dog portraits...")
    
    successful = 0
    attempts = 0
    max_attempts = count * 3
    
    # Dog breeds known for great portraits
    portrait_breeds = [
        'retriever/golden',      # Golden Retriever - friendly faces
        'husky',                  # Husky - striking eyes
        'samoyed',               # Samoyed - smiling faces
        'corgi/pembroke',        # Corgi - cute expressions
        'shiba',                 # Shiba Inu - fox-like faces
        'retriever/labrador',    # Labrador - classic portraits
        'poodle/standard',       # Poodle - elegant
        'shepherd/australian',   # Australian Shepherd - beautiful eyes
        'collie/border',         # Border Collie - intelligent look
        'spaniel/cocker',        # Cocker Spaniel - soulful eyes
        'bulldog/french',        # French Bulldog - distinctive
        'pomeranian',            # Pomeranian - fluffy portraits
        'maltese',               # Maltese - white fluffy
        'beagle',                # Beagle - classic hound face
        'dachshund',             # Dachshund - unique proportions
    ]
    
    while successful < count and attempts < max_attempts:
        try:
            # Get specific breed for better portraits
            breed = portrait_breeds[successful % len(portrait_breeds)]
            
            response = requests.get(
                f"https://dog.ceo/api/breed/{breed}/images/random",
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data['status'] == 'success':
                    img_url = data['message']
                    
                    # Download image
                    img_response = requests.get(img_url, timeout=10)
                    if img_response.status_code == 200:
                        # Load and check image
                        img = Image.open(io.BytesIO(img_response.content))
                        
                        # Quality checks
                        width, height = img.size
                        aspect_ratio = width / height
                        
                        # Filter for portrait-oriented or square images
                        if 0.7 <= aspect_ratio <= 1.3 and min(width, height) >= 400:
                            # Convert to RGB if needed
                            if img.mode != 'RGB':
                                img = img.convert('RGB')
                            
                            # Resize to consistent size
                            img.thumbnail((800, 800), Image.Resampling.LANCZOS)
                            
                            # Save image
                            filename = output_dir / f"dog_portrait_{str(successful + 1).zfill(3)}.jpg"
                            img.save(filename, quality=95)
                            
                            successful += 1
                            breed_name = breed.replace('/', ' ').title()
                            logger.info(f"  ✓ Dog #{successful}: {breed_name} ({width}x{height})")
                        else:
                            logger.debug(f"  Skip: Wrong aspect ratio or too small")
            
            attempts += 1
            time.sleep(0.5)
            
        except Exception as e:
            logger.debug(f"  Error: {e}")
            attempts += 1
            time.sleep(1)
    
    return successful

def create_portrait_metadata():
    """Create metadata file for portrait images"""
    
    portraits_dir = Path("evaluation_dataset/portrait_pets")
    metadata = {
        "dataset": "portrait_pets",
        "description": "High-quality front-facing portraits of cats and dogs",
        "criteria": {
            "aspect_ratio": "0.7 to 1.3 (portrait or square)",
            "min_resolution": "400px minimum dimension",
            "max_size": "800x800 after resize",
            "quality": "95% JPEG",
            "selection": "Specific breeds known for good portraits"
        },
        "benefits": {
            "oil_painting": [
                "Clear facial features for better preservation",
                "Consistent composition for training",
                "High detail for texture conversion",
                "Professional portrait aesthetic"
            ]
        },
        "images": {
            "cats": [],
            "dogs": []
        }
    }
    
    # Catalog images
    for img_file in sorted(portraits_dir.glob("cat_portrait_*.jpg")):
        metadata["images"]["cats"].append(img_file.name)
    
    for img_file in sorted(portraits_dir.glob("dog_portrait_*.jpg")):
        metadata["images"]["dogs"].append(img_file.name)
    
    # Save metadata
    with open(portraits_dir / "portrait_metadata.json", 'w') as f:
        json.dump(metadata, f, indent=2)
    
    return metadata

def main():
    """Download portrait dataset"""
    
    logger.info("=" * 60)
    logger.info("DOWNLOADING HIGH-QUALITY PORTRAIT DATASET")
    logger.info("=" * 60)
    
    # Download portraits
    cats = download_portrait_cats(50)
    dogs = download_portrait_dogs(50)
    
    # Create metadata
    metadata = create_portrait_metadata()
    
    logger.info("\n" + "=" * 60)
    logger.info("✅ PORTRAIT DATASET COMPLETE!")
    logger.info(f"📸 Downloaded: {cats} cat portraits, {dogs} dog portraits")
    logger.info(f"📁 Location: evaluation_dataset/portrait_pets/")
    logger.info("\n🎨 Benefits for oil painting:")
    logger.info("  • Clear facial features")
    logger.info("  • Consistent framing")
    logger.info("  • High resolution details")
    logger.info("  • Professional quality")
    logger.info("\n📊 Next steps:")
    logger.info("  1. Convert with optimal settings (denoising 0.30)")
    logger.info("  2. Evaluate preservation of facial features")
    logger.info("  3. Compare with previous random images")

if __name__ == "__main__":
    main()