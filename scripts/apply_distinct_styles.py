#!/usr/bin/env python3
"""
Apply DISTINCT oil painting styles using expert recommendations
Uses base parameters with style-specific adjustments for visible differences
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

# Base parameters (foundation for all styles)
BASE_PARAMS = {
    "width": 512,
    "height": 512,
    "restore_faces": False,
    "tiling": False,
    "do_not_save_samples": True,
    "do_not_save_grid": True
}

# DISTINCT STYLE CONFIGURATIONS - Critical differences for visibility
STYLE_CONFIGS = {
    "classic": {
        "name": "Classic Oil Portrait",
        "prompt_template": "baroque oil painting:1.3, {pet}, classical old masters technique, thick impasto, Rembrandt lighting, chiaroscuro, dark burnt umber background, glazing layers, varnished surface, baroque composition, museum quality, traditional oil on canvas",
        "negative_prompt": "photograph, digital art, 3d render, smooth, plastic, blurry, low quality, anime, cartoon, bright colors, modern, impressionist, loose brushwork",
        "denoising_strength": 0.35,  # Keep conservative
        "cfg_scale": 5.0,
        "steps": 30,
        "sampler_name": "DPM++ 2M Karras",
        "controlnet_weight": 0.7,
        "clip_skip": 1,
        "seed_offset": 0
    },
    "impressionist": {
        "name": "Impressionist Style",
        "prompt_template": "impressionist oil painting:1.3, {pet}, French impressionism, broken color technique, visible brushstrokes, plein air lighting, soft edges, optical color mixing, pastel palette, Monet garden setting, dappled sunlight, atmospheric perspective, alla prima technique",
        "negative_prompt": "photograph, digital art, 3d render, smooth, plastic, blurry, low quality, anime, cartoon, dark shadows, tight detail, smooth blending, baroque",
        "denoising_strength": 0.42,  # Higher for looser strokes
        "cfg_scale": 4.5,  # Lower for softer interpretation
        "steps": 30,
        "sampler_name": "Euler a",  # Different sampler for variation
        "controlnet_weight": 0.6,  # Lower for artistic freedom
        "clip_skip": 2,  # Important for style
        "seed_offset": 0  # Same seed for consistency
    },
    "modern": {
        "name": "Modern Expressive",
        "prompt_template": "expressionist oil painting:1.3, {pet}, expressive brushwork, Van Gogh swirling strokes, bold impasto, vibrant saturated colors, dynamic movement, textured paint surface, contemporary art style, energetic composition, thick paint application, emotional intensity",
        "negative_prompt": "photograph, digital art, 3d render, smooth, plastic, blurry, low quality, anime, cartoon, muted colors, classical, traditional, photorealistic",
        "denoising_strength": 0.48,  # Higher for bold transformation
        "cfg_scale": 5.5,  # Slightly higher for stronger style
        "steps": 30,
        "sampler_name": "DPM++ SDE Karras",  # Different sampler
        "controlnet_weight": 0.55,  # Lower for expressive strokes
        "clip_skip": 2,
        "seed_offset": 0
    }
}

def convert_with_style(img_path: Path, style_key: str, output_dir: Path, task_id: int) -> tuple:
    """Convert image with specific style configuration"""
    try:
        # Load image
        with open(img_path, 'rb') as f:
            img_data = f.read()
        img_base64 = base64.b64encode(img_data).decode()
        
        # Get pet type for prompt
        pet_type = "cat" if "cat" in img_path.name.lower() else "dog"
        pet_desc = f"a beautiful {pet_type} portrait"
        
        style = STYLE_CONFIGS[style_key]
        
        # Build prompt with pet description
        prompt = style["prompt_template"].format(pet=pet_desc)
        
        # Build payload with style-specific parameters
        payload = {
            **BASE_PARAMS,
            "init_images": [f"data:image/jpeg;base64,{img_base64}"],
            "prompt": prompt,
            "negative_prompt": style["negative_prompt"],
            "denoising_strength": style["denoising_strength"],
            "cfg_scale": style["cfg_scale"],
            "steps": style["steps"],
            "sampler_name": style["sampler_name"],
            "seed": 42 + style["seed_offset"],  # Consistent seed
            "clip_skip": style["clip_skip"],
            "controlnet_units": [
                {
                    "input_image": f"data:image/jpeg;base64,{img_base64}",
                    "module": "canny",
                    "model": "control_v11p_sd15_canny",
                    "weight": style["controlnet_weight"],
                    "guidance_start": 0,
                    "guidance_end": 1,
                    "control_mode": 0 if style_key == "classic" else 2  # Balanced for classic, "My prompt is more important" for others
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
            
            # Save with clear naming
            output_path = output_dir / f"task_{task_id}_{style_key}.jpg"
            converted_img.save(output_path, quality=95)
            
            return True, output_path
        else:
            logger.error(f"    ✗ API error: {response.status_code}")
            return False, None
            
    except Exception as e:
        logger.error(f"    ✗ Error: {str(e)[:50]}")
        return False, None

def process_portraits():
    """Process portraits with distinct styles"""
    
    input_dir = Path("evaluation_dataset/quality_portraits")
    output_dir = Path("public/evaluation-images/distinct_styles_v2")
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # Tasks directory for dashboard
    tasks_dir = Path("evaluation_dataset/distinct_tasks_v2")
    tasks_dir.mkdir(exist_ok=True)
    
    logger.info("=" * 60)
    logger.info("APPLYING DISTINCT OIL PAINTING STYLES")
    logger.info("=" * 60)
    logger.info("\nStyle Configurations:")
    
    for style_key, config in STYLE_CONFIGS.items():
        logger.info(f"\n{config['name']}:")
        logger.info(f"  Denoising: {config['denoising_strength']}")
        logger.info(f"  CFG Scale: {config['cfg_scale']}")
        logger.info(f"  Sampler: {config['sampler_name']}")
        logger.info(f"  ControlNet: {config['controlnet_weight']}")
        logger.info(f"  Clip Skip: {config['clip_skip']}")
    
    logger.info("\n" + "=" * 60)
    
    # Get 10 portraits (5 cats, 5 dogs)
    cat_portraits = sorted(input_dir.glob("cat_*.jpg"))[:5]
    dog_portraits = sorted(input_dir.glob("dog_*.jpg"))[:5]
    all_portraits = cat_portraits + dog_portraits
    
    if not all_portraits:
        logger.error("No portraits found!")
        return
    
    logger.info(f"Processing {len(all_portraits)} portraits × 3 distinct styles")
    logger.info("=" * 60)
    
    successful = 0
    
    for task_id, img_path in enumerate(all_portraits, 1):
        animal_type = "cat" if "cat" in img_path.name else "dog"
        logger.info(f"\n[Task {task_id}/{len(all_portraits)}] {animal_type} - {img_path.name}")
        
        # Copy original
        original_img = Image.open(img_path)
        original_output = output_dir / f"task_{task_id}_original.jpg"
        original_img.save(original_output, quality=95)
        
        # Task data for dashboard
        task_data = {
            "id": task_id,
            "category": animal_type,
            "original_image": f"/evaluation-images/distinct_styles_v2/task_{task_id}_original.jpg",
            "conversions": {},
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
            "style_details": {}
        }
        
        # Convert in each distinct style
        for style_key, config in STYLE_CONFIGS.items():
            logger.info(f"  {config['name']}...")
            logger.info(f"    Denoising: {config['denoising_strength']}, Sampler: {config['sampler_name']}")
            
            success, output_path = convert_with_style(img_path, style_key, output_dir, task_id)
            
            if success:
                task_data["conversions"][style_key] = {
                    "image": f"/evaluation-images/distinct_styles_v2/task_{task_id}_{style_key}.jpg",
                    "style_name": config["name"]
                }
                task_data["style_details"][style_key] = {
                    "denoising_strength": config["denoising_strength"],
                    "cfg_scale": config["cfg_scale"],
                    "sampler": config["sampler_name"],
                    "controlnet_weight": config["controlnet_weight"],
                    "clip_skip": config["clip_skip"]
                }
                successful += 1
                logger.info(f"    ✓ Saved")
            else:
                logger.info(f"    ✗ Failed")
            
            time.sleep(1)  # Prevent API overload
        
        # Save task file
        task_file = tasks_dir / f"task_{str(task_id).zfill(3)}.json"
        with open(task_file, 'w') as f:
            json.dump(task_data, f, indent=2)
    
    logger.info("\n" + "=" * 60)
    logger.info("✅ DISTINCT STYLES PROCESSING COMPLETE!")
    logger.info(f"📊 Successfully converted: {successful}/{len(all_portraits)*3}")
    logger.info("\n🎨 Style Differences Achieved Through:")
    logger.info("  • Different denoising strengths (0.35, 0.42, 0.48)")
    logger.info("  • Different samplers (DPM++ 2M, Euler a, DPM++ SDE)")
    logger.info("  • Different ControlNet weights (0.7, 0.6, 0.55)")
    logger.info("  • Different clip skip values (1, 2, 2)")
    logger.info("  • Style-specific prompts with weight emphasis")
    logger.info(f"\n📁 Output: {output_dir}")

if __name__ == "__main__":
    process_portraits()