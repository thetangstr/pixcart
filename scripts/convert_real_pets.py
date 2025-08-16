#!/usr/bin/env python3
"""
Convert real pet images to oil paintings and create evaluation tasks
"""

import requests
import json
import base64
import time
from pathlib import Path
import logging
from PIL import Image
from io import BytesIO

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

SD_API_URL = "http://localhost:7860"
INPUT_DIR = Path("evaluation_dataset/real_pets")
OUTPUT_DIR = Path("evaluation_dataset")
TASKS_DIR = OUTPUT_DIR / "real_tasks"
PUBLIC_DIR = Path("public/evaluation-images")

TASKS_DIR.mkdir(exist_ok=True, parents=True)
PUBLIC_DIR.mkdir(exist_ok=True, parents=True)

def convert_to_oil_painting(image_path: Path) -> str:
    """Convert pet image to oil painting"""
    
    # Read and resize image if needed
    img = Image.open(image_path)
    
    # Resize to 512x512 for consistency
    img = img.convert('RGB')
    img.thumbnail((512, 512), Image.Resampling.LANCZOS)
    
    # Create square canvas
    canvas = Image.new('RGB', (512, 512), (255, 255, 255))
    x = (512 - img.width) // 2
    y = (512 - img.height) // 2
    canvas.paste(img, (x, y))
    
    # Convert to base64
    buffer = BytesIO()
    canvas.save(buffer, format='JPEG')
    img_b64 = base64.b64encode(buffer.getvalue()).decode()
    
    # Prepare SD request with preservation-first settings
    payload = {
        "init_images": [img_b64],
        "prompt": "oil painting, thick brushstrokes, artistic masterpiece, traditional art",
        "negative_prompt": "photo, digital, 3d, cartoon, anime, sketch",
        "denoising_strength": 0.15,  # Very low for preservation
        "cfg_scale": 2.0,            # Low guidance
        "steps": 20,
        "sampler_name": "DPM++ 2M Karras",
        "width": 512,
        "height": 512
    }
    
    try:
        response = requests.post(
            f"{SD_API_URL}/sdapi/v1/img2img",
            json=payload,
            timeout=60
        )
        
        if response.status_code == 200:
            result = response.json()
            return result['images'][0]
        else:
            logger.error(f"SD API error: {response.status_code}")
            return None
            
    except Exception as e:
        logger.error(f"Conversion failed: {e}")
        return None

def process_batch():
    """Process all pet images"""
    
    # Get all pet images
    cat_images = sorted(INPUT_DIR.glob("cat_*.jpg"))
    dog_images = sorted(INPUT_DIR.glob("dog_*.jpg"))
    
    all_images = []
    # Interleave cats and dogs
    for i in range(max(len(cat_images), len(dog_images))):
        if i < len(cat_images):
            all_images.append(('cat', cat_images[i]))
        if i < len(dog_images):
            all_images.append(('dog', dog_images[i]))
    
    logger.info(f"Processing {len(all_images)} pet images...")
    
    success = 0
    for idx, (category, image_path) in enumerate(all_images[:100], 1):
        logger.info(f"[{idx}/100] Converting {category} - {image_path.name}")
        
        # Convert to oil painting
        converted_b64 = convert_to_oil_painting(image_path)
        
        if converted_b64:
            # Read original
            with open(image_path, 'rb') as f:
                original_b64 = base64.b64encode(f.read()).decode()
            
            # Create task
            task = {
                "id": idx,
                "category": category,
                "original_image": f"data:image/jpeg;base64,{original_b64}",
                "converted_image": f"data:image/jpeg;base64,{converted_b64}",
                "parameters": {
                    "denoising_strength": 0.15,
                    "cfg_scale": 2.0,
                    "steps": 20,
                    "style": "oil_painting"
                },
                "timestamp": time.time(),
                "evaluated": False,
                "scores": None
            }
            
            # Save task
            task_file = TASKS_DIR / f"task_{idx:03d}.json"
            with open(task_file, 'w') as f:
                json.dump(task, f, indent=2)
            
            # Also save images to public folder
            try:
                # Original
                img_data = base64.b64decode(original_b64)
                img = Image.open(BytesIO(img_data))
                img.save(PUBLIC_DIR / f"real_task_{idx}_original.jpg", "JPEG", quality=85)
                
                # Converted
                img_data = base64.b64decode(converted_b64)
                img = Image.open(BytesIO(img_data))
                img.save(PUBLIC_DIR / f"real_task_{idx}_converted.jpg", "JPEG", quality=85)
                
            except Exception as e:
                logger.error(f"Error saving images: {e}")
            
            success += 1
            logger.info(f"✓ Created task #{idx} ({category})")
        else:
            logger.error(f"✗ Failed task #{idx}")
    
    logger.info("\n" + "=" * 60)
    logger.info(f"✅ Successfully converted {success}/100 pet images")
    logger.info(f"📁 Tasks saved in: {TASKS_DIR}")
    logger.info(f"🖼️ Images available at: /evaluation-images/real_task_*.jpg")
    logger.info("🔗 Visit http://localhost:3000/evaluation-dashboard")

if __name__ == "__main__":
    process_batch()