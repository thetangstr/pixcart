#!/usr/bin/env python3
"""
Convert portraits with VERY DISTINCT oil painting styles
Each style has different parameters and techniques
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

# DISTINCT STYLES WITH DIFFERENT PARAMETERS
STYLES = {
    "classic": {
        "name": "Classic Oil Portrait",
        "prompt": "classical oil painting, old masters technique, Rembrandt style, dark background, dramatic lighting, realistic portrait, fine details, smooth blending, traditional art, museum quality",
        "negative_prompt": "digital art, anime, cartoon, 3d, modern, impressionist, abstract, rough",
        "denoising_strength": 0.25,  # Lower for more preservation
        "cfg_scale": 7.0,  # Higher for stronger style adherence
        "sampler": "Euler a",
        "steps": 40
    },
    "impressionist": {
        "name": "Impressionist Style",
        "prompt": "impressionist painting, Claude Monet style, loose brushstrokes, soft focus, pastel colors, dreamy atmosphere, light and airy, French impressionism, dotted texture, color patches",
        "negative_prompt": "realistic, sharp, detailed, dark, classical, photographic, precise",
        "denoising_strength": 0.45,  # Higher for more transformation
        "cfg_scale": 5.0,
        "sampler": "DPM++ 2M Karras",
        "steps": 30
    },
    "modern": {
        "name": "Modern Expressive",
        "prompt": "abstract expressionist oil painting, Van Gogh style, thick impasto, swirling brushstrokes, vibrant colors, emotional, dynamic texture, bold strokes, contemporary art, energetic",
        "negative_prompt": "realistic, classical, smooth, subtle, photographic, traditional",
        "denoising_strength": 0.55,  # Highest for most artistic freedom
        "cfg_scale": 4.0,  # Lower for more creative interpretation
        "sampler": "DPM++ SDE Karras",
        "steps": 35
    }
}

def convert_to_distinct_style(img_path, style_key):
    """Convert image with style-specific parameters"""
    
    try:
        # Load image
        with open(img_path, 'rb') as f:
            img_data = f.read()
        img_base64 = base64.b64encode(img_data).decode()
        
        style = STYLES[style_key]
        
        # Style-specific payload
        payload = {
            "init_images": [f"data:image/jpeg;base64,{img_base64}"],
            "prompt": style["prompt"],
            "negative_prompt": style["negative_prompt"],
            "denoising_strength": style["denoising_strength"],  # Different per style
            "cfg_scale": style["cfg_scale"],  # Different per style
            "steps": style["steps"],
            "sampler_name": style["sampler"],
            "width": 512,
            "height": 512,
            "seed": -1,  # Random seed for variety
        }
        
        # Add ControlNet ONLY for Classic style (for better preservation)
        if style_key == "classic":
            payload["controlnet_units"] = [
                {
                    "input_image": f"data:image/jpeg;base64,{img_base64}",
                    "module": "canny",
                    "model": "control_v11p_sd15_canny",
                    "weight": 0.7,  # Moderate weight
                    "guidance_start": 0,
                    "guidance_end": 1
                }
            ]
        elif style_key == "impressionist":
            # Light ControlNet for impressionist
            payload["controlnet_units"] = [
                {
                    "input_image": f"data:image/jpeg;base64,{img_base64}",
                    "module": "softedge_hed",
                    "model": "control_v11p_sd15_softedge",
                    "weight": 0.4,  # Light weight for soft edges
                    "guidance_start": 0,
                    "guidance_end": 0.7
                }
            ]
        # No ControlNet for modern style - maximum artistic freedom
        
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
            logger.error(f"API error: {response.status_code}")
            return None, False
            
    except Exception as e:
        logger.error(f"Error: {str(e)[:100]}")
        return None, False

def process_portraits_distinct_styles():
    """Process portraits with truly distinct styles"""
    
    input_dir = Path("evaluation_dataset/quality_portraits")
    output_dir = Path("public/evaluation-images/distinct_styles")
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # Tasks directory
    tasks_dir = Path("evaluation_dataset/distinct_style_tasks")
    tasks_dir.mkdir(exist_ok=True)
    
    logger.info("=" * 60)
    logger.info("CONVERTING WITH DISTINCT STYLE PARAMETERS")
    logger.info("=" * 60)
    logger.info("\nStyle Parameters:")
    for style_key, style in STYLES.items():
        logger.info(f"\n{style['name']}:")
        logger.info(f"  Denoising: {style['denoising_strength']}")
        logger.info(f"  CFG: {style['cfg_scale']}")
        logger.info(f"  Sampler: {style['sampler']}")
    
    # Get portrait images
    cat_portraits = sorted(input_dir.glob("cat_*.jpg"))[:20]  # Process 20 of each
    dog_portraits = sorted(input_dir.glob("dog_*.jpg"))[:20]
    
    all_portraits = []
    task_id = 1
    
    for cat_img in cat_portraits:
        all_portraits.append((task_id, "cat", cat_img))
        task_id += 1
    
    for dog_img in dog_portraits:
        all_portraits.append((task_id, "dog", dog_img))
        task_id += 1
    
    logger.info(f"\nProcessing {len(all_portraits)} portraits × 3 distinct styles")
    logger.info("=" * 60)
    
    successful = 0
    
    for task_id, animal_type, img_path in all_portraits:
        logger.info(f"\n[{task_id}/{len(all_portraits)}] {animal_type} - {img_path.name}")
        
        # Copy original
        original_img = Image.open(img_path)
        original_output = output_dir / f"task_{task_id}_original.jpg"
        original_img.save(original_output, quality=95)
        
        # Task data
        task_data = {
            "id": task_id,
            "category": animal_type,
            "original_image": f"/evaluation-images/distinct_styles/task_{task_id}_original.jpg",
            "conversions": {},
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
        }
        
        # Convert in each DISTINCT style
        for style_key, style_info in STYLES.items():
            logger.info(f"  {style_info['name']} (denoising={style_info['denoising_strength']})...")
            
            converted_img, success = convert_to_distinct_style(img_path, style_key)
            
            if success and converted_img:
                # Save converted image
                converted_output = output_dir / f"task_{task_id}_{style_key}.jpg"
                converted_img.save(converted_output, quality=95)
                
                task_data["conversions"][style_key] = {
                    "image": f"/evaluation-images/distinct_styles/task_{task_id}_{style_key}.jpg",
                    "style_name": style_info["name"],
                    "parameters": {
                        "denoising_strength": style_info["denoising_strength"],
                        "cfg_scale": style_info["cfg_scale"],
                        "sampler": style_info["sampler"],
                        "steps": style_info["steps"]
                    }
                }
                
                successful += 1
                logger.info(f"    ✓ Saved")
            else:
                logger.info(f"    ✗ Failed")
            
            time.sleep(1)
        
        # Save task file
        task_file = tasks_dir / f"task_{str(task_id).zfill(3)}.json"
        with open(task_file, 'w') as f:
            json.dump(task_data, f, indent=2)
    
    logger.info("\n" + "=" * 60)
    logger.info("✅ DISTINCT STYLES CONVERSION COMPLETE!")
    logger.info(f"📊 Successfully converted: {successful}/{len(all_portraits)*3}")
    logger.info("\n🎨 Style Differences:")
    logger.info("  • Classic: Smooth, realistic, dark backgrounds (denoising 0.25)")
    logger.info("  • Impressionist: Soft, dreamy, pastel colors (denoising 0.45)")
    logger.info("  • Modern: Bold, expressive, vibrant (denoising 0.55)")
    logger.info(f"\n📁 Output: {output_dir}")

if __name__ == "__main__":
    process_portraits_distinct_styles()