#!/usr/bin/env python3
"""
Convert portrait pet photos to oil paintings with optimal settings
"""

import requests
import json
import base64
from PIL import Image
import io
from pathlib import Path
import time
import logging

logging.basicConfig(level=logging.INFO, format='%(message)s')
logger = logging.getLogger(__name__)

# Optimal settings from testing
OPTIMAL_DENOISING = 0.30
OPTIMAL_CFG = 3.0

def convert_portraits():
    """Convert all portrait photos to oil paintings"""
    
    input_dir = Path("evaluation_dataset/portrait_pets")
    output_dir = Path("public/evaluation-images/portraits")
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # Create tasks directory for portrait conversions
    tasks_dir = Path("evaluation_dataset/portrait_tasks")
    tasks_dir.mkdir(exist_ok=True)
    
    logger.info("=" * 60)
    logger.info("CONVERTING PORTRAIT PHOTOS TO OIL PAINTINGS")
    logger.info(f"Settings: Denoising={OPTIMAL_DENOISING}, CFG={OPTIMAL_CFG}")
    logger.info("=" * 60)
    
    # Get all portrait images
    cat_portraits = sorted(input_dir.glob("cat_portrait_*.jpg"))
    dog_portraits = sorted(input_dir.glob("dog_portrait_*.jpg"))
    
    all_portraits = []
    for i, cat_img in enumerate(cat_portraits[:50]):
        all_portraits.append(("cat", i+1, cat_img))
    for i, dog_img in enumerate(dog_portraits[:50]):
        all_portraits.append(("dog", i+51, dog_img))
    
    logger.info(f"\nFound {len(cat_portraits)} cat portraits, {len(dog_portraits)} dog portraits")
    logger.info(f"Converting {len(all_portraits)} total images...\n")
    
    successful = 0
    failed = []
    
    for animal_type, task_id, img_path in all_portraits[:100]:  # Limit to 100 total
        try:
            logger.info(f"[{task_id}/100] Converting {animal_type} - {img_path.name}")
            
            # Load image
            with open(img_path, 'rb') as f:
                img_data = f.read()
            img_base64 = base64.b64encode(img_data).decode()
            
            # Prepare payload with optimal settings for portraits
            payload = {
                "init_images": [f"data:image/jpeg;base64,{img_base64}"],
                "prompt": "oil painting portrait, thick brushstrokes, impasto technique, classical portrait style, canvas texture, artistic masterpiece, Rembrandt style, traditional art",
                "negative_prompt": "digital art, anime, cartoon, 3d render, photograph, realistic, smooth, blurry, modern",
                "denoising_strength": OPTIMAL_DENOISING,
                "cfg_scale": OPTIMAL_CFG,
                "steps": 30,
                "sampler_name": "DPM++ 2M Karras",
                "width": 512,
                "height": 512,
                "controlnet_units": [
                    {
                        "input_image": f"data:image/jpeg;base64,{img_base64}",
                        "module": "canny",
                        "model": "control_v11p_sd15_canny",
                        "weight": 1.0,
                        "guidance_start": 0,
                        "guidance_end": 1
                    }
                ]
            }
            
            # Call SD API
            response = requests.post(
                "http://localhost:7860/sdapi/v1/img2img",
                json=payload,
                timeout=60
            )
            
            if response.status_code == 200:
                result = response.json()
                
                # Save original and converted images
                original_img = Image.open(img_path)
                converted_data = base64.b64decode(result['images'][0])
                converted_img = Image.open(io.BytesIO(converted_data))
                
                # Save to output directory
                original_output = output_dir / f"portrait_{task_id}_original.jpg"
                converted_output = output_dir / f"portrait_{task_id}_converted.jpg"
                
                original_img.save(original_output, quality=95)
                converted_img.save(converted_output, quality=95)
                
                # Create task metadata
                task_data = {
                    "id": task_id,
                    "category": animal_type,
                    "type": "portrait",
                    "original_image": f"/evaluation-images/portraits/portrait_{task_id}_original.jpg",
                    "converted_image": f"/evaluation-images/portraits/portrait_{task_id}_converted.jpg",
                    "parameters": {
                        "denoising_strength": OPTIMAL_DENOISING,
                        "cfg_scale": OPTIMAL_CFG,
                        "style": "oil_painting_portrait"
                    },
                    "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
                }
                
                # Save task file
                task_file = tasks_dir / f"portrait_task_{str(task_id).zfill(3)}.json"
                with open(task_file, 'w') as f:
                    json.dump(task_data, f, indent=2)
                
                successful += 1
                logger.info(f"  ✓ Saved portrait #{task_id}")
                
            else:
                failed.append(task_id)
                logger.error(f"  ✗ API error: {response.status_code}")
                
        except Exception as e:
            failed.append(task_id)
            logger.error(f"  ✗ Error: {str(e)[:50]}")
        
        # Small delay between conversions
        time.sleep(1)
    
    # Summary
    logger.info("\n" + "=" * 60)
    logger.info("✅ PORTRAIT CONVERSION COMPLETE!")
    logger.info(f"📊 Results: {successful}/{len(all_portraits)} successful")
    if failed:
        logger.info(f"❌ Failed: {failed}")
    logger.info(f"📁 Output: {output_dir}")
    logger.info("\n🎨 Portrait Benefits:")
    logger.info("  • Clear facial features preserved")
    logger.info("  • Better composition for oil painting")
    logger.info("  • Professional portrait aesthetic")
    logger.info("  • Higher quality source material")
    logger.info("\n🔗 View at: http://localhost:3000/evaluation-dashboard")
    
    return successful, failed

if __name__ == "__main__":
    convert_portraits()