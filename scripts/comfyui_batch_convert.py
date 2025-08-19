#!/usr/bin/env python3
"""
ComfyUI Batch Oil Painting Converter
Processes 50 photos with 3 different oil painting styles for human evaluation
"""

import os
import json
import base64
import requests
import time
import random
from pathlib import Path
from typing import Dict, List, Any
import websocket
import uuid
import threading

# Configuration
COMFYUI_URL = "http://localhost:8188"
OUTPUT_DIR = "comfyui_evaluation_results"
STYLES_TO_TEST = ["classic_portrait", "soft_impressionist", "thick_textured"]
PHOTOS_TO_PROCESS = 50

# ComfyUI Oil Painting Styles (optimized for comparison with A1111)
COMFYUI_STYLES = {
    "classic_portrait": {
        "checkpoint": "v1-5-pruned-emaonly.safetensors",
        "positive_prompt": "oil painting, classical renaissance style, smooth brushwork, refined details, warm lighting, professional portrait style, artistic masterpiece, high quality, detailed",
        "negative_prompt": "photograph, digital art, low quality, blurry, distorted, anime, cartoon, rough brushwork, modern art, abstract",
        "steps": 30,
        "cfg": 6.5,
        "denoise": 0.65,
        "sampler": "DPM++ 2M Karras",
        "scheduler": "karras"
    },
    "soft_impressionist": {
        "checkpoint": "v1-5-pruned-emaonly.safetensors", 
        "positive_prompt": "oil painting, impressionist style, soft brushstrokes, dreamy atmosphere, gentle colors, artistic interpretation, painterly effect, luminous, ethereal",
        "negative_prompt": "photograph, digital art, sharp details, harsh lighting, cartoon, anime, low quality, blurry, modern digital art",
        "steps": 28,
        "cfg": 7.0,
        "denoise": 0.70,
        "sampler": "Euler a",
        "scheduler": "normal"
    },
    "thick_textured": {
        "checkpoint": "v1-5-pruned-emaonly.safetensors",
        "positive_prompt": "oil painting, heavy impasto technique, thick visible brushstrokes, textured paint, bold artistic style, expressive, palette knife work, chunky paint application",
        "negative_prompt": "photograph, smooth painting, digital art, flat colors, cartoon, anime, low quality, blurry, minimal texture",
        "steps": 35,
        "cfg": 8.0,
        "denoise": 0.75,
        "sampler": "DPM++ SDE Karras", 
        "scheduler": "karras"
    }
}

class ComfyUIBatchProcessor:
    def __init__(self):
        self.client_id = str(uuid.uuid4())
        self.ws = None
        self.results = []
        
    def connect_websocket(self):
        """Connect to ComfyUI WebSocket for progress monitoring"""
        try:
            self.ws = websocket.WebSocket()
            self.ws.connect(f"ws://localhost:8188/ws?clientId={self.client_id}")
            print("✅ Connected to ComfyUI WebSocket")
            return True
        except Exception as e:
            print(f"❌ Failed to connect to WebSocket: {e}")
            return False
    
    def check_comfyui_status(self) -> bool:
        """Check if ComfyUI is running and accessible"""
        try:
            response = requests.get(f"{COMFYUI_URL}/system_stats", timeout=5)
            if response.status_code == 200:
                print("✅ ComfyUI is running and accessible")
                return True
            else:
                print(f"❌ ComfyUI returned status code: {response.status_code}")
                return False
        except requests.exceptions.RequestException as e:
            print(f"❌ Cannot connect to ComfyUI: {e}")
            print(f"Make sure ComfyUI is running on {COMFYUI_URL}")
            return False
    
    def create_oil_painting_workflow(self, image_base64: str, style_config: Dict) -> Dict:
        """Create ComfyUI workflow for oil painting conversion"""
        workflow = {
            "3": {
                "inputs": {
                    "seed": random.randint(1, 1000000),
                    "steps": style_config["steps"],
                    "cfg": style_config["cfg"],
                    "sampler_name": style_config["sampler"],
                    "scheduler": style_config["scheduler"],
                    "denoise": style_config["denoise"],
                    "model": ["4", 0],
                    "positive": ["6", 0],
                    "negative": ["7", 0],
                    "latent_image": ["5", 0]
                },
                "class_type": "KSampler"
            },
            "4": {
                "inputs": {
                    "ckpt_name": style_config["checkpoint"]
                },
                "class_type": "CheckpointLoaderSimple"
            },
            "5": {
                "inputs": {
                    "width": 512,
                    "height": 512,
                    "batch_size": 1
                },
                "class_type": "EmptyLatentImage"
            },
            "6": {
                "inputs": {
                    "text": style_config["positive_prompt"],
                    "clip": ["4", 1]
                },
                "class_type": "CLIPTextEncode"
            },
            "7": {
                "inputs": {
                    "text": style_config["negative_prompt"],
                    "clip": ["4", 1]
                },
                "class_type": "CLIPTextEncode"
            },
            "8": {
                "inputs": {
                    "samples": ["3", 0],
                    "vae": ["4", 2]
                },
                "class_type": "VAEDecode"
            },
            "9": {
                "inputs": {
                    "filename_prefix": "ComfyUI_oil_painting",
                    "images": ["8", 0]
                },
                "class_type": "SaveImage"
            },
            "10": {
                "inputs": {
                    "image": image_base64,
                    "upload": "image"
                },
                "class_type": "LoadImage"
            },
            "11": {
                "inputs": {
                    "image": ["10", 0],
                    "vae": ["4", 2]
                },
                "class_type": "VAEEncode"
            }
        }
        
        # Update latent input to use encoded image
        workflow["3"]["inputs"]["latent_image"] = ["11", 0]
        
        return workflow
    
    def queue_prompt(self, workflow: Dict) -> str:
        """Queue a prompt in ComfyUI and return prompt ID"""
        payload = {
            "prompt": workflow,
            "client_id": self.client_id
        }
        
        response = requests.post(f"{COMFYUI_URL}/prompt", json=payload)
        if response.status_code == 200:
            result = response.json()
            prompt_id = result.get("prompt_id")
            print(f"📝 Queued prompt: {prompt_id}")
            return prompt_id
        else:
            raise Exception(f"Failed to queue prompt: {response.status_code}")
    
    def wait_for_completion(self, prompt_id: str, timeout: int = 300) -> str:
        """Wait for prompt completion and return result image"""
        start_time = time.time()
        
        while time.time() - start_time < timeout:
            try:
                # Check queue status
                response = requests.get(f"{COMFYUI_URL}/history/{prompt_id}")
                if response.status_code == 200:
                    history = response.json()
                    if prompt_id in history:
                        # Prompt completed
                        outputs = history[prompt_id]["outputs"]
                        if "9" in outputs and "images" in outputs["9"]:
                            image_data = outputs["9"]["images"][0]
                            image_filename = image_data["filename"]
                            
                            # Download the image
                            img_response = requests.get(f"{COMFYUI_URL}/view?filename={image_filename}")
                            if img_response.status_code == 200:
                                image_base64 = base64.b64encode(img_response.content).decode('utf-8')
                                return f"data:image/png;base64,{image_base64}"
                
                time.sleep(2)
                
            except Exception as e:
                print(f"⚠️ Error checking completion: {e}")
                time.sleep(2)
        
        raise TimeoutError(f"Prompt {prompt_id} did not complete within {timeout} seconds")
    
    def convert_image(self, image_path: str, style_name: str) -> Dict:
        """Convert a single image with specified style"""
        print(f"🎨 Converting {image_path} with style '{style_name}'")
        
        # Read and encode image
        with open(image_path, 'rb') as f:
            image_data = f.read()
            image_base64 = base64.b64encode(image_data).decode('utf-8')
        
        style_config = COMFYUI_STYLES[style_name]
        
        try:
            # Create workflow
            workflow = self.create_oil_painting_workflow(image_base64, style_config)
            
            # Queue and process
            start_time = time.time()
            prompt_id = self.queue_prompt(workflow)
            result_image = self.wait_for_completion(prompt_id)
            processing_time = time.time() - start_time
            
            return {
                "success": True,
                "image": result_image,
                "processing_time": processing_time,
                "style": style_name,
                "prompt_id": prompt_id
            }
            
        except Exception as e:
            print(f"❌ Failed to convert {image_path}: {e}")
            return {
                "success": False,
                "error": str(e),
                "style": style_name
            }
    
    def process_batch(self, image_paths: List[str]) -> List[Dict]:
        """Process a batch of images with all styles"""
        if not self.check_comfyui_status():
            return []
        
        # Connect WebSocket for monitoring
        self.connect_websocket()
        
        results = []
        total_tasks = len(image_paths) * len(STYLES_TO_TEST)
        completed_tasks = 0
        
        print(f"🚀 Starting batch processing: {len(image_paths)} photos × {len(STYLES_TO_TEST)} styles = {total_tasks} tasks")
        
        for image_path in image_paths:
            image_name = Path(image_path).stem
            
            for style_name in STYLES_TO_TEST:
                completed_tasks += 1
                print(f"\n📊 Progress: {completed_tasks}/{total_tasks} ({completed_tasks/total_tasks*100:.1f}%)")
                
                result = self.convert_image(image_path, style_name)
                
                # Add metadata
                result.update({
                    "original_image": image_path,
                    "image_name": image_name,
                    "timestamp": time.time(),
                    "backend": "comfyui"
                })
                
                results.append(result)
                
                # Save individual result
                output_file = os.path.join(OUTPUT_DIR, f"{image_name}_{style_name}_comfyui.json")
                with open(output_file, 'w') as f:
                    json.dump(result, f, indent=2)
                
                # Save converted image if successful
                if result["success"]:
                    image_output_file = os.path.join(OUTPUT_DIR, f"{image_name}_{style_name}_comfyui.png")
                    if result["image"].startswith("data:image"):
                        image_data = base64.b64decode(result["image"].split(",")[1])
                        with open(image_output_file, 'wb') as f:
                            f.write(image_data)
                
                # Brief pause between requests
                time.sleep(1)
        
        # Close WebSocket
        if self.ws:
            self.ws.close()
        
        return results

def download_test_images():
    """Download or prepare 50 diverse test images"""
    print("📥 Preparing test images...")
    
    # Create input directory
    input_dir = "test_images_comfyui"
    os.makedirs(input_dir, exist_ok=True)
    
    # Check if we already have test images
    existing_images = list(Path(input_dir).glob("*.jpg")) + list(Path(input_dir).glob("*.png"))
    
    if len(existing_images) >= PHOTOS_TO_PROCESS:
        print(f"✅ Found {len(existing_images)} existing test images")
        return sorted([str(img) for img in existing_images[:PHOTOS_TO_PROCESS]])
    
    # Download diverse test images from Unsplash (free stock photos)
    import urllib.request
    
    # Categories for diverse test set
    categories = [
        "portrait", "landscape", "architecture", "nature", "people", 
        "animals", "food", "travel", "art", "fashion"
    ]
    
    downloaded_images = []
    
    for i in range(PHOTOS_TO_PROCESS):
        category = categories[i % len(categories)]
        try:
            # Unsplash Source API (free, no API key needed)
            url = f"https://source.unsplash.com/512x512/?{category}&{i}"
            filename = f"{input_dir}/test_{i:03d}_{category}.jpg"
            
            print(f"📥 Downloading image {i+1}/{PHOTOS_TO_PROCESS}: {category}")
            urllib.request.urlretrieve(url, filename)
            downloaded_images.append(filename)
            
            time.sleep(1)  # Be respectful to API
            
        except Exception as e:
            print(f"⚠️ Failed to download image {i}: {e}")
    
    print(f"✅ Downloaded {len(downloaded_images)} test images")
    return downloaded_images

def create_evaluation_data():
    """Create evaluation dataset for human review"""
    print("📋 Creating evaluation dataset...")
    
    results_dir = Path(OUTPUT_DIR)
    evaluation_data = {
        "experiment_info": {
            "backend": "comfyui",
            "styles_tested": STYLES_TO_TEST,
            "total_images": PHOTOS_TO_PROCESS,
            "total_conversions": PHOTOS_TO_PROCESS * len(STYLES_TO_TEST),
            "timestamp": time.time()
        },
        "tasks": []
    }
    
    # Group results by original image
    image_groups = {}
    for result_file in results_dir.glob("*_comfyui.json"):
        with open(result_file) as f:
            result = json.load(f)
            
        image_name = result["image_name"]
        if image_name not in image_groups:
            image_groups[image_name] = {}
        
        image_groups[image_name][result["style"]] = result
    
    # Create evaluation tasks
    task_id = 1
    for image_name, styles in image_groups.items():
        if len(styles) == len(STYLES_TO_TEST):  # Only include complete sets
            task = {
                "task_id": task_id,
                "image_name": image_name,
                "original_image": styles[STYLES_TO_TEST[0]]["original_image"],
                "conversions": []
            }
            
            for style_name in STYLES_TO_TEST:
                if style_name in styles and styles[style_name]["success"]:
                    task["conversions"].append({
                        "style": style_name,
                        "backend": "comfyui",
                        "processing_time": styles[style_name]["processing_time"],
                        "converted_image": f"{image_name}_{style_name}_comfyui.png"
                    })
            
            if len(task["conversions"]) > 0:
                evaluation_data["tasks"].append(task)
                task_id += 1
    
    # Save evaluation dataset
    eval_file = os.path.join(OUTPUT_DIR, "comfyui_evaluation_dataset.json")
    with open(eval_file, 'w') as f:
        json.dump(evaluation_data, f, indent=2)
    
    print(f"✅ Created evaluation dataset with {len(evaluation_data['tasks'])} complete tasks")
    return eval_file

def main():
    """Main execution function"""
    print("🎨 ComfyUI Oil Painting Batch Evaluation")
    print("=" * 50)
    
    # Create output directory
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    # Step 1: Download test images
    print("\n📥 Step 1: Preparing test images")
    image_paths = download_test_images()
    
    if len(image_paths) < PHOTOS_TO_PROCESS:
        print(f"⚠️ Only found {len(image_paths)} images, need {PHOTOS_TO_PROCESS}")
        return
    
    # Step 2: Process with ComfyUI
    print(f"\n🎨 Step 2: Processing {len(image_paths)} images with ComfyUI")
    processor = ComfyUIBatchProcessor()
    results = processor.process_batch(image_paths[:PHOTOS_TO_PROCESS])
    
    # Step 3: Create evaluation dataset
    print(f"\n📋 Step 3: Creating evaluation dataset")
    eval_file = create_evaluation_data()
    
    # Summary
    successful_conversions = sum(1 for r in results if r["success"])
    total_conversions = len(results)
    
    print(f"\n✅ Batch processing complete!")
    print(f"📊 Results: {successful_conversions}/{total_conversions} successful conversions")
    print(f"📁 Output directory: {OUTPUT_DIR}")
    print(f"📋 Evaluation dataset: {eval_file}")
    print(f"\n🌐 Next step: Import into human evaluation interface")

if __name__ == "__main__":
    main()