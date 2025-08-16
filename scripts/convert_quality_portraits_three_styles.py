#!/usr/bin/env python3
"""
Convert quality pet portraits to oil paintings in 3 different styles
Each image gets Classic, Impressionist, and Modern versions
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

# Optimal settings
OPTIMAL_DENOISING = 0.30
OPTIMAL_CFG = 3.0

# Three distinct oil painting styles
STYLES = {
    "classic": {
        "name": "Classic Oil Portrait",
        "prompt": "classical oil painting portrait, old masters style, Rembrandt lighting, traditional portrait, baroque painting, canvas texture, museum quality, realistic",
        "negative_prompt": "digital art, anime, cartoon, 3d render, photograph, modern, contemporary, abstract"
    },
    "impressionist": {
        "name": "Impressionist Style", 
        "prompt": "impressionist oil painting, Claude Monet style, visible brushstrokes, soft colors, light and shadow, dreamy atmosphere, French impressionism",
        "negative_prompt": "digital art, anime, cartoon, 3d render, photograph, realistic, sharp, detailed, hyperrealistic"
    },
    "modern": {
        "name": "Modern Expressive",
        "prompt": "modern oil painting portrait, expressive brushwork, contemporary art, bold strokes, thick impasto, Van Gogh style energy, vibrant colors",
        "negative_prompt": "digital art, anime, cartoon, 3d render, photograph, classical, traditional, realistic"
    }
}

def convert_to_style(img_path, style_key):
    """Convert a single image to a specific oil painting style"""
    
    try:
        # Load image
        with open(img_path, 'rb') as f:
            img_data = f.read()
        img_base64 = base64.b64encode(img_data).decode()
        
        style = STYLES[style_key]
        
        # Prepare payload
        payload = {
            "init_images": [f"data:image/jpeg;base64,{img_base64}"],
            "prompt": style["prompt"],
            "negative_prompt": style["negative_prompt"],
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
            converted_data = base64.b64decode(result['images'][0])
            converted_img = Image.open(io.BytesIO(converted_data))
            return converted_img, True
        else:
            return None, False
            
    except Exception as e:
        logger.error(f"Error: {str(e)[:50]}")
        return None, False

def process_quality_portraits():
    """Process all quality portraits in 3 styles"""
    
    input_dir = Path("evaluation_dataset/quality_portraits")
    output_dir = Path("public/evaluation-images/quality_three_styles")
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # Tasks directory
    tasks_dir = Path("evaluation_dataset/quality_tasks")
    tasks_dir.mkdir(exist_ok=True)
    
    logger.info("=" * 60)
    logger.info("CONVERTING QUALITY PORTRAITS - 3 STYLES EACH")
    logger.info(f"Settings: Denoising={OPTIMAL_DENOISING}, CFG={OPTIMAL_CFG}")
    logger.info("=" * 60)
    
    # Get all portrait images
    cat_portraits = sorted(input_dir.glob("cat_*.jpg"))
    dog_portraits = sorted(input_dir.glob("dog_*.jpg"))
    
    # Process first 50 of each (100 total)
    all_portraits = []
    task_id = 1
    
    for cat_img in cat_portraits[:50]:
        all_portraits.append((task_id, "cat", cat_img))
        task_id += 1
    
    for dog_img in dog_portraits[:50]:
        all_portraits.append((task_id, "dog", dog_img))
        task_id += 1
    
    logger.info(f"\nProcessing {len(all_portraits)} portraits × 3 styles = {len(all_portraits)*3} conversions")
    
    successful = 0
    all_tasks = []
    
    for task_id, animal_type, img_path in all_portraits:
        logger.info(f"\n[{task_id}/{len(all_portraits)}] {animal_type} - {img_path.name}")
        
        # Copy original to public folder
        original_img = Image.open(img_path)
        original_output = output_dir / f"task_{task_id}_original.jpg"
        original_img.save(original_output, quality=95)
        
        # Convert in each style
        task_data = {
            "id": task_id,
            "category": animal_type,
            "original_image": f"/evaluation-images/quality_three_styles/task_{task_id}_original.jpg",
            "conversions": {},
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
        }
        
        for style_key, style_info in STYLES.items():
            logger.info(f"  Converting to {style_info['name']}...")
            
            converted_img, success = convert_to_style(img_path, style_key)
            
            if success and converted_img:
                # Save converted image
                converted_output = output_dir / f"task_{task_id}_{style_key}.jpg"
                converted_img.save(converted_output, quality=95)
                
                task_data["conversions"][style_key] = {
                    "image": f"/evaluation-images/quality_three_styles/task_{task_id}_{style_key}.jpg",
                    "style_name": style_info["name"],
                    "parameters": {
                        "denoising_strength": OPTIMAL_DENOISING,
                        "cfg_scale": OPTIMAL_CFG
                    }
                }
                
                successful += 1
                logger.info(f"    ✓ Saved {style_key}")
            else:
                logger.info(f"    ✗ Failed {style_key}")
            
            time.sleep(1)  # Rate limiting
        
        # Save task file
        task_file = tasks_dir / f"task_{str(task_id).zfill(3)}.json"
        with open(task_file, 'w') as f:
            json.dump(task_data, f, indent=2)
        
        all_tasks.append(task_data)
    
    # Create summary
    summary = {
        "dataset": "quality_portraits_three_styles",
        "total_images": len(all_portraits),
        "total_conversions": successful,
        "styles": list(STYLES.keys()),
        "parameters": {
            "denoising": OPTIMAL_DENOISING,
            "cfg_scale": OPTIMAL_CFG
        },
        "tasks": all_tasks
    }
    
    summary_file = tasks_dir / "summary.json"
    with open(summary_file, 'w') as f:
        json.dump(summary, f, indent=2)
    
    logger.info("\n" + "=" * 60)
    logger.info("✅ CONVERSION COMPLETE!")
    logger.info(f"📊 Successfully converted: {successful}/{len(all_portraits)*3}")
    logger.info(f"📁 Output: {output_dir}")
    logger.info("\n🎨 Ready for evaluation:")
    logger.info("  • Classic: Traditional oil painting style")
    logger.info("  • Impressionist: Soft, dreamy effects")
    logger.info("  • Modern: Bold, expressive strokes")

if __name__ == "__main__":
    # Wait for portraits to download first
    import os
    while not os.path.exists("evaluation_dataset/quality_portraits"):
        logger.info("Waiting for portraits to download...")
        time.sleep(5)
    
    # Check if we have enough images
    portrait_dir = Path("evaluation_dataset/quality_portraits")
    cat_count = len(list(portrait_dir.glob("cat_*.jpg")))
    dog_count = len(list(portrait_dir.glob("dog_*.jpg")))
    
    if cat_count >= 10 and dog_count >= 10:
        logger.info(f"Found {cat_count} cats and {dog_count} dogs. Starting conversion...")
        process_quality_portraits()
    else:
        logger.info(f"Waiting for more portraits... (have {cat_count} cats, {dog_count} dogs)")