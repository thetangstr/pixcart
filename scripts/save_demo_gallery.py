#!/usr/bin/env python3
"""
Save demonstration oil painting conversions to the gallery
"""

import requests
import json
import base64
from PIL import Image
import io
from pathlib import Path
import time
import logging
import random

logging.basicConfig(level=logging.INFO, format='%(message)s')
logger = logging.getLogger(__name__)

def get_masterpiece_prompt(pet_type):
    """Generate professional masterpiece prompt"""
    return {
        "prompt": f"(oil painting:1.5), (thick impasto:1.3), masterpiece oil painting of {pet_type}. Style of John Singer Sargent. Chiaroscuro lighting, glazing layers, museum quality, visible brushstrokes",
        "negative": "digital, photo, 3d, cartoon, smooth, flat"
    }

def convert_to_oil_painting(img_path):
    """Convert image to oil painting using masterpiece prompt"""
    try:
        with open(img_path, 'rb') as f:
            img_data = f.read()
        img_base64 = base64.b64encode(img_data).decode()
        
        pet_type = "cat" if "cat" in img_path.name else "dog"
        prompt_info = get_masterpiece_prompt(pet_type)
        
        payload = {
            "init_images": [f"data:image/jpeg;base64,{img_base64}"],
            "prompt": prompt_info["prompt"],
            "negative_prompt": prompt_info["negative"],
            "denoising_strength": 0.6,
            "cfg_scale": 7,
            "sampler_name": "DPM++ 2M Karras",
            "width": 512,
            "height": 512,
            "steps": 30,
            "seed": random.randint(1, 999999),
            "controlnet_units": [{
                "input_image": f"data:image/jpeg;base64,{img_base64}",
                "module": "canny",
                "model": "control_v11p_sd15_canny",
                "weight": 0.6,
                "guidance_start": 0,
                "guidance_end": 1
            }]
        }
        
        response = requests.post("http://localhost:7860/sdapi/v1/img2img", 
                                json=payload, timeout=60)
        
        if response.status_code == 200:
            result = response.json()
            converted_data = base64.b64decode(result['images'][0])
            return Image.open(io.BytesIO(converted_data))
        return None
    except Exception as e:
        logger.error(f"Conversion error: {e}")
        return None

def main():
    input_dir = Path("evaluation_dataset/quality_portraits")
    gallery_dir = Path("public/gallery")
    gallery_dir.mkdir(parents=True, exist_ok=True)
    
    # Select 6 best quality portraits for demo
    selected_portraits = [
        "cat_001.jpg",
        "cat_007.jpg", 
        "cat_011.jpg",
        "dog_003.jpg",
        "dog_005.jpg",
        "dog_009.jpg"
    ]
    
    gallery_data = []
    
    logger.info("=" * 60)
    logger.info("CREATING GALLERY DEMONSTRATIONS")
    logger.info("=" * 60)
    
    for idx, portrait_name in enumerate(selected_portraits, 1):
        img_path = input_dir / portrait_name
        
        if not img_path.exists():
            logger.warning(f"Portrait {portrait_name} not found")
            continue
            
        pet_type = "cat" if "cat" in portrait_name else "dog"
        logger.info(f"\n[{idx}/6] Converting {pet_type} portrait...")
        
        # Save original
        orig = Image.open(img_path)
        orig_path = gallery_dir / f"demo_{idx}_original.jpg"
        orig.save(orig_path, quality=90)
        
        # Convert to oil painting
        logger.info("  Creating masterpiece...")
        converted = convert_to_oil_painting(img_path)
        
        if converted:
            converted_path = gallery_dir / f"demo_{idx}_painting.jpg"
            converted.save(converted_path, quality=90)
            
            gallery_data.append({
                "id": f"demo_{idx}",
                "title": f"Oil Painting {pet_type.capitalize()} #{idx}",
                "description": f"Professional oil painting conversion of a {pet_type} portrait",
                "originalImage": f"/gallery/demo_{idx}_original.jpg",
                "paintingImage": f"/gallery/demo_{idx}_painting.jpg",
                "category": pet_type,
                "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
            })
            logger.info("  ✓ Success!")
        else:
            logger.info("  ✗ Failed")
        
        # Small delay between conversions
        time.sleep(2)
    
    # Save gallery data
    with open(gallery_dir / "gallery_data.json", 'w') as f:
        json.dump(gallery_data, f, indent=2)
    
    logger.info(f"\n✅ Created {len(gallery_data)} gallery demonstrations!")
    logger.info(f"📁 Gallery data saved to: public/gallery/gallery_data.json")

if __name__ == "__main__":
    main()