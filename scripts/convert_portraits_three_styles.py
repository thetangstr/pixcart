#!/usr/bin/env python3
"""
Convert portrait pet photos to oil paintings in 3 different styles
Evaluate each style separately for comparison
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

# Three distinct oil painting styles
STYLES = {
    "classic": {
        "name": "Classic Oil Portrait",
        "prompt": "classical oil painting portrait, old masters style, Rembrandt lighting, traditional portrait, baroque painting, canvas texture, museum quality",
        "negative_prompt": "digital art, anime, cartoon, 3d render, photograph, modern, contemporary"
    },
    "impressionist": {
        "name": "Impressionist Style",
        "prompt": "impressionist oil painting, Monet style, visible brushstrokes, vibrant colors, light and shadow play, impressionism, painterly texture",
        "negative_prompt": "digital art, anime, cartoon, 3d render, photograph, realistic, sharp details"
    },
    "modern": {
        "name": "Modern Expressive",
        "prompt": "modern oil painting, expressive brushwork, contemporary art style, bold strokes, thick paint, impasto technique, artistic portrait",
        "negative_prompt": "digital art, anime, cartoon, 3d render, photograph, classical, traditional"
    }
}

def convert_single_portrait(img_path, task_id, animal_type, style_key):
    """Convert a single portrait in a specific style"""
    
    try:
        # Load image
        with open(img_path, 'rb') as f:
            img_data = f.read()
        img_base64 = base64.b64encode(img_data).decode()
        
        style = STYLES[style_key]
        
        # Prepare payload with style-specific prompt
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
            
            # Save converted image
            converted_data = base64.b64decode(result['images'][0])
            converted_img = Image.open(io.BytesIO(converted_data))
            
            return converted_img, True
        else:
            return None, False
            
    except Exception as e:
        logger.error(f"    Error: {str(e)[:50]}")
        return None, False

def convert_portraits_three_styles():
    """Convert portraits in 3 different styles"""
    
    input_dir = Path("evaluation_dataset/portrait_pets")
    output_dir = Path("public/evaluation-images/portraits_styled")
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # Create tasks directory for each style
    tasks_base = Path("evaluation_dataset/portrait_tasks_styled")
    tasks_base.mkdir(exist_ok=True)
    
    for style_key in STYLES:
        (tasks_base / style_key).mkdir(exist_ok=True)
    
    logger.info("=" * 60)
    logger.info("CONVERTING PORTRAITS IN 3 OIL PAINTING STYLES")
    logger.info(f"Settings: Denoising={OPTIMAL_DENOISING}, CFG={OPTIMAL_CFG}")
    logger.info("Styles: Classic, Impressionist, Modern")
    logger.info("=" * 60)
    
    # Get portrait images (limit to 20 of each for manageable testing)
    cat_portraits = sorted(input_dir.glob("cat_portrait_*.jpg"))[:20]
    dog_portraits = sorted(input_dir.glob("dog_portrait_*.jpg"))[:20]
    
    all_portraits = []
    for i, cat_img in enumerate(cat_portraits):
        all_portraits.append(("cat", i+1, cat_img))
    for i, dog_img in enumerate(dog_portraits):
        all_portraits.append(("dog", i+21, dog_img))
    
    logger.info(f"\nProcessing {len(all_portraits)} portraits × 3 styles = {len(all_portraits)*3} conversions")
    
    # Statistics tracking
    stats = {style: {"successful": 0, "failed": 0} for style in STYLES}
    all_tasks = []
    
    for animal_type, task_id, img_path in all_portraits:
        logger.info(f"\n[{task_id}/{len(all_portraits)}] {animal_type} - {img_path.name}")
        
        # Load original once
        original_img = Image.open(img_path)
        if original_img.mode != 'RGB':
            original_img = original_img.convert('RGB')
        
        # Save original
        original_output = output_dir / f"portrait_{task_id}_original.jpg"
        original_img.save(original_output, quality=95)
        
        # Convert in each style
        for style_key, style_info in STYLES.items():
            logger.info(f"  Converting to {style_info['name']}...")
            
            converted_img, success = convert_single_portrait(img_path, task_id, animal_type, style_key)
            
            if success and converted_img:
                # Save converted image
                converted_output = output_dir / f"portrait_{task_id}_{style_key}.jpg"
                converted_img.save(converted_output, quality=95)
                
                # Create task metadata
                task_data = {
                    "id": task_id,
                    "category": animal_type,
                    "style": style_key,
                    "style_name": style_info["name"],
                    "original_image": f"/evaluation-images/portraits_styled/portrait_{task_id}_original.jpg",
                    "converted_image": f"/evaluation-images/portraits_styled/portrait_{task_id}_{style_key}.jpg",
                    "parameters": {
                        "denoising_strength": OPTIMAL_DENOISING,
                        "cfg_scale": OPTIMAL_CFG,
                        "prompt": style_info["prompt"][:100] + "..."
                    },
                    "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
                }
                
                # Save task file
                task_file = tasks_base / style_key / f"task_{str(task_id).zfill(3)}.json"
                with open(task_file, 'w') as f:
                    json.dump(task_data, f, indent=2)
                
                all_tasks.append(task_data)
                stats[style_key]["successful"] += 1
                logger.info(f"    ✓ Saved {style_key}")
            else:
                stats[style_key]["failed"] += 1
                logger.info(f"    ✗ Failed {style_key}")
            
            time.sleep(1)  # Rate limiting
    
    # Create evaluation summary
    evaluation_summary = {
        "dataset": "portrait_pets_three_styles",
        "total_images": len(all_portraits),
        "styles_tested": list(STYLES.keys()),
        "conversion_stats": stats,
        "parameters": {
            "denoising": OPTIMAL_DENOISING,
            "cfg_scale": OPTIMAL_CFG
        },
        "evaluation_criteria": {
            "preservation": "How well the pet's identity is maintained",
            "style_quality": "How well the oil painting style is applied",
            "artistic_appeal": "Overall aesthetic quality"
        },
        "tasks": all_tasks
    }
    
    summary_file = tasks_base / "evaluation_summary.json"
    with open(summary_file, 'w') as f:
        json.dump(evaluation_summary, f, indent=2)
    
    # Print summary
    logger.info("\n" + "=" * 60)
    logger.info("✅ THREE-STYLE CONVERSION COMPLETE!")
    logger.info("\n📊 Conversion Statistics:")
    for style_key, style_info in STYLES.items():
        s = stats[style_key]
        total = s["successful"] + s["failed"]
        logger.info(f"  {style_info['name']:20} - {s['successful']}/{total} successful")
    
    logger.info(f"\n📁 Output: {output_dir}")
    logger.info(f"📝 Summary: {summary_file}")
    
    logger.info("\n🎨 Style Characteristics:")
    logger.info("  • Classic: Traditional portrait style (Rembrandt-like)")
    logger.info("  • Impressionist: Soft, colorful (Monet-like)")
    logger.info("  • Modern: Bold, expressive brushwork")
    
    logger.info("\n📈 Next Steps:")
    logger.info("  1. Evaluate each style for preservation quality")
    logger.info("  2. Compare artistic appeal across styles")
    logger.info("  3. Determine best style for production use")
    
    return stats

if __name__ == "__main__":
    convert_portraits_three_styles()