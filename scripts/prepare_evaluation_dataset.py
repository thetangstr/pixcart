#!/usr/bin/env python3
"""
Download 100 real cat and dog images (50/50) and convert them to oil paintings
for human evaluation to train the RL model
"""

import os
import json
import time
import base64
import sqlite3
import requests
from pathlib import Path
from typing import List, Dict
import logging
from datetime import datetime

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configuration
UNSPLASH_ACCESS_KEY = "your_unsplash_key"  # We'll use placeholder images for now
SD_API_URL = "http://localhost:7860"
OUTPUT_DIR = Path("evaluation_dataset")
DB_PATH = Path("rl_training/human_eval.db")

# Create output directories
OUTPUT_DIR.mkdir(exist_ok=True)
(OUTPUT_DIR / "originals").mkdir(exist_ok=True)
(OUTPUT_DIR / "converted").mkdir(exist_ok=True)

# Optimized parameters from our RL training
OPTIMAL_PARAMS = {
    "denoising_strength": 0.15,
    "cfg_scale": 2.0,
    "steps": 20,
    "sampler_name": "DPM++ 2M Karras",
    "width": 512,
    "height": 512
}

def download_images(category: str, count: int) -> List[Path]:
    """Download images from placeholder service (replace with real image source)"""
    images = []
    
    for i in range(count):
        # Using placeholder images for now - replace with real image API
        url = f"https://picsum.photos/512/512?random={category}_{i}_{int(time.time())}"
        
        try:
            response = requests.get(url, timeout=10)
            if response.status_code == 200:
                filename = OUTPUT_DIR / "originals" / f"{category}_{i+1:03d}.jpg"
                with open(filename, 'wb') as f:
                    f.write(response.content)
                images.append(filename)
                logger.info(f"Downloaded {category} image {i+1}/{count}")
            time.sleep(0.5)  # Rate limiting
        except Exception as e:
            logger.error(f"Failed to download {category} image {i+1}: {e}")
    
    return images

def convert_to_oil_painting(image_path: Path, style: str = "soft_impressionist") -> Path:
    """Convert image to oil painting using our optimized SD pipeline"""
    
    # Read and encode image
    with open(image_path, 'rb') as f:
        img_data = base64.b64encode(f.read()).decode('utf-8')
    
    # Prepare the request with multi-ControlNet
    payload = {
        "init_images": [img_data],
        "prompt": f"oil painting, {style} style, masterpiece, textured brushstrokes, thick paint, artistic",
        "negative_prompt": "photo, digital, smooth, flat, cartoon, anime, 3d render",
        "denoising_strength": OPTIMAL_PARAMS["denoising_strength"],
        "cfg_scale": OPTIMAL_PARAMS["cfg_scale"],
        "steps": OPTIMAL_PARAMS["steps"],
        "sampler_name": OPTIMAL_PARAMS["sampler_name"],
        "width": OPTIMAL_PARAMS["width"],
        "height": OPTIMAL_PARAMS["height"],
        "alwayson_scripts": {
            "controlnet": {
                "args": [
                    {
                        "enabled": True,
                        "module": "canny",
                        "model": "control_v11p_sd15_canny",
                        "weight": 0.98,
                        "guidance_start": 0.0,
                        "guidance_end": 1.0,
                        "control_mode": 0
                    },
                    {
                        "enabled": True,
                        "module": "depth_midas",
                        "model": "control_v11f1p_sd15_depth",
                        "weight": 0.15,
                        "guidance_start": 0.0,
                        "guidance_end": 0.5,
                        "control_mode": 0
                    },
                    {
                        "enabled": False,  # Disabled for animals
                        "module": "openpose_full",
                        "model": "control_v11p_sd15_openpose",
                        "weight": 0.0,
                        "guidance_start": 0.3,
                        "guidance_end": 0.7,
                        "control_mode": 0
                    }
                ]
            }
        }
    }
    
    try:
        # Call SD API
        response = requests.post(
            f"{SD_API_URL}/sdapi/v1/img2img",
            json=payload,
            timeout=120
        )
        
        if response.status_code == 200:
            result = response.json()
            
            # Save converted image
            output_path = OUTPUT_DIR / "converted" / f"oil_{image_path.name}"
            img_data = base64.b64decode(result['images'][0])
            with open(output_path, 'wb') as f:
                f.write(img_data)
            
            logger.info(f"Converted {image_path.name} -> {output_path.name}")
            return output_path
        else:
            logger.error(f"SD API error: {response.status_code}")
            return None
            
    except Exception as e:
        logger.error(f"Conversion failed for {image_path.name}: {e}")
        return None

def setup_database():
    """Setup SQLite database for human evaluation"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS evaluation_tasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            original_image TEXT NOT NULL,
            converted_image TEXT NOT NULL,
            parameters TEXT NOT NULL,
            category TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            evaluated BOOLEAN DEFAULT 0,
            preservation_score INTEGER,
            style_score INTEGER,
            overall_score INTEGER,
            comments TEXT,
            evaluator_id TEXT
        )
    ''')
    
    conn.commit()
    return conn

def add_to_evaluation_queue(
    conn: sqlite3.Connection,
    original_path: Path,
    converted_path: Path,
    category: str,
    style: str
):
    """Add conversion to evaluation queue"""
    cursor = conn.cursor()
    
    # Read images and convert to base64
    with open(original_path, 'rb') as f:
        original_b64 = base64.b64encode(f.read()).decode('utf-8')
    with open(converted_path, 'rb') as f:
        converted_b64 = base64.b64encode(f.read()).decode('utf-8')
    
    params = {
        **OPTIMAL_PARAMS,
        "style": style,
        "category": category,
        "canny_weight": 0.98,
        "depth_weight": 0.15,
        "openpose_weight": 0.0
    }
    
    cursor.execute('''
        INSERT INTO evaluation_tasks 
        (original_image, converted_image, parameters, category)
        VALUES (?, ?, ?, ?)
    ''', [
        f"data:image/jpeg;base64,{original_b64}",
        f"data:image/jpeg;base64,{converted_b64}",
        json.dumps(params),
        category
    ])
    
    conn.commit()
    logger.info(f"Added {category} image to evaluation queue")

def main():
    """Main workflow"""
    logger.info("=" * 60)
    logger.info("PREPARING EVALUATION DATASET")
    logger.info("=" * 60)
    
    # Setup database
    DB_PATH.parent.mkdir(exist_ok=True)
    conn = setup_database()
    
    # Download images
    logger.info("\n📥 Downloading images...")
    cat_images = download_images("cat", 50)
    dog_images = download_images("dog", 50)
    
    all_images = [
        (img, "cat") for img in cat_images
    ] + [
        (img, "dog") for img in dog_images
    ]
    
    logger.info(f"Downloaded {len(all_images)} images total")
    
    # Convert each image
    logger.info("\n🎨 Converting to oil paintings...")
    styles = ["soft_impressionist", "classic_portrait", "van_gogh_expressive"]
    successful = 0
    failed = 0
    
    for i, (image_path, category) in enumerate(all_images, 1):
        logger.info(f"\n[{i}/{len(all_images)}] Processing {image_path.name}")
        
        # Rotate through styles
        style = styles[i % len(styles)]
        
        # Convert to oil painting
        converted_path = convert_to_oil_painting(image_path, style)
        
        if converted_path and converted_path.exists():
            # Add to evaluation queue
            add_to_evaluation_queue(conn, image_path, converted_path, category, style)
            successful += 1
        else:
            failed += 1
        
        # Progress update
        if i % 10 == 0:
            logger.info(f"Progress: {i}/{len(all_images)} - Success: {successful}, Failed: {failed}")
    
    # Final stats
    logger.info("\n" + "=" * 60)
    logger.info("DATASET PREPARATION COMPLETE")
    logger.info(f"✅ Successful conversions: {successful}")
    logger.info(f"❌ Failed conversions: {failed}")
    logger.info(f"📊 Total in evaluation queue: {successful}")
    logger.info("\n🔍 Next steps:")
    logger.info("1. Open http://localhost:3000/human-eval")
    logger.info("2. Evaluate each conversion with 5-tier scores")
    logger.info("3. Your scores will train the RL model")
    logger.info("=" * 60)
    
    conn.close()

if __name__ == "__main__":
    # Check if SD API is running
    try:
        response = requests.get(f"{SD_API_URL}/sdapi/v1/progress")
        if response.status_code == 200:
            logger.info("✅ SD API is running")
            main()
        else:
            logger.error("❌ SD API not responding properly")
    except:
        logger.error("❌ Cannot connect to SD API at http://localhost:7860")
        logger.error("Please start Automatic1111 with: ./webui.sh --api --listen")