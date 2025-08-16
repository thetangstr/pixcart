#!/usr/bin/env python3
"""
Extract images for AI vision evaluation
"""

import json
import base64
from pathlib import Path
from PIL import Image
from io import BytesIO

def extract_images_for_evaluation(task_ids: list):
    """Extract specific task images for evaluation"""
    
    tasks_dir = Path("evaluation_dataset/tasks")
    extracted_dir = Path("evaluation_dataset/extracted_for_eval")
    extracted_dir.mkdir(exist_ok=True)
    
    for task_id in task_ids:
        task_file = tasks_dir / f"task_{task_id:03d}.json"
        
        if not task_file.exists():
            print(f"Task {task_id} not found")
            continue
            
        with open(task_file, 'r') as f:
            task = json.load(f)
        
        # Extract original
        if task.get("original_image"):
            img_data = task["original_image"].split(",")[1] if "," in task["original_image"] else task["original_image"]
            img_bytes = base64.b64decode(img_data)
            img = Image.open(BytesIO(img_bytes))
            img.save(extracted_dir / f"task_{task_id:03d}_original.jpg")
        
        # Extract converted
        if task.get("converted_image"):
            img_data = task["converted_image"].split(",")[1] if "," in task["converted_image"] else task["converted_image"]
            img_bytes = base64.b64decode(img_data)
            img = Image.open(BytesIO(img_bytes))
            img.save(extracted_dir / f"task_{task_id:03d}_converted.jpg")
        
        print(f"Extracted task {task_id} - {task.get('category', 'unknown')}")
    
    print(f"\nImages saved to: {extracted_dir}")

if __name__ == "__main__":
    # Extract first 5 tasks for evaluation
    extract_images_for_evaluation([1, 2, 3, 4, 5])