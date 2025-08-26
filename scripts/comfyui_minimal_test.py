#!/usr/bin/env python3
"""
Minimal ComfyUI Test Script
Process test images with ComfyUI oil painting styles without websocket dependency
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
OUTPUT_DIR = "comfyui_evaluation_results"
STYLES_TO_TEST = ["classic_portrait", "soft_impressionist", "thick_textured"]

# ComfyUI Oil Painting Styles (updated with correct sampler names)
COMFYUI_STYLES = {
    "classic_portrait": {
        "checkpoint": "v1-5-pruned-emaonly.safetensors",
        "positive_prompt": "oil painting, classical renaissance style, smooth brushwork, refined details, warm lighting, professional portrait style, artistic masterpiece, high quality, detailed",
        "negative_prompt": "photograph, digital art, low quality, blurry, distorted, anime, cartoon, rough brushwork, modern art, abstract",
        "steps": 30,
        "cfg": 6.5,
        "denoise": 0.65,
        "sampler": "dpmpp_2m",
        "scheduler": "karras"
    },
    "soft_impressionist": {
        "checkpoint": "v1-5-pruned-emaonly.safetensors", 
        "positive_prompt": "oil painting, impressionist style, soft brushstrokes, dreamy atmosphere, gentle colors, artistic interpretation, painterly effect, luminous, ethereal",
        "negative_prompt": "photograph, digital art, sharp details, harsh lighting, cartoon, anime, low quality, blurry, modern digital art",
        "steps": 28,
        "cfg": 7.0,
        "denoise": 0.70,
        "sampler": "euler_ancestral",
        "scheduler": "normal"
    },
    "thick_textured": {
        "checkpoint": "v1-5-pruned-emaonly.safetensors",
        "positive_prompt": "oil painting, heavy impasto technique, thick visible brushstrokes, textured paint, bold artistic style, expressive, palette knife work, chunky paint application",
        "negative_prompt": "photograph, smooth painting, digital art, flat colors, cartoon, anime, low quality, blurry, minimal texture",
        "steps": 35,
        "cfg": 8.0,
        "denoise": 0.75,
        "sampler": "dpmpp_sde", 
        "scheduler": "karras"
    }
}

class MinimalComfyUIProcessor:
    def __init__(self):
        self.client_id = str(random.randint(100000, 999999))
        
    def check_comfyui_status(self) -> bool:
        """Check if ComfyUI is running"""
        try:
            response = requests.get(f"{COMFYUI_URL}/system_stats", timeout=5)
            if response.status_code == 200:
                print("✅ ComfyUI is running")
                return True
            else:
                print(f"❌ ComfyUI returned status: {response.status_code}")
                return False
        except Exception as e:
            print(f"❌ Cannot connect to ComfyUI: {e}")
            return False
    
    def upload_image(self, image_path: str) -> str:
        """Upload image to ComfyUI and return filename"""
        try:
            with open(image_path, 'rb') as f:
                files = {'image': f}
                response = requests.post(f"{COMFYUI_URL}/upload/image", files=files)
                if response.status_code == 200:
                    result = response.json()
                    filename = result.get('name')
                    print(f"📤 Uploaded image: {filename}")
                    return filename
                else:
                    raise Exception(f"Upload failed: {response.status_code} - {response.text}")
        except Exception as e:
            raise Exception(f"Failed to upload image {image_path}: {e}")

    def create_simple_workflow(self, image_filename: str, style_config: dict) -> dict:
        """Create a simple ComfyUI workflow for img2img oil painting"""
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
                    "pixels": ["10", 0],
                    "vae": ["4", 2]
                },
                "class_type": "VAEEncode"
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
                    "image": image_filename
                },
                "class_type": "LoadImage"
            }
        }
        
        return workflow
    
    def queue_prompt(self, workflow: dict) -> str:
        """Queue a prompt and return prompt ID"""
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
            raise Exception(f"Failed to queue prompt: {response.status_code} - {response.text}")
    
    def wait_for_completion(self, prompt_id: str, timeout: int = 120) -> str:
        """Wait for completion and return result"""
        start_time = time.time()
        
        while time.time() - start_time < timeout:
            try:
                response = requests.get(f"{COMFYUI_URL}/history/{prompt_id}")
                if response.status_code == 200:
                    history = response.json()
                    if prompt_id in history:
                        outputs = history[prompt_id]["outputs"]
                        if "9" in outputs and "images" in outputs["9"]:
                            image_data = outputs["9"]["images"][0]
                            image_filename = image_data["filename"]
                            
                            # Download the result image
                            img_response = requests.get(f"{COMFYUI_URL}/view?filename={image_filename}")
                            if img_response.status_code == 200:
                                image_base64 = base64.b64encode(img_response.content).decode('utf-8')
                                return f"data:image/png;base64,{image_base64}"
                
                print(f"⏳ Waiting for completion... ({int(time.time() - start_time)}s)")
                time.sleep(3)
                
            except Exception as e:
                print(f"⚠️ Error checking completion: {e}")
                time.sleep(3)
        
        raise TimeoutError(f"Prompt {prompt_id} did not complete within {timeout} seconds")
    
    def convert_image(self, image_path: str, style_name: str) -> dict:
        """Convert a single image"""
        print(f"🎨 Converting {image_path} with {style_name}")
        
        style_config = COMFYUI_STYLES[style_name]
        
        try:
            start_time = time.time()
            
            # Upload image to ComfyUI
            image_filename = self.upload_image(image_path)
            
            # Create and queue workflow
            workflow = self.create_simple_workflow(image_filename, style_config)
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

def main():
    """Process test images with ComfyUI"""
    print("🎨 ComfyUI Minimal Test Processing")
    print("=" * 40)
    
    # Create output directory
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    # Check ComfyUI
    processor = MinimalComfyUIProcessor()
    if not processor.check_comfyui_status():
        print("❌ ComfyUI is not accessible")
        return
    
    # Get test images
    test_images = list(Path("test_images_comfyui").glob("*.jpg")) + list(Path("test_images_comfyui").glob("*.png"))
    print(f"📁 Found {len(test_images)} test images")
    
    if len(test_images) == 0:
        print("❌ No test images found")
        return
    
    # Process each image with each style
    results = []
    total_tasks = len(test_images) * len(STYLES_TO_TEST)
    completed_tasks = 0
    successful_conversions = 0
    
    for image_path in test_images:
        image_name = image_path.stem
        
        for style_name in STYLES_TO_TEST:
            completed_tasks += 1
            print(f"\n📊 Progress: {completed_tasks}/{total_tasks}")
            
            result = processor.convert_image(str(image_path), style_name)
            
            # Add metadata
            result.update({
                "original_image": str(image_path),
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
                successful_conversions += 1
                image_output_file = os.path.join(OUTPUT_DIR, f"{image_name}_{style_name}_comfyui.png")
                if result["image"].startswith("data:image"):
                    image_data = base64.b64decode(result["image"].split(",")[1])
                    with open(image_output_file, 'wb') as f:
                        f.write(image_data)
                    print(f"💾 Saved: {image_output_file}")
    
    # Create evaluation dataset
    evaluation_dataset = {
        "experiment_info": {
            "backend": "comfyui",
            "styles_tested": STYLES_TO_TEST,
            "total_images": len(test_images),
            "total_conversions": len(results),
            "successful_conversions": successful_conversions,
            "timestamp": time.time()
        },
        "tasks": []
    }
    
    # Group results by image
    image_groups = {}
    for result in results:
        image_name = result["image_name"]
        if image_name not in image_groups:
            image_groups[image_name] = {}
        image_groups[image_name][result["style"]] = result
    
    # Create evaluation tasks
    task_id = 1
    for image_name, styles in image_groups.items():
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
            evaluation_dataset["tasks"].append(task)
            task_id += 1
    
    # Save evaluation dataset
    eval_file = os.path.join(OUTPUT_DIR, "comfyui_evaluation_dataset.json")
    with open(eval_file, 'w') as f:
        json.dump(evaluation_dataset, f, indent=2)
    
    # Summary
    print(f"\n✅ Processing complete!")
    print(f"📊 Results: {successful_conversions}/{len(results)} successful conversions")
    print(f"📁 Output: {OUTPUT_DIR}")
    print(f"📋 Dataset: {eval_file}")
    print(f"🌐 Ready for evaluation at: http://localhost:3000/comfyui-evaluation")

if __name__ == "__main__":
    main()