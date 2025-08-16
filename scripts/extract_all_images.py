#!/usr/bin/env python3
"""
Extract all images to public folder for direct serving
"""

import json
import base64
from pathlib import Path
from PIL import Image
from io import BytesIO

def extract_all():
    tasks_dir = Path("evaluation_dataset/tasks")
    public_dir = Path("public/evaluation-images")
    public_dir.mkdir(exist_ok=True, parents=True)
    
    count = 0
    for task_file in sorted(tasks_dir.glob("task_*.json"))[:100]:
        with open(task_file, 'r') as f:
            task = json.load(f)
        
        task_id = task['id']
        
        # Extract original
        if task.get("original_image"):
            try:
                img_data = task["original_image"].split(",")[1] if "," in task["original_image"] else task["original_image"]
                img_bytes = base64.b64decode(img_data)
                img = Image.open(BytesIO(img_bytes))
                img.save(public_dir / f"task_{task_id}_original.jpg", "JPEG", quality=85)
            except Exception as e:
                print(f"Error extracting original {task_id}: {e}")
        
        # Extract converted
        if task.get("converted_image"):
            try:
                img_data = task["converted_image"].split(",")[1] if "," in task["converted_image"] else task["converted_image"]
                img_bytes = base64.b64decode(img_data)
                img = Image.open(BytesIO(img_bytes))
                img.save(public_dir / f"task_{task_id}_converted.jpg", "JPEG", quality=85)
            except Exception as e:
                print(f"Error extracting converted {task_id}: {e}")
        
        count += 1
        if count % 10 == 0:
            print(f"Extracted {count} tasks...")
    
    print(f"\n✅ Extracted {count} tasks to: {public_dir}")
    print("Images are now available at: /evaluation-images/task_X_[original|converted].jpg")

if __name__ == "__main__":
    extract_all()