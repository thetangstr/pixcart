#!/usr/bin/env python3
"""
Create evaluation tasks for ALL pet portraits
"""

import requests
import json
import base64
from PIL import Image
import io
from pathlib import Path
import time
import logging
import sys

logging.basicConfig(level=logging.INFO, format='%(message)s')
logger = logging.getLogger(__name__)

# Optimized parameters based on RLHF feedback
OPTIMIZED_CONFIGS = {
    "classic": {
        "name": "Classic Oil Portrait",
        "prompt": "thick oil painting portrait, heavy impasto brushstrokes, traditional oil on canvas texture, classical Rembrandt style, museum quality artwork",
        "negative_prompt": "digital, smooth, photograph, 3d render, watercolor",
        "denoising_strength": 0.48,  # Increased for visible oil effect
        "cfg_scale": 6.0,
        "sampler_name": "DPM++ 2M Karras",
        "controlnet_weight": 0.65
    },
    "impressionist": {
        "name": "Impressionist Style",
        "prompt": "impressionist oil painting, Monet style, soft brushstrokes, pastel colors, atmospheric light, painterly texture, french impressionism",
        "negative_prompt": "sharp, detailed, photographic, digital",
        "denoising_strength": 0.38,  # Balanced for style and preservation
        "cfg_scale": 5.0,
        "sampler_name": "Euler a",
        "controlnet_weight": 0.72  # Higher for pet preservation
    },
    "modern": {
        "name": "Modern Expressive",
        "prompt": "expressive oil painting, Van Gogh style, bold swirling brushstrokes, vibrant colors, thick paint texture, emotional intensity",
        "negative_prompt": "realistic, smooth, photographic, digital",
        "denoising_strength": 0.40,  # Balanced
        "cfg_scale": 5.5,
        "sampler_name": "DPM++ SDE Karras",
        "controlnet_weight": 0.68  # Higher for pet preservation
    }
}

def convert_image(img_path, style_key, timeout=45):
    """Convert with optimized parameters"""
    try:
        with open(img_path, 'rb') as f:
            img_data = f.read()
        img_base64 = base64.b64encode(img_data).decode()
        
        style = OPTIMIZED_CONFIGS[style_key]
        
        payload = {
            "init_images": [f"data:image/jpeg;base64,{img_base64}"],
            "prompt": style["prompt"],
            "negative_prompt": style["negative_prompt"],
            "denoising_strength": style["denoising_strength"],
            "cfg_scale": style["cfg_scale"],
            "sampler_name": style["sampler_name"],
            "width": 512,
            "height": 512,
            "steps": 25,  # Slightly fewer steps for speed
            "seed": 42,
            "controlnet_units": [{
                "input_image": f"data:image/jpeg;base64,{img_base64}",
                "module": "canny",
                "model": "control_v11p_sd15_canny",
                "weight": style["controlnet_weight"],
                "guidance_start": 0,
                "guidance_end": 1
            }]
        }
        
        response = requests.post("http://localhost:7860/sdapi/v1/img2img", 
                                json=payload, timeout=timeout)
        
        if response.status_code == 200:
            result = response.json()
            converted_data = base64.b64decode(result['images'][0])
            return Image.open(io.BytesIO(converted_data))
        return None
    except requests.Timeout:
        logger.error(f"    ✗ Timeout")
        return None
    except Exception as e:
        logger.error(f"    ✗ Error: {str(e)[:30]}")
        return None

def main():
    input_dir = Path("evaluation_dataset/quality_portraits")
    output_dir = Path("public/evaluation-images/all_tasks")
    output_dir.mkdir(parents=True, exist_ok=True)
    tasks_dir = Path("evaluation_dataset/all_tasks")
    tasks_dir.mkdir(exist_ok=True)
    
    # Get ALL portraits
    all_portraits = sorted(input_dir.glob("*.jpg"))
    
    # Check for resume point
    existing_tasks = sorted(tasks_dir.glob("task_*.json"))
    start_idx = len(existing_tasks) + 1 if existing_tasks else 1
    
    if start_idx > 1:
        logger.info(f"Resuming from task {start_idx}")
        all_portraits = all_portraits[start_idx-1:]
    
    total = len(all_portraits) + start_idx - 1
    
    logger.info("=" * 60)
    logger.info("CREATING EVALUATION TASKS FOR ALL PORTRAITS")
    logger.info(f"Total portraits: {total}")
    logger.info(f"Starting from: Task {start_idx}")
    logger.info("=" * 60)
    
    batch_size = 5  # Process in small batches
    batch_count = 0
    
    for idx, img_path in enumerate(all_portraits, start_idx):
        if not img_path.exists():
            continue
            
        animal = "cat" if "cat" in img_path.name else "dog"
        logger.info(f"\n[{idx}/{total}] Task {idx}: {animal} ({img_path.name})")
        
        # Copy original
        orig = Image.open(img_path)
        orig_path = output_dir / f"task_{idx}_original.jpg"
        orig.save(orig_path, quality=90)
        
        task_data = {
            "id": idx,
            "category": animal,
            "original_image": f"/evaluation-images/all_tasks/task_{idx}_original.jpg",
            "source_file": img_path.name,
            "conversions": {},
            "created": time.strftime("%Y-%m-%d %H:%M:%S")
        }
        
        # Convert each style
        for style_key in ["classic", "impressionist", "modern"]:
            logger.info(f"  {OPTIMIZED_CONFIGS[style_key]['name']}...")
            converted = convert_image(img_path, style_key)
            
            if converted:
                output_path = output_dir / f"task_{idx}_{style_key}.jpg"
                converted.save(output_path, quality=90)
                
                task_data["conversions"][style_key] = {
                    "image": f"/evaluation-images/all_tasks/task_{idx}_{style_key}.jpg",
                    "style_name": OPTIMIZED_CONFIGS[style_key]["name"]
                }
                logger.info(f"    ✓ Done")
            else:
                # Still create entry but mark as processing
                task_data["conversions"][style_key] = {
                    "image": None,
                    "style_name": OPTIMIZED_CONFIGS[style_key]["name"],
                    "status": "failed"
                }
                
            time.sleep(0.5)  # Brief pause between conversions
        
        # Save task file
        with open(tasks_dir / f"task_{str(idx).zfill(3)}.json", 'w') as f:
            json.dump(task_data, f, indent=2)
        
        batch_count += 1
        
        # Take a break every batch to avoid overload
        if batch_count >= batch_size:
            logger.info(f"\n--- Batch complete, brief pause ---")
            time.sleep(2)
            batch_count = 0
            
        # Allow early exit with Ctrl+C
        if idx >= start_idx + 9:  # Create at least 10 tasks for now
            logger.info(f"\n✅ Created {idx} tasks! Continue with:")
            logger.info(f"python3 scripts/create_all_tasks.py")
            logger.info(f"Visit http://localhost:3000/evaluation to start evaluating")
            break
    
    logger.info(f"\n✅ Task creation complete!")
    logger.info(f"📁 Created {idx - start_idx + 1} new tasks")
    logger.info(f"Total tasks available: {idx}")

if __name__ == "__main__":
    main()