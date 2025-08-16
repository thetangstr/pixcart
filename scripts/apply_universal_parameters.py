#!/usr/bin/env python3
"""
Apply UNIVERSAL OPTIMAL PARAMETERS with Style Variations

This script uses the SAME parameters for ALL conversions (as found by RL),
but achieves different styles through prompt engineering and minor adjustments.
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

# UNIVERSAL OPTIMAL PARAMETERS (found by RL training)
# These are used for ALL conversions regardless of style
UNIVERSAL_PARAMS = {
    "denoising_strength": 0.35,  # Optimal balance
    "cfg_scale": 5.0,            # Best prompt adherence
    "steps": 30,                 # Quality/speed balance
    "controlnet_weight": 0.7,    # Structure preservation
    "sampler": "DPM++ 2M Karras"
}

# Style variations achieved through PROMPT ENGINEERING only
STYLE_PROMPTS = {
    "classic": {
        "name": "Classic Oil Portrait",
        "prompt_additions": "in the style of Rembrandt, old masters technique, dark chiaroscuro background, dramatic lighting, baroque painting, museum quality, fine details, smooth blending",
        "negative_additions": "modern, impressionist, abstract, rough, bright colors",
        "seed_offset": 0  # Same seed for consistency
    },
    "impressionist": {
        "name": "Impressionist Style", 
        "prompt_additions": "in the style of Claude Monet, impressionist painting, soft brushstrokes, dappled light, pastel colors, dreamy atmosphere, French impressionism, visible brush texture",
        "negative_additions": "realistic, sharp, detailed, dark, photographic",
        "seed_offset": 100  # Different seed for variation
    },
    "modern": {
        "name": "Modern Expressive",
        "prompt_additions": "in the style of Van Gogh, expressive brushstrokes, vibrant colors, swirling patterns, emotional intensity, post-impressionist, thick paint application, dynamic movement",
        "negative_additions": "realistic, smooth, subtle, muted colors, traditional",
        "seed_offset": 200  # Different seed for variation
    }
}

# Base prompt that's always included
BASE_PROMPT = "professional oil painting portrait of a pet, thick brushstrokes, impasto technique, traditional canvas texture, artistic masterpiece"
BASE_NEGATIVE = "digital art, anime, cartoon, 3d render, photograph, low quality, blurry"

def convert_with_universal_params(img_path: Path, style_key: str, output_dir: Path) -> bool:
    """
    Convert image using UNIVERSAL parameters with style-specific prompts
    """
    try:
        # Load image
        with open(img_path, 'rb') as f:
            img_data = f.read()
        img_base64 = base64.b64encode(img_data).decode()
        
        style = STYLE_PROMPTS[style_key]
        
        # Combine base prompt with style additions
        full_prompt = f"{BASE_PROMPT}, {style['prompt_additions']}"
        full_negative = f"{BASE_NEGATIVE}, {style['negative_additions']}"
        
        # Use UNIVERSAL parameters for ALL styles
        payload = {
            "init_images": [f"data:image/jpeg;base64,{img_base64}"],
            "prompt": full_prompt,
            "negative_prompt": full_negative,
            "denoising_strength": UNIVERSAL_PARAMS["denoising_strength"],
            "cfg_scale": UNIVERSAL_PARAMS["cfg_scale"],
            "steps": UNIVERSAL_PARAMS["steps"],
            "sampler_name": UNIVERSAL_PARAMS["sampler"],
            "width": 512,
            "height": 512,
            "seed": 42 + style["seed_offset"],  # Consistent but varied per style
            "controlnet_units": [
                {
                    "input_image": f"data:image/jpeg;base64,{img_base64}",
                    "module": "canny",
                    "model": "control_v11p_sd15_canny",
                    "weight": UNIVERSAL_PARAMS["controlnet_weight"],
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
            
            # Save converted image
            output_path = output_dir / f"{img_path.stem}_{style_key}.jpg"
            converted_img.save(output_path, quality=95)
            
            logger.info(f"    ✓ {style['name']} saved")
            return True
        else:
            logger.error(f"    ✗ API error: {response.status_code}")
            return False
            
    except Exception as e:
        logger.error(f"    ✗ Error: {str(e)[:50]}")
        return False

def process_all_portraits():
    """Process all portraits with universal parameters and style variations"""
    
    input_dir = Path("evaluation_dataset/quality_portraits")
    output_dir = Path("public/evaluation-images/universal_params")
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # Create tasks directory for dashboard
    tasks_dir = Path("evaluation_dataset/universal_tasks")
    tasks_dir.mkdir(exist_ok=True)
    
    logger.info("=" * 60)
    logger.info("APPLYING UNIVERSAL PARAMETERS WITH STYLE VARIATIONS")
    logger.info("=" * 60)
    logger.info("\nUniversal Parameters (same for ALL styles):")
    logger.info(f"  Denoising: {UNIVERSAL_PARAMS['denoising_strength']}")
    logger.info(f"  CFG Scale: {UNIVERSAL_PARAMS['cfg_scale']}")
    logger.info(f"  Steps: {UNIVERSAL_PARAMS['steps']}")
    logger.info(f"  ControlNet: {UNIVERSAL_PARAMS['controlnet_weight']}")
    logger.info("\nStyle differences achieved through PROMPTS only!")
    logger.info("=" * 60)
    
    # Get all portraits
    cat_portraits = sorted(input_dir.glob("cat_*.jpg"))[:20]
    dog_portraits = sorted(input_dir.glob("dog_*.jpg"))[:20]
    
    all_portraits = []
    task_id = 1
    
    for cat_img in cat_portraits:
        all_portraits.append((task_id, "cat", cat_img))
        task_id += 1
    
    for dog_img in dog_portraits:
        all_portraits.append((task_id, "dog", dog_img))
        task_id += 1
    
    logger.info(f"\nProcessing {len(all_portraits)} portraits × 3 styles")
    logger.info("Using SAME parameters, DIFFERENT prompts")
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
            "original_image": f"/evaluation-images/universal_params/task_{task_id}_original.jpg",
            "conversions": {},
            "parameters": UNIVERSAL_PARAMS,  # Same for all!
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
        }
        
        # Convert in each style using SAME parameters, different prompts
        for style_key in STYLE_PROMPTS.keys():
            success = convert_with_universal_params(img_path, style_key, output_dir)
            
            if success:
                task_data["conversions"][style_key] = {
                    "image": f"/evaluation-images/universal_params/{img_path.stem}_{style_key}.jpg",
                    "style_name": STYLE_PROMPTS[style_key]["name"],
                    "prompt_additions": STYLE_PROMPTS[style_key]["prompt_additions"]
                }
                successful += 1
            
            time.sleep(1)
        
        # Save task file
        task_file = tasks_dir / f"task_{str(task_id).zfill(3)}.json"
        with open(task_file, 'w') as f:
            json.dump(task_data, f, indent=2)
    
    # Save configuration
    config = {
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
        "universal_parameters": UNIVERSAL_PARAMS,
        "style_prompts": STYLE_PROMPTS,
        "base_prompt": BASE_PROMPT,
        "explanation": "All conversions use the SAME parameters. Style variations are achieved through prompt engineering only."
    }
    
    with open(output_dir / "universal_config.json", 'w') as f:
        json.dump(config, f, indent=2)
    
    logger.info("\n" + "=" * 60)
    logger.info("✅ CONVERSION COMPLETE!")
    logger.info(f"📊 Successfully converted: {successful}/{len(all_portraits)*3}")
    logger.info("\n🎯 KEY INSIGHT:")
    logger.info("  All styles use IDENTICAL parameters!")
    logger.info("  Differences come from prompt variations only.")
    logger.info("  This is what RL optimization found works best.")
    logger.info(f"\n📁 Output: {output_dir}")

if __name__ == "__main__":
    process_all_portraits()