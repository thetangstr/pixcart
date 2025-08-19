#!/usr/bin/env python3
"""
Quick real pet processing - 2 pets, 3 styles each
"""

import os
import json
import requests
import time
import random
import shutil
from pathlib import Path

COMFYUI_URL = "http://localhost:8188"

# Just process 2 pets quickly
PETS_TO_PROCESS = [
    {"name": "golden_retriever", "breed": "Golden Retriever", "type": "dog"},
    {"name": "persian_cat", "breed": "Persian Cat", "type": "cat"}
]

STYLES = {
    "classic_oil": {
        "name": "Classic Oil Painting",
        "prompt": "classical oil painting, renaissance pet portrait, rich texture",
        "negative": "photograph, digital art",
        "steps": 20,
        "cfg": 7.0,
        "denoise": 0.55
    },
    "monet": {
        "name": "Monet Impressionist", 
        "prompt": "Claude Monet style, impressionist, soft brushstrokes, pastel",
        "negative": "photograph, sharp",
        "steps": 20,
        "cfg": 6.5,
        "denoise": 0.60
    },
    "van_gogh": {
        "name": "Van Gogh Style",
        "prompt": "Van Gogh style, swirling brushstrokes, vibrant colors",
        "negative": "photograph, smooth",
        "steps": 20,
        "cfg": 7.5,
        "denoise": 0.65
    }
}

def process_pet(pet_info, style_key):
    """Process one pet with one style"""
    print(f"  🎨 {STYLES[style_key]['name']}...")
    
    try:
        # Upload image
        image_path = f"real_pet_photos/{pet_info['name']}.jpg"
        with open(image_path, 'rb') as f:
            files = {'image': f}
            response = requests.post(f"{COMFYUI_URL}/upload/image", files=files)
            if response.status_code != 200:
                raise Exception("Upload failed")
            filename = response.json().get('name')
        
        # Create workflow
        style = STYLES[style_key]
        workflow = {
            "1": {"inputs": {"image": filename}, "class_type": "LoadImage"},
            "2": {"inputs": {"ckpt_name": "v1-5-pruned-emaonly.safetensors"}, "class_type": "CheckpointLoaderSimple"},
            "3": {"inputs": {"text": style["prompt"], "clip": ["2", 1]}, "class_type": "CLIPTextEncode"},
            "4": {"inputs": {"text": style["negative"], "clip": ["2", 1]}, "class_type": "CLIPTextEncode"},
            "5": {"inputs": {"pixels": ["1", 0], "vae": ["2", 2]}, "class_type": "VAEEncode"},
            "6": {
                "inputs": {
                    "seed": random.randint(1, 999999),
                    "steps": style["steps"],
                    "cfg": style["cfg"],
                    "sampler_name": "dpmpp_2m",
                    "scheduler": "karras",
                    "denoise": style["denoise"],
                    "model": ["2", 0],
                    "positive": ["3", 0],
                    "negative": ["4", 0],
                    "latent_image": ["5", 0]
                },
                "class_type": "KSampler"
            },
            "7": {"inputs": {"samples": ["6", 0], "vae": ["2", 2]}, "class_type": "VAEDecode"},
            "8": {"inputs": {"filename_prefix": "pet_art", "images": ["7", 0]}, "class_type": "SaveImage"}
        }
        
        # Queue prompt
        response = requests.post(f"{COMFYUI_URL}/prompt", json={
            "prompt": workflow,
            "client_id": str(random.randint(100000, 999999))
        })
        
        if response.status_code != 200:
            raise Exception("Queue failed")
        
        prompt_id = response.json().get("prompt_id")
        
        # Wait for completion
        start_time = time.time()
        timeout = 90
        while timeout > 0:
            time.sleep(3)
            timeout -= 3
            
            hist_response = requests.get(f"{COMFYUI_URL}/history/{prompt_id}")
            if hist_response.status_code == 200:
                history = hist_response.json()
                if prompt_id in history:
                    outputs = history[prompt_id].get("outputs", {})
                    if "8" in outputs and "images" in outputs["8"]:
                        result_filename = outputs["8"]["images"][0]["filename"]
                        
                        # Get result image
                        img_response = requests.get(f"{COMFYUI_URL}/view?filename={result_filename}")
                        if img_response.status_code == 200:
                            processing_time = time.time() - start_time
                            
                            # Save to public
                            output_file = f"public/real-pet-art/{pet_info['name']}_{style_key}.png"
                            with open(output_file, 'wb') as f:
                                f.write(img_response.content)
                            
                            print(f"    ✅ Done in {processing_time:.1f}s")
                            return {
                                "success": True,
                                "style": style_key,
                                "style_name": style["name"],
                                "processing_time": processing_time,
                                "output_file": f"/real-pet-art/{pet_info['name']}_{style_key}.png"
                            }
        
        raise TimeoutError("Processing timeout")
        
    except Exception as e:
        print(f"    ❌ Failed: {e}")
        return {"success": False, "style": style_key, "error": str(e)}

def main():
    print("🎨 Quick Real Pet Art Demo")
    print("=" * 50)
    
    # Check ComfyUI
    try:
        response = requests.get(f"{COMFYUI_URL}/system_stats", timeout=5)
        if response.status_code != 200:
            print("❌ ComfyUI not running!")
            return
    except:
        print("❌ Cannot connect to ComfyUI!")
        return
    
    print("✅ ComfyUI connected\n")
    
    # Create output directory
    os.makedirs("public/real-pet-art", exist_ok=True)
    
    # Process pets
    tasks = []
    
    for pet_info in PETS_TO_PROCESS:
        print(f"🐾 {pet_info['breed']}")
        print("-" * 30)
        
        # Copy original
        src = f"real_pet_photos/{pet_info['name']}.jpg"
        dst = f"public/real-pet-art/{pet_info['name']}_original.jpg"
        shutil.copy(src, dst)
        
        task = {
            "image_name": pet_info['breed'],
            "pet_type": pet_info['type'],
            "original_image": f"/real-pet-art/{pet_info['name']}_original.jpg",
            "conversions": []
        }
        
        # Process with each style
        for style_key in STYLES.keys():
            result = process_pet(pet_info, style_key)
            
            if result["success"]:
                task["conversions"].append({
                    "style": style_key,
                    "style_name": result["style_name"],
                    "backend": "comfyui",
                    "processing_time": result["processing_time"],
                    "converted_image": result["output_file"]
                })
        
        tasks.append(task)
        print()
    
    # Create evaluation dataset
    dataset = {
        "experiment_info": {
            "backend": "comfyui",
            "styles": ["classic_oil", "monet", "van_gogh"],
            "style_names": ["Classic Oil Painting", "Monet Impressionist", "Van Gogh Style"],
            "total_images": len(tasks),
            "total_conversions": sum(len(t["conversions"]) for t in tasks),
            "timestamp": time.time()
        },
        "tasks": []
    }
    
    for idx, task in enumerate(tasks, 1):
        dataset["tasks"].append({"task_id": idx, **task})
    
    # Save dataset
    os.makedirs("comfyui_evaluation_results", exist_ok=True)
    with open("comfyui_evaluation_results/comfyui_evaluation_dataset.json", 'w') as f:
        json.dump(dataset, f, indent=2)
    
    print("=" * 50)
    print("✅ Real Pet Art Complete!")
    print(f"📊 Processed: {len(tasks)} real pets")
    print(f"🎨 Total: {sum(len(t['conversions']) for t in tasks)} artworks")
    print("\n🌐 View at: http://localhost:3002/comfyui-evaluation")

if __name__ == "__main__":
    main()