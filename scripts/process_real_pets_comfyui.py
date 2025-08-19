#!/usr/bin/env python3
"""
Process real pet photos with ComfyUI artistic styles
Classic Oil | Monet | Van Gogh
"""

import os
import json
import base64
import requests
import time
import random
from pathlib import Path

# Configuration
COMFYUI_URL = "http://localhost:8188"
INPUT_DIR = "real_pet_photos"
OUTPUT_DIR = "real_pet_art_results"
PUBLIC_DIR = "public/real-pet-art"

# Artistic Style Definitions
ARTISTIC_STYLES = {
    "classic_oil": {
        "name": "Classic Oil Painting",
        "checkpoint": "v1-5-pruned-emaonly.safetensors",
        "positive_prompt": (
            "classical oil painting masterpiece, renaissance pet portrait, "
            "traditional fine art museum quality, old masters technique, "
            "rich oil paint texture, refined brushwork, warm tones, "
            "professional pet portrait, highly detailed fur texture"
        ),
        "negative_prompt": "photograph, digital art, cartoon, anime, blurry",
        "steps": 30,
        "cfg": 7.0,
        "denoise": 0.55,
        "sampler": "dpmpp_2m",
        "scheduler": "karras"
    },
    
    "monet": {
        "name": "Monet Impressionist",
        "checkpoint": "v1-5-pruned-emaonly.safetensors",
        "positive_prompt": (
            "Claude Monet painting style, impressionist pet portrait, "
            "soft brushstrokes, garden atmosphere, dappled sunlight, "
            "pastel colors, dreamy quality, french impressionism"
        ),
        "negative_prompt": "photograph, sharp details, dark colors, digital",
        "steps": 28,
        "cfg": 6.5,
        "denoise": 0.60,
        "sampler": "euler_ancestral",
        "scheduler": "normal"
    },
    
    "van_gogh": {
        "name": "Van Gogh Style",
        "checkpoint": "v1-5-pruned-emaonly.safetensors",
        "positive_prompt": (
            "Vincent Van Gogh painting style, post-impressionist pet portrait, "
            "bold swirling brushstrokes, thick impasto, vibrant colors, "
            "expressive style, emotional intensity, starry night energy"
        ),
        "negative_prompt": "photograph, smooth, minimal texture, muted colors",
        "steps": 35,
        "cfg": 7.5,
        "denoise": 0.65,
        "sampler": "dpmpp_sde",
        "scheduler": "karras"
    }
}

class RealPetArtProcessor:
    def __init__(self):
        self.client_id = str(random.randint(100000, 999999))
        
    def check_comfyui(self) -> bool:
        """Check if ComfyUI is running"""
        try:
            response = requests.get(f"{COMFYUI_URL}/system_stats", timeout=5)
            return response.status_code == 200
        except:
            return False
    
    def upload_image(self, image_path: str) -> str:
        """Upload image to ComfyUI"""
        with open(image_path, 'rb') as f:
            files = {'image': (os.path.basename(image_path), f, 'image/jpeg')}
            response = requests.post(f"{COMFYUI_URL}/upload/image", files=files)
            
            if response.status_code == 200:
                result = response.json()
                return result.get('name', os.path.basename(image_path))
            else:
                raise Exception(f"Upload failed: {response.status_code}")
    
    def create_workflow(self, image_filename: str, style_config: dict) -> dict:
        """Create ComfyUI workflow for artistic conversion"""
        return {
            "1": {
                "inputs": {"image": image_filename},
                "class_type": "LoadImage"
            },
            "2": {
                "inputs": {"ckpt_name": style_config["checkpoint"]},
                "class_type": "CheckpointLoaderSimple"
            },
            "3": {
                "inputs": {
                    "text": style_config["positive_prompt"],
                    "clip": ["2", 1]
                },
                "class_type": "CLIPTextEncode"
            },
            "4": {
                "inputs": {
                    "text": style_config["negative_prompt"],
                    "clip": ["2", 1]
                },
                "class_type": "CLIPTextEncode"
            },
            "5": {
                "inputs": {
                    "pixels": ["1", 0],
                    "vae": ["2", 2]
                },
                "class_type": "VAEEncode"
            },
            "6": {
                "inputs": {
                    "seed": random.randint(1, 1000000),
                    "steps": style_config["steps"],
                    "cfg": style_config["cfg"],
                    "sampler_name": style_config["sampler"],
                    "scheduler": style_config["scheduler"],
                    "denoise": style_config["denoise"],
                    "model": ["2", 0],
                    "positive": ["3", 0],
                    "negative": ["4", 0],
                    "latent_image": ["5", 0]
                },
                "class_type": "KSampler"
            },
            "7": {
                "inputs": {
                    "samples": ["6", 0],
                    "vae": ["2", 2]
                },
                "class_type": "VAEDecode"
            },
            "8": {
                "inputs": {
                    "filename_prefix": "real_pet_art",
                    "images": ["7", 0]
                },
                "class_type": "SaveImage"
            }
        }
    
    def process_pet(self, pet_info: dict, style_key: str) -> dict:
        """Process a single pet with one artistic style"""
        style = ARTISTIC_STYLES[style_key]
        
        try:
            start_time = time.time()
            
            # Upload image
            image_filename = self.upload_image(pet_info['filepath'])
            
            # Create and queue workflow
            workflow = self.create_workflow(image_filename, style)
            
            response = requests.post(f"{COMFYUI_URL}/prompt", json={
                "prompt": workflow,
                "client_id": self.client_id
            })
            
            if response.status_code != 200:
                raise Exception(f"Queue failed: {response.status_code}")
            
            prompt_id = response.json().get("prompt_id")
            print(f"    ⏳ Processing {style['name']}...")
            
            # Wait for completion
            timeout = 120
            while timeout > 0:
                time.sleep(3)
                timeout -= 3
                
                hist_response = requests.get(f"{COMFYUI_URL}/history/{prompt_id}")
                if hist_response.status_code == 200:
                    history = hist_response.json()
                    if prompt_id in history:
                        outputs = history[prompt_id].get("outputs", {})
                        if "8" in outputs and "images" in outputs["8"]:
                            image_data = outputs["8"]["images"][0]
                            result_filename = image_data["filename"]
                            
                            # Download result
                            img_response = requests.get(
                                f"{COMFYUI_URL}/view?filename={result_filename}"
                            )
                            if img_response.status_code == 200:
                                processing_time = time.time() - start_time
                                print(f"    ✅ {style['name']} done ({processing_time:.1f}s)")
                                
                                return {
                                    "success": True,
                                    "style": style_key,
                                    "style_name": style['name'],
                                    "image_data": img_response.content,
                                    "processing_time": processing_time
                                }
            
            raise TimeoutError("Processing timeout")
            
        except Exception as e:
            print(f"    ❌ {style['name']} failed: {e}")
            return {
                "success": False,
                "style": style_key,
                "style_name": style['name'],
                "error": str(e)
            }

def main():
    """Process real pet photos with artistic styles"""
    print("🎨 Real Pet Art Processor - ComfyUI")
    print("=" * 60)
    print("Styles: Classic Oil | Monet | Van Gogh")
    print()
    
    # Check ComfyUI
    processor = RealPetArtProcessor()
    if not processor.check_comfyui():
        print("❌ ComfyUI is not running!")
        print("Please ensure ComfyUI is running on port 8188")
        return
    
    print("✅ ComfyUI connected\n")
    
    # Load pet metadata
    metadata_file = os.path.join(INPUT_DIR, "metadata.json")
    with open(metadata_file, 'r') as f:
        metadata = json.load(f)
    
    pet_photos = metadata['photos']
    print(f"📁 Found {len(pet_photos)} real pet photos")
    
    # Create output directories
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    os.makedirs(PUBLIC_DIR, exist_ok=True)
    
    # Process first 5 pets for demo (to save time)
    pets_to_process = pet_photos[:5]
    print(f"🎯 Processing {len(pets_to_process)} pets with 3 styles each\n")
    
    all_tasks = []
    
    for idx, pet_info in enumerate(pets_to_process, 1):
        print(f"[{idx}/{len(pets_to_process)}] 🐾 {pet_info['breed']}")
        print("-" * 40)
        
        # Copy original to public
        import shutil
        public_original = f"{PUBLIC_DIR}/{pet_info['name']}_original.jpg"
        shutil.copy(pet_info['filepath'], public_original)
        
        task = {
            "image_name": pet_info['breed'],
            "pet_type": pet_info['type'],
            "pet_name": pet_info['name'],
            "original_image": f"/real-pet-art/{pet_info['name']}_original.jpg",
            "conversions": []
        }
        
        # Process with each style
        for style_key in ARTISTIC_STYLES.keys():
            result = processor.process_pet(pet_info, style_key)
            
            if result["success"]:
                # Save converted image
                output_filename = f"{pet_info['name']}_{style_key}.png"
                output_path = f"{PUBLIC_DIR}/{output_filename}"
                
                with open(output_path, 'wb') as f:
                    f.write(result["image_data"])
                
                task["conversions"].append({
                    "style": style_key,
                    "style_name": result["style_name"],
                    "backend": "comfyui",
                    "processing_time": result["processing_time"],
                    "converted_image": f"/real-pet-art/{output_filename}"
                })
        
        if task["conversions"]:
            all_tasks.append(task)
        
        print()
    
    # Create evaluation dataset
    evaluation_dataset = {
        "experiment_info": {
            "backend": "comfyui",
            "styles": list(ARTISTIC_STYLES.keys()),
            "style_names": [s["name"] for s in ARTISTIC_STYLES.values()],
            "total_images": len(all_tasks),
            "total_conversions": sum(len(t["conversions"]) for t in all_tasks),
            "timestamp": time.time()
        },
        "tasks": []
    }
    
    # Add tasks with proper IDs
    for idx, task in enumerate(all_tasks, 1):
        evaluation_dataset["tasks"].append({
            "task_id": idx,
            **task
        })
    
    # Save dataset
    os.makedirs("comfyui_evaluation_results", exist_ok=True)
    dataset_file = "comfyui_evaluation_results/comfyui_evaluation_dataset.json"
    
    with open(dataset_file, 'w') as f:
        json.dump(evaluation_dataset, f, indent=2)
    
    # Summary
    print("=" * 60)
    print("✅ Real Pet Art Processing Complete!")
    print(f"📊 Processed: {len(all_tasks)} pets")
    print(f"🎨 Total conversions: {sum(len(t['conversions']) for t in all_tasks)}")
    print(f"📁 Images: {PUBLIC_DIR}/")
    print(f"📋 Dataset: {dataset_file}")
    print(f"\n🌐 View results at: http://localhost:3002/comfyui-evaluation")

if __name__ == "__main__":
    main()