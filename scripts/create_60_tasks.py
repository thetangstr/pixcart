#!/usr/bin/env python3
"""
Create 60 more masterpiece evaluation tasks
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

# Expanded personality traits for variety
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
    ["peaceful", "calm", "tranquil"],
    ["adventurous", "fearless", "spirited"],
    ["affectionate", "loving", "warm"],
    ["stoic", "patient", "enduring"],
    ["mischievous", "clever", "witty"],
    ["protective", "watchful", "guardian-like"]
]

def get_masterpiece_prompts(pet_type, task_id):
    """Generate professional masterpiece prompts"""
    traits = PERSONALITY_TRAITS[task_id % len(PERSONALITY_TRAITS)]
    personality = f"{traits[0]}, {traits[1]}, and {traits[2]}"
    
    # Vary the artist references for diversity
    classic_artists = ["Rembrandt van Rijn", "Johannes Vermeer", "Diego Velázquez", "Peter Paul Rubens"]
    impressionist_artists = ["Claude Monet", "John Singer Sargent", "Pierre-Auguste Renoir", "Berthe Morisot"]
    modern_artists = ["Vincent van Gogh", "Paul Cézanne", "Henri de Toulouse-Lautrec", "Paul Gauguin"]
    
    classic_artist = classic_artists[task_id % len(classic_artists)]
    impressionist_artist = impressionist_artists[task_id % len(impressionist_artists)]
    modern_artist = modern_artists[task_id % len(modern_artists)]
    
    prompts = {
        "classic": {
            "name": "Classic Oil Master",
            "prompt": f"(oil painting:1.5), (thick impasto:1.3), masterpiece oil painting of {pet_type}. Personality: {personality}. Style of {classic_artist}. Chiaroscuro lighting, dark background, glazing layers, museum quality",
            "negative": "digital, photo, 3d, cartoon"
        },
        "impressionist": {
            "name": "Impressionist Master",
            "prompt": f"(oil painting:1.5), (visible brushstrokes:1.4), masterpiece {pet_type} portrait. Character: {personality}. Style of {impressionist_artist}. Soft light, broken color, garden setting",
            "negative": "digital, sharp, dark"
        },
        "modern": {
            "name": "Modern Expression",
            "prompt": f"(oil painting:1.5), (thick paint:1.3), expressive {pet_type} portrait. Spirit: {personality}. Style of {modern_artist}. Bold colors, swirling strokes, emotional",
            "negative": "digital, smooth, muted"
        }
    }
    return prompts

def convert_batch(img_path, style_key, prompt_info):
    """Faster conversion with reduced steps"""
    try:
        with open(img_path, 'rb') as f:
            img_data = f.read()
        img_base64 = base64.b64encode(img_data).decode()
        
        payload = {
            "init_images": [f"data:image/jpeg;base64,{img_base64}"],
            "prompt": prompt_info["prompt"],
            "negative_prompt": prompt_info["negative"],
            "denoising_strength": 0.6,
            "cfg_scale": 6.5,
            "sampler_name": "DPM++ 2M Karras",
            "width": 512,
            "height": 512,
            "steps": 20,  # Reduced for speed
            "seed": random.randint(1, 999999),
            "controlnet_units": [{
                "input_image": f"data:image/jpeg;base64,{img_base64}",
                "module": "canny",
                "model": "control_v11p_sd15_canny",
                "weight": 0.5,
                "guidance_start": 0,
                "guidance_end": 1
            }]
        }
        
        response = requests.post("http://localhost:7860/sdapi/v1/img2img", 
                                json=payload, timeout=30)
        
        if response.status_code == 200:
            result = response.json()
            converted_data = base64.b64decode(result['images'][0])
            return Image.open(io.BytesIO(converted_data))
        return None
    except:
        return None

def main():
    input_dir = Path("evaluation_dataset/quality_portraits")
    output_dir = Path("public/evaluation-images/batch_tasks")
    output_dir.mkdir(parents=True, exist_ok=True)
    tasks_dir = Path("evaluation_dataset/masterpiece_tasks")
    tasks_dir.mkdir(exist_ok=True)
    
    # Check existing tasks
    existing_tasks = sorted(tasks_dir.glob("task_*.json"))
    start_idx = 21  # Start from task 21
    
    # Get all portraits
    all_portraits = sorted(input_dir.glob("*.jpg"))
    
    # Process 60 more tasks (20 portraits × 3 styles each)
    portraits_to_process = all_portraits[:20] * 3  # Reuse portraits if needed
    end_idx = start_idx + 60
    
    logger.info("=" * 60)
    logger.info("CREATING 60 MORE EVALUATION TASKS")
    logger.info(f"Tasks {start_idx} to {end_idx-1}")
    logger.info("=" * 60)
    
    task_count = 0
    for idx in range(start_idx, end_idx):
        portrait_idx = (idx - start_idx) % len(all_portraits)
        img_path = all_portraits[portrait_idx]
        
        if not img_path.exists():
            continue
            
        pet_type = "cat" if "cat" in img_path.name else "dog"
        logger.info(f"\n[{idx}/{end_idx-1}] Task {idx}: {pet_type}")
        
        # Get prompts
        prompts = get_masterpiece_prompts(pet_type, idx)
        
        # Copy original
        orig = Image.open(img_path)
        orig_path = output_dir / f"task_{idx}_original.jpg"
        orig.save(orig_path, quality=85)
        
        task_data = {
            "id": idx,
            "category": pet_type,
            "original_image": f"/evaluation-images/batch_tasks/task_{idx}_original.jpg",
            "conversions": {},
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
        }
        
        # Quick conversion for each style
        for style_key in ["classic", "impressionist", "modern"]:
            style_info = prompts[style_key]
            logger.info(f"  {style_info['name']}...")
            
            converted = convert_batch(img_path, style_key, style_info)
            
            if converted:
                output_path = output_dir / f"task_{idx}_{style_key}.jpg"
                converted.save(output_path, quality=85)
                
                task_data["conversions"][style_key] = {
                    "image": f"/evaluation-images/batch_tasks/task_{idx}_{style_key}.jpg",
                    "style_name": style_info["name"]
                }
                logger.info(f"    ✓")
            else:
                logger.info(f"    ✗")
        
        # Save task
        with open(tasks_dir / f"task_{str(idx).zfill(3)}.json", 'w') as f:
            json.dump(task_data, f, indent=2)
        
        task_count += 1
        
        # Progress update
        if task_count % 10 == 0:
            logger.info(f"\n--- Progress: {task_count}/60 tasks complete ---")
            time.sleep(1)
        
        # Stop at 60 tasks
        if task_count >= 60:
            break
    
    logger.info(f"\n✅ Created {task_count} tasks!")
    logger.info(f"📁 Total tasks available: {idx}")

if __name__ == "__main__":
    main()