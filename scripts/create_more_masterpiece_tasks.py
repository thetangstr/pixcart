#!/usr/bin/env python3
"""
Create more masterpiece oil painting tasks using professional prompt template
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

# Pet personality traits for variety
PERSONALITY_TRAITS = [
    ["noble", "dignified", "wise"],
    ["playful", "spirited", "joyful"],
    ["gentle", "serene", "contemplative"],
    ["regal", "majestic", "proud"],
    ["loyal", "devoted", "steadfast"],
    ["mysterious", "enigmatic", "thoughtful"],
    ["brave", "bold", "confident"],
    ["graceful", "elegant", "poised"],
    ["curious", "alert", "intelligent"],
    ["peaceful", "calm", "tranquil"]
]

def get_masterpiece_prompts(pet_type, task_id):
    """Generate professional masterpiece prompts for each style"""
    
    # Rotate through personality traits
    traits = PERSONALITY_TRAITS[task_id % len(PERSONALITY_TRAITS)]
    personality = f"{traits[0]}, {traits[1]}, and {traits[2]}"
    
    prompts = {
        "classic": {
            "name": "Classic Rembrandt Master",
            "full_prompt": f"""(oil painting:1.5), (thick impasto:1.3), (visible brushstrokes:1.4), (canvas texture:1.2), masterpiece oil painting, professional portrait of beloved {pet_type} companion. Capture their essential personality as {personality}.
Lighting: Dramatic chiaroscuro lighting from a window on the left, casting deep shadows and golden highlights on the fur. The light creates a divine glow around the subject
Setting & Palette: Set against a dark mahogany background with subtle warm undertones. Limited palette of burnt umber, raw sienna, ivory black, and golden ochre. The overall atmosphere is timeless and contemplative
Artistic Style: Painted in the style of Rembrandt van Rijn. Feature precise, controlled brushwork with visible canvas texture, thick oil paint application. Layers of translucent glazes create depth. Rich impasto highlights catch the light. Heavy oil paint texture, visible brushstrokes, traditional oil on canvas
Medium: traditional oil on canvas, museum quality, gallery artwork, thick paint application, painterly style""",
            "negative": "photograph, digital art, 3d render, anime, cartoon, smooth, plastic, watercolor, sketch"
        },
        "impressionist": {
            "name": "Impressionist Light Master",
            "full_prompt": f"""(oil painting:1.5), (thick impasto:1.3), (visible brushstrokes:1.4), (canvas texture:1.2), masterpiece oil painting, professional portrait of beloved {pet_type} companion. Capture their essential personality as {personality}.
Lighting: Soft, diffused natural light from above, as if filtered through garden leaves. Dappled shadows dance across the subject, creating movement and life
Setting & Palette: Set against a sun-drenched garden background with soft blues, lavenders, and pale greens. Limited palette of cerulean, violet, cadmium yellow, and viridian. The atmosphere is dreamy and ethereal
Artistic Style: Painted in the style of Claude Monet and John Singer Sargent. Feature broken color technique with visible, energetic brushstrokes, thick oil paint texture. Short, quick marks of pure color that blend optically. Heavy impasto, rough canvas texture, authentic oil painting on canvas. Captures the fleeting quality of light
Medium: traditional oil on canvas, museum quality, gallery artwork, thick paint application, painterly style""",
            "negative": "photograph, digital art, 3d render, anime, cartoon, smooth, dark, muddy colors"
        },
        "modern": {
            "name": "Modern Expression Master", 
            "full_prompt": f"""(oil painting:1.5), (thick impasto:1.3), (visible brushstrokes:1.4), (canvas texture:1.2), masterpiece oil painting, professional portrait of beloved {pet_type} companion. Capture their essential personality as {personality}.
Lighting: Bold, dramatic lighting from multiple sources creating strong color contrasts. Vibrant highlights against deep, colorful shadows
Setting & Palette: Set against an energetic background of swirling colors - deep blues, vibrant oranges, and emerald greens. Bold palette with pure, unmixed colors. The atmosphere is passionate and emotionally charged
Artistic Style: Painted in the style of Vincent van Gogh. Feature expressive, rhythmic brushwork with extremely thick impasto application, visible paint texture, rough canvas. Swirling, energetic strokes that convey emotion. Paint applied with palette knife and brush for varied texture. Heavy oil paint, three-dimensional paint surface
Medium: traditional oil on canvas, museum quality, gallery artwork, thick paint application, painterly style""",
            "negative": "photograph, digital art, 3d render, anime, cartoon, smooth, muted colors, realistic"
        }
    }
    
    return prompts

def convert_with_masterpiece_style(img_path, style_key, prompts):
    """Convert using masterpiece prompts"""
    try:
        with open(img_path, 'rb') as f:
            img_data = f.read()
        img_base64 = base64.b64encode(img_data).decode()
        
        style_info = prompts[style_key]
        
        # Professional oil painting parameters
        payload = {
            "init_images": [f"data:image/jpeg;base64,{img_base64}"],
            "prompt": style_info["full_prompt"],
            "negative_prompt": style_info["negative"],
            "denoising_strength": 0.65,  # Strong transformation for oil effect
            "cfg_scale": 7.0,
            "sampler_name": "DPM++ 2M SDE Karras",
            "width": 512,
            "height": 512,
            "steps": 40,  # Good quality
            "seed": random.randint(1, 999999),
            "clip_skip": 2,
            "enable_hr": False,  # Disable for speed
            "controlnet_units": [{
                "input_image": f"data:image/jpeg;base64,{img_base64}",
                "module": "canny",
                "model": "control_v11p_sd15_canny",
                "weight": 0.45 if style_key == "classic" else 0.35,  # Lower for more artistic freedom
                "guidance_start": 0,
                "guidance_end": 1
            }]
        }
        
        response = requests.post("http://localhost:7860/sdapi/v1/img2img", 
                                json=payload, timeout=60)
        
        if response.status_code == 200:
            result = response.json()
            converted_data = base64.b64decode(result['images'][0])
            return Image.open(io.BytesIO(converted_data)), style_info
        return None, None
    except Exception as e:
        logger.error(f"    ✗ Error: {str(e)[:30]}")
        return None, None

def main():
    input_dir = Path("evaluation_dataset/quality_portraits")
    output_dir = Path("public/evaluation-images/masterpiece_styles")
    output_dir.mkdir(parents=True, exist_ok=True)
    tasks_dir = Path("evaluation_dataset/masterpiece_tasks")
    tasks_dir.mkdir(exist_ok=True)
    
    # Check existing tasks
    existing_tasks = sorted(tasks_dir.glob("task_*.json"))
    last_task = 12 if not existing_tasks else int(existing_tasks[-1].stem.split('_')[1])
    
    # Get next batch of portraits
    all_portraits = sorted(input_dir.glob("*.jpg"))
    start_idx = last_task + 1
    end_idx = min(start_idx + 10, len(all_portraits) + 1)  # Create 10 more tasks
    
    portraits_to_process = all_portraits[start_idx-1:end_idx-1]
    
    logger.info("=" * 60)
    logger.info("CREATING MORE MASTERPIECE EVALUATION TASKS")
    logger.info(f"Tasks {start_idx} to {end_idx-1}")
    logger.info("Using Professional Oil Painting Prompts")
    logger.info("=" * 60)
    
    for idx, img_path in enumerate(portraits_to_process, start_idx):
        if not img_path.exists():
            continue
            
        pet_type = "cat" if "cat" in img_path.name else "dog"
        logger.info(f"\n[Task {idx}] {pet_type} - {img_path.name}")
        
        # Get masterpiece prompts for this task
        prompts = get_masterpiece_prompts(pet_type, idx)
        
        # Copy original
        orig = Image.open(img_path)
        orig_path = output_dir / f"task_{idx}_original.jpg"
        orig.save(orig_path, quality=95)
        
        task_data = {
            "id": idx,
            "category": pet_type,
            "original_image": f"/evaluation-images/masterpiece_styles/task_{idx}_original.jpg",
            "conversions": {},
            "parameters": {
                "denoising_strength": 0.65,
                "cfg_scale": 7.0,
                "steps": 40,
                "sampler": "DPM++ 2M SDE Karras",
                "clip_skip": 2
            },
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
        }
        
        # Convert each style
        for style_key in ["classic", "impressionist", "modern"]:
            style_name = prompts[style_key]["name"]
            logger.info(f"  {style_name}...")
            
            converted, style_info = convert_with_masterpiece_style(img_path, style_key, prompts)
            
            if converted:
                output_path = output_dir / f"task_{idx}_{style_key}.jpg"
                converted.save(output_path, quality=95)
                
                task_data["conversions"][style_key] = {
                    "image": f"/evaluation-images/masterpiece_styles/task_{idx}_{style_key}.jpg",
                    "style_name": style_name,
                    "prompt": style_info["full_prompt"]
                }
                logger.info(f"    ✓ Done")
            else:
                logger.info(f"    ✗ Failed")
                
            time.sleep(1)
        
        # Save task file
        with open(tasks_dir / f"task_{str(idx).zfill(3)}.json", 'w') as f:
            json.dump(task_data, f, indent=2)
        
        # Brief pause between tasks
        if idx % 3 == 0:
            logger.info("  --- Brief pause ---")
            time.sleep(2)
    
    logger.info(f"\n✅ Created {len(portraits_to_process)} more masterpiece tasks!")
    logger.info(f"📁 Total tasks available: {idx}")
    logger.info("Visit http://localhost:3000/evaluation to continue evaluating")

if __name__ == "__main__":
    main()