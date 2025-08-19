#!/usr/bin/env python3
"""
ComfyUI Pet Portrait Artistic Style Converter
Converts pet photos into 3 artistic styles:
1. Classic Oil Painting - Traditional Renaissance style
2. Monet Impressionist - Soft, dreamy water lily style
3. Van Gogh Post-Impressionist - Bold swirling brushstrokes
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
INPUT_DIR = "pet_portraits"
OUTPUT_DIR = "pet_art_results"

# Artistic Style Definitions
ARTISTIC_STYLES = {
    "classic_oil": {
        "name": "Classic Oil Painting",
        "checkpoint": "v1-5-pruned-emaonly.safetensors",
        "positive_prompt": (
            "classical oil painting, renaissance masterpiece, traditional portrait style, "
            "rich oil paint texture, fine art museum quality, old masters technique, "
            "glazing layers, warm undertones, chiaroscuro lighting, refined brushwork, "
            "baroque style, academic painting, pet portrait, highly detailed, professional artwork"
        ),
        "negative_prompt": (
            "photograph, digital art, modern art, abstract, cartoon, anime, watercolor, "
            "sketch, pencil drawing, low quality, blurry, distorted features"
        ),
        "steps": 35,
        "cfg": 7.5,
        "denoise": 0.55,
        "sampler": "dpmpp_2m",
        "scheduler": "karras"
    },
    
    "monet_impressionist": {
        "name": "Monet Impressionist Style",
        "checkpoint": "v1-5-pruned-emaonly.safetensors",
        "positive_prompt": (
            "Claude Monet painting style, impressionist masterpiece, soft brushstrokes, "
            "water lilies atmosphere, garden setting, dappled light, pastel colors, "
            "dreamy ethereal quality, loose painterly technique, plein air painting, "
            "broken color technique, light and atmosphere, french impressionism, "
            "pet portrait in Monet style, artistic interpretation, museum quality"
        ),
        "negative_prompt": (
            "photograph, sharp details, dark colors, geometric shapes, modern art, "
            "digital art, cartoon, hard edges, high contrast, photorealistic"
        ),
        "steps": 32,
        "cfg": 6.5,
        "denoise": 0.65,
        "sampler": "euler_ancestral",
        "scheduler": "normal"
    },
    
    "van_gogh": {
        "name": "Van Gogh Post-Impressionist",
        "checkpoint": "v1-5-pruned-emaonly.safetensors",
        "positive_prompt": (
            "Vincent Van Gogh painting style, post-impressionist masterpiece, "
            "bold swirling brushstrokes, thick impasto technique, vibrant colors, "
            "expressive paint application, starry night energy, dynamic movement, "
            "emotional intensity, visible brushwork, complementary colors, "
            "pet portrait in Van Gogh style, museum quality artwork, dramatic style"
        ),
        "negative_prompt": (
            "photograph, smooth painting, minimal texture, muted colors, realistic, "
            "digital art, watercolor, pencil sketch, low quality, blurry"
        ),
        "steps": 40,
        "cfg": 8.0,
        "denoise": 0.70,
        "sampler": "dpmpp_sde",
        "scheduler": "karras"
    }
}

class PetArtStyleConverter:
    def __init__(self):
        self.client_id = str(random.randint(100000, 999999))
        self.session = requests.Session()
        
    def check_comfyui_status(self) -> bool:
        """Check if ComfyUI is running"""
        try:
            response = self.session.get(f"{COMFYUI_URL}/system_stats", timeout=5)
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
                files = {'image': (os.path.basename(image_path), f, 'image/jpeg')}
                response = self.session.post(f"{COMFYUI_URL}/upload/image", files=files)
                
                if response.status_code == 200:
                    result = response.json()
                    filename = result.get('name', os.path.basename(image_path))
                    print(f"  📤 Uploaded: {filename}")
                    return filename
                else:
                    raise Exception(f"Upload failed: {response.status_code}")
        except Exception as e:
            raise Exception(f"Failed to upload {image_path}: {e}")
    
    def create_artistic_workflow(self, image_filename: str, style_config: dict) -> dict:
        """Create ComfyUI workflow for artistic style conversion"""
        workflow = {
            "1": {
                "inputs": {
                    "image": image_filename,
                    "upload": "image"
                },
                "class_type": "LoadImage",
                "_meta": {"title": "Load Pet Image"}
            },
            "2": {
                "inputs": {
                    "ckpt_name": style_config["checkpoint"]
                },
                "class_type": "CheckpointLoaderSimple",
                "_meta": {"title": "Load Model"}
            },
            "3": {
                "inputs": {
                    "text": style_config["positive_prompt"],
                    "clip": ["2", 1]
                },
                "class_type": "CLIPTextEncode",
                "_meta": {"title": "Positive Prompt"}
            },
            "4": {
                "inputs": {
                    "text": style_config["negative_prompt"],
                    "clip": ["2", 1]
                },
                "class_type": "CLIPTextEncode",
                "_meta": {"title": "Negative Prompt"}
            },
            "5": {
                "inputs": {
                    "pixels": ["1", 0],
                    "vae": ["2", 2]
                },
                "class_type": "VAEEncode",
                "_meta": {"title": "Encode Image"}
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
                "class_type": "KSampler",
                "_meta": {"title": "Artistic Sampling"}
            },
            "7": {
                "inputs": {
                    "samples": ["6", 0],
                    "vae": ["2", 2]
                },
                "class_type": "VAEDecode",
                "_meta": {"title": "Decode Image"}
            },
            "8": {
                "inputs": {
                    "filename_prefix": "pet_art",
                    "images": ["7", 0]
                },
                "class_type": "SaveImage",
                "_meta": {"title": "Save Artistic Result"}
            }
        }
        
        return workflow
    
    def queue_prompt(self, workflow: dict) -> str:
        """Queue a prompt and return prompt ID"""
        payload = {
            "prompt": workflow,
            "client_id": self.client_id
        }
        
        response = self.session.post(f"{COMFYUI_URL}/prompt", json=payload)
        if response.status_code == 200:
            result = response.json()
            return result.get("prompt_id")
        else:
            raise Exception(f"Failed to queue: {response.text}")
    
    def wait_for_completion(self, prompt_id: str, timeout: int = 120) -> str:
        """Wait for processing to complete and return result"""
        start_time = time.time()
        
        while time.time() - start_time < timeout:
            try:
                response = self.session.get(f"{COMFYUI_URL}/history/{prompt_id}")
                if response.status_code == 200:
                    history = response.json()
                    if prompt_id in history:
                        outputs = history[prompt_id].get("outputs", {})
                        if "8" in outputs and "images" in outputs["8"]:
                            image_data = outputs["8"]["images"][0]
                            image_filename = image_data["filename"]
                            
                            # Download the result
                            img_response = self.session.get(
                                f"{COMFYUI_URL}/view?filename={image_filename}"
                            )
                            if img_response.status_code == 200:
                                return base64.b64encode(img_response.content).decode('utf-8')
                
                time.sleep(2)
                
            except Exception as e:
                print(f"    ⚠️ Check error: {e}")
                time.sleep(3)
        
        raise TimeoutError(f"Processing timeout for {prompt_id}")
    
    def convert_pet_to_art(self, image_path: str, style_key: str) -> dict:
        """Convert a pet portrait to artistic style"""
        style_config = ARTISTIC_STYLES[style_key]
        print(f"  🎨 Applying {style_config['name']}...")
        
        try:
            start_time = time.time()
            
            # Upload image
            image_filename = self.upload_image(image_path)
            
            # Create and queue workflow
            workflow = self.create_artistic_workflow(image_filename, style_config)
            prompt_id = self.queue_prompt(workflow)
            print(f"    📝 Processing ID: {prompt_id}")
            
            # Wait for result
            result_base64 = self.wait_for_completion(prompt_id)
            processing_time = time.time() - start_time
            
            print(f"    ✅ Completed in {processing_time:.1f}s")
            
            return {
                "success": True,
                "style": style_key,
                "style_name": style_config["name"],
                "image_base64": result_base64,
                "processing_time": processing_time,
                "prompt_id": prompt_id
            }
            
        except Exception as e:
            print(f"    ❌ Failed: {e}")
            return {
                "success": False,
                "style": style_key,
                "style_name": style_config["name"],
                "error": str(e)
            }

def main():
    """Process all pet portraits with artistic styles"""
    print("🎨 Pet Portrait Artistic Style Converter")
    print("=" * 60)
    print("Styles: Classic Oil | Monet Impressionist | Van Gogh")
    print()
    
    # Create output directory
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    # Initialize converter
    converter = PetArtStyleConverter()
    if not converter.check_comfyui_status():
        print("❌ Please start ComfyUI first!")
        return
    
    # Get pet images
    pet_images = []
    for ext in ['*.jpg', '*.jpeg', '*.png']:
        pet_images.extend(Path(INPUT_DIR).glob(ext))
    
    if not pet_images:
        print(f"❌ No images found in {INPUT_DIR}/")
        print("   Please run download_pet_portraits.py first!")
        return
    
    print(f"📁 Found {len(pet_images)} pet portraits")
    print()
    
    # Process each image with each style
    all_results = []
    successful_conversions = 0
    total_conversions = len(pet_images) * len(ARTISTIC_STYLES)
    current_conversion = 0
    
    for image_path in pet_images[:10]:  # Limit to first 10 for demo
        image_name = image_path.stem
        print(f"\n🐾 Processing: {image_name}")
        print("-" * 40)
        
        image_results = {
            "original_image": str(image_path),
            "image_name": image_name,
            "conversions": []
        }
        
        for style_key in ARTISTIC_STYLES.keys():
            current_conversion += 1
            print(f"\n[{current_conversion}/{total_conversions}] ", end="")
            
            result = converter.convert_pet_to_art(str(image_path), style_key)
            
            if result["success"]:
                successful_conversions += 1
                
                # Save the converted image
                output_filename = f"{image_name}_{style_key}.png"
                output_path = os.path.join(OUTPUT_DIR, output_filename)
                
                image_data = base64.b64decode(result["image_base64"])
                with open(output_path, 'wb') as f:
                    f.write(image_data)
                
                image_results["conversions"].append({
                    "style": style_key,
                    "style_name": result["style_name"],
                    "output_file": output_filename,
                    "processing_time": result["processing_time"]
                })
            else:
                image_results["conversions"].append({
                    "style": style_key,
                    "style_name": result["style_name"],
                    "error": result.get("error", "Unknown error")
                })
        
        all_results.append(image_results)
    
    # Create evaluation dataset
    evaluation_dataset = {
        "experiment_info": {
            "backend": "comfyui",
            "styles": list(ARTISTIC_STYLES.keys()),
            "style_names": [s["name"] for s in ARTISTIC_STYLES.values()],
            "total_images": len(all_results),
            "successful_conversions": successful_conversions,
            "total_attempted": current_conversion,
            "timestamp": time.time()
        },
        "tasks": []
    }
    
    # Create evaluation tasks
    for idx, result in enumerate(all_results, 1):
        task = {
            "task_id": idx,
            "image_name": result["image_name"],
            "original_image": result["original_image"],
            "conversions": []
        }
        
        for conv in result["conversions"]:
            if "output_file" in conv:
                task["conversions"].append({
                    "style": conv["style"],
                    "style_name": conv["style_name"],
                    "backend": "comfyui",
                    "processing_time": conv["processing_time"],
                    "converted_image": f"/pet-art/{conv['output_file']}"
                })
        
        if task["conversions"]:
            evaluation_dataset["tasks"].append(task)
    
    # Save evaluation dataset
    dataset_file = os.path.join(OUTPUT_DIR, "pet_art_evaluation_dataset.json")
    with open(dataset_file, 'w') as f:
        json.dump(evaluation_dataset, f, indent=2)
    
    # Copy to comfyui_evaluation_results for the web interface
    import shutil
    eval_dir = "comfyui_evaluation_results"
    os.makedirs(eval_dir, exist_ok=True)
    shutil.copy(dataset_file, os.path.join(eval_dir, "comfyui_evaluation_dataset.json"))
    
    # Summary
    print("\n" + "=" * 60)
    print("✅ Artistic Conversion Complete!")
    print(f"📊 Success Rate: {successful_conversions}/{current_conversion} "
          f"({100*successful_conversions/current_conversion:.1f}%)")
    print(f"📁 Output: {OUTPUT_DIR}/")
    print(f"📋 Dataset: {dataset_file}")
    print(f"\n🌐 Ready for evaluation at: http://localhost:3002/comfyui-evaluation")

if __name__ == "__main__":
    main()