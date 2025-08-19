#!/usr/bin/env python3
"""
Quick Pet Art Demo with Sample Images
Creates sample pet images and converts them with ComfyUI artistic styles
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
OUTPUT_DIR = "pet_art_results"
PUBLIC_DIR = "public/pet-art"

# Sample URLs for demo pet portraits
SAMPLE_PETS = [
    # Dogs
    ("golden_retriever", "https://images.unsplash.com/photo-1633722715463-d30f4f325e24?w=800&h=1200&fit=crop"),
    ("labrador", "https://images.unsplash.com/photo-1554456854-55a089fd4cb2?w=800&h=1200&fit=crop"),
    ("husky", "https://images.unsplash.com/photo-1547407139-3c921a66005c?w=800&h=1200&fit=crop"),
    
    # Cats  
    ("persian_cat", "https://images.unsplash.com/photo-1567270671170-fdc10a5bf831?w=800&h=1200&fit=crop"),
    ("siamese_cat", "https://images.unsplash.com/photo-1513360371669-4adf3dd7dff8?w=800&h=1200&fit=crop"),
    ("tabby_cat", "https://images.unsplash.com/photo-1574158622682-e40e69881006?w=800&h=1200&fit=crop"),
]

# Artistic Style Definitions
ARTISTIC_STYLES = {
    "classic_oil": {
        "name": "Classic Oil Painting",
        "checkpoint": "v1-5-pruned-emaonly.safetensors",
        "positive_prompt": (
            "classical oil painting masterpiece, renaissance portrait style, "
            "traditional fine art, museum quality, old masters technique, "
            "rich oil paint texture, glazing layers, warm tones, chiaroscuro lighting, "
            "refined brushwork, pet portrait, highly detailed, professional artwork"
        ),
        "negative_prompt": "photograph, digital art, modern, abstract, cartoon, anime, watercolor",
        "steps": 30,
        "cfg": 7.0,
        "denoise": 0.60,
        "sampler": "dpmpp_2m",
        "scheduler": "karras"
    },
    
    "monet": {
        "name": "Monet Impressionist",
        "checkpoint": "v1-5-pruned-emaonly.safetensors",
        "positive_prompt": (
            "Claude Monet painting style, impressionist masterpiece, "
            "soft brushstrokes, water lilies garden atmosphere, dappled light, "
            "pastel colors palette, dreamy quality, loose painterly technique, "
            "french impressionism, pet portrait in Monet style"
        ),
        "negative_prompt": "photograph, sharp details, dark colors, geometric, modern art, digital",
        "steps": 28,
        "cfg": 6.5,
        "denoise": 0.65,
        "sampler": "euler_ancestral",
        "scheduler": "normal"
    },
    
    "van_gogh": {
        "name": "Van Gogh Style",
        "checkpoint": "v1-5-pruned-emaonly.safetensors",
        "positive_prompt": (
            "Vincent Van Gogh painting style, post-impressionist masterpiece, "
            "bold swirling brushstrokes, thick impasto technique, vibrant colors, "
            "expressive paint application, dynamic movement, emotional intensity, "
            "visible brushwork, pet portrait in Van Gogh style"
        ),
        "negative_prompt": "photograph, smooth painting, minimal texture, muted colors, realistic",
        "steps": 35,
        "cfg": 7.5,
        "denoise": 0.70,
        "sampler": "dpmpp_sde",
        "scheduler": "karras"
    }
}

class QuickPetArtConverter:
    def __init__(self):
        self.client_id = str(random.randint(100000, 999999))
        
    def download_sample_image(self, name: str, url: str) -> str:
        """Download a sample pet image"""
        try:
            response = requests.get(url, timeout=30)
            if response.status_code == 200:
                os.makedirs("pet_portraits", exist_ok=True)
                filepath = f"pet_portraits/{name}.jpg"
                with open(filepath, 'wb') as f:
                    f.write(response.content)
                print(f"✅ Downloaded: {name}")
                return filepath
            else:
                print(f"❌ Failed to download {name}")
                return None
        except Exception as e:
            print(f"❌ Error downloading {name}: {e}")
            return None
    
    def upload_to_comfyui(self, image_path: str) -> str:
        """Upload image to ComfyUI"""
        try:
            with open(image_path, 'rb') as f:
                files = {'image': (os.path.basename(image_path), f, 'image/jpeg')}
                response = requests.post(f"{COMFYUI_URL}/upload/image", files=files)
                
                if response.status_code == 200:
                    result = response.json()
                    return result.get('name', os.path.basename(image_path))
                else:
                    raise Exception(f"Upload failed: {response.status_code}")
        except Exception as e:
            raise Exception(f"Failed to upload: {e}")
    
    def create_workflow(self, image_filename: str, style_config: dict) -> dict:
        """Create ComfyUI workflow"""
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
                    "filename_prefix": "pet_art",
                    "images": ["7", 0]
                },
                "class_type": "SaveImage"
            }
        }
    
    def process_image(self, image_path: str, style_key: str) -> dict:
        """Process image with artistic style"""
        style = ARTISTIC_STYLES[style_key]
        print(f"  🎨 {style['name']}...")
        
        try:
            start_time = time.time()
            
            # Upload
            filename = self.upload_to_comfyui(image_path)
            
            # Create workflow
            workflow = self.create_workflow(filename, style)
            
            # Queue
            response = requests.post(f"{COMFYUI_URL}/prompt", json={
                "prompt": workflow,
                "client_id": self.client_id
            })
            
            if response.status_code != 200:
                raise Exception(f"Queue failed: {response.text}")
            
            prompt_id = response.json().get("prompt_id")
            
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
                            
                            # Get the image
                            img_response = requests.get(
                                f"{COMFYUI_URL}/view?filename={result_filename}"
                            )
                            if img_response.status_code == 200:
                                processing_time = time.time() - start_time
                                print(f"    ✅ Done in {processing_time:.1f}s")
                                
                                return {
                                    "success": True,
                                    "style": style_key,
                                    "image_data": img_response.content,
                                    "processing_time": processing_time
                                }
            
            raise TimeoutError("Processing timeout")
            
        except Exception as e:
            print(f"    ❌ Failed: {e}")
            return {"success": False, "style": style_key, "error": str(e)}

def main():
    """Quick demo of pet art styles"""
    print("🎨 Pet Art Quick Demo - ComfyUI")
    print("=" * 50)
    print("Styles: Classic Oil | Monet | Van Gogh")
    print()
    
    # Check ComfyUI
    try:
        response = requests.get(f"{COMFYUI_URL}/system_stats", timeout=5)
        if response.status_code != 200:
            print("❌ ComfyUI not running!")
            return
    except:
        print("❌ Cannot connect to ComfyUI!")
        return
    
    print("✅ ComfyUI is running\n")
    
    # Create directories
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    os.makedirs(PUBLIC_DIR, exist_ok=True)
    
    converter = QuickPetArtConverter()
    
    # Download sample pet images
    print("📥 Getting sample pet images...")
    pet_images = []
    for name, url in SAMPLE_PETS[:3]:  # Just 3 pets for quick demo
        filepath = converter.download_sample_image(name, url)
        if filepath:
            pet_images.append((name, filepath))
    
    if not pet_images:
        print("❌ No images downloaded!")
        return
    
    print(f"\n📁 Processing {len(pet_images)} pets with 3 art styles each...")
    print()
    
    # Process each pet with each style
    all_results = []
    
    for pet_name, image_path in pet_images:
        print(f"🐾 {pet_name}")
        print("-" * 30)
        
        # Copy original to public
        import shutil
        public_original = f"{PUBLIC_DIR}/{pet_name}_original.jpg"
        shutil.copy(image_path, public_original)
        
        task = {
            "image_name": pet_name,
            "original_image": f"/pet-art/{pet_name}_original.jpg",
            "conversions": []
        }
        
        for style_key in ARTISTIC_STYLES.keys():
            result = converter.process_image(image_path, style_key)
            
            if result["success"]:
                # Save converted image
                output_file = f"{pet_name}_{style_key}.png"
                output_path = f"{PUBLIC_DIR}/{output_file}"
                
                with open(output_path, 'wb') as f:
                    f.write(result["image_data"])
                
                task["conversions"].append({
                    "style": style_key,
                    "style_name": ARTISTIC_STYLES[style_key]["name"],
                    "backend": "comfyui",
                    "processing_time": result["processing_time"],
                    "converted_image": f"/pet-art/{output_file}"
                })
        
        all_results.append(task)
        print()
    
    # Create evaluation dataset
    dataset = {
        "experiment_info": {
            "backend": "comfyui",
            "styles": ["classic_oil", "monet", "van_gogh"],
            "style_names": ["Classic Oil Painting", "Monet Impressionist", "Van Gogh Style"],
            "total_images": len(all_results),
            "timestamp": time.time()
        },
        "tasks": []
    }
    
    for idx, task in enumerate(all_results, 1):
        dataset["tasks"].append({
            "task_id": idx,
            **task
        })
    
    # Save dataset
    dataset_file = "comfyui_evaluation_results/comfyui_evaluation_dataset.json"
    os.makedirs("comfyui_evaluation_results", exist_ok=True)
    with open(dataset_file, 'w') as f:
        json.dump(dataset, f, indent=2)
    
    print("=" * 50)
    print("✅ Pet Art Demo Complete!")
    print(f"📁 Images: {PUBLIC_DIR}/")
    print(f"📋 Dataset: {dataset_file}")
    print(f"\n🌐 View at: http://localhost:3002/comfyui-evaluation")

if __name__ == "__main__":
    main()