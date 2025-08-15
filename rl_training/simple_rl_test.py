#!/usr/bin/env python3
"""
Simple RL Training Test Script
Tests oil painting parameter optimization with direct API calls
"""

import json
import requests
import time
import random
import numpy as np
from pathlib import Path
from datetime import datetime
import base64
import io
from PIL import Image

class SimpleRLTrainer:
    def __init__(self):
        self.api_url = "http://localhost:7860"
        self.test_image = "../test-image.png"
        self.results = []
        
    def load_image(self, image_path):
        """Load and prepare image for API"""
        with Image.open(image_path) as img:
            # Convert to RGB if needed
            if img.mode != 'RGB':
                img = img.convert('RGB')
            
            # Resize to standard size
            img = img.resize((512, 512), Image.Resampling.LANCZOS)
            
            # Convert to base64
            buffered = io.BytesIO()
            img.save(buffered, format="PNG")
            img_base64 = base64.b64encode(buffered.getvalue()).decode('utf-8')
            
            return img_base64
    
    def generate_parameters(self):
        """Generate random parameters for exploration"""
        return {
            "denoising_strength": round(random.uniform(0.45, 0.75), 2),
            "cfg_scale": round(random.uniform(7.0, 12.0), 1),
            "steps": random.randint(30, 50),
            "sampler": random.choice(["DPM++ 2M Karras", "Euler a", "DDIM"]),
            "controlnet_weight": round(random.uniform(0.5, 0.8), 2)
        }
    
    def evaluate_result(self, original_image, result_image):
        """Simple evaluation of conversion quality"""
        # Random score for now (in real implementation, would use vision metrics)
        quality_score = random.uniform(0.5, 1.0)
        subject_preservation = random.uniform(0.6, 0.95)
        oil_painting_effect = random.uniform(0.4, 0.9)
        
        return {
            "overall_quality": quality_score,
            "subject_preservation": subject_preservation,
            "oil_painting_effect": oil_painting_effect,
            "combined_score": (quality_score * 0.4 + subject_preservation * 0.3 + oil_painting_effect * 0.3)
        }
    
    def convert_image(self, parameters):
        """Convert image using Stable Diffusion API"""
        try:
            img_base64 = self.load_image(self.test_image)
            
            # Prepare API request
            payload = {
                "init_images": [img_base64],
                "prompt": "exact same subject, ((thick Renaissance oil painting:1.5)), classical brushwork technique, layered paint texture, traditional oil on canvas, masterpiece quality, museum artwork, professional oil painting",
                "negative_prompt": "photo, photography, digital art, 3d render, sketch, watercolor, modern art, abstract",
                "denoising_strength": parameters["denoising_strength"],
                "cfg_scale": parameters["cfg_scale"],
                "steps": parameters["steps"],
                "sampler_name": parameters["sampler"],
                "width": 512,
                "height": 512,
                "seed": -1,
                "subseed": -1,
                "subseed_strength": 0,
                "seed_resize_from_h": -1,
                "seed_resize_from_w": -1,
                "batch_size": 1,
                "n_iter": 1,
                "restore_faces": False,
                "tiling": False,
                "do_not_save_samples": False,
                "do_not_save_grid": False,
                "eta": 0,
                "s_min_uncond": 0,
                "s_churn": 0,
                "s_tmax": 0,
                "s_tmin": 0,
                "s_noise": 1,
                "override_settings": {},
                "override_settings_restore_afterwards": True,
                "script_args": [],
                "include_init_images": False,
                "script_name": "",
                "send_images": True,
                "save_images": False,
                "alwayson_scripts": {}
            }
            
            # Add ControlNet if available
            if parameters.get("controlnet_weight"):
                payload["alwayson_scripts"]["controlnet"] = {
                    "args": [
                        {
                            "input_image": img_base64,
                            "module": "canny",
                            "model": "control_v11p_sd15_canny",
                            "weight": parameters["controlnet_weight"],
                            "processor_res": 512,
                            "guidance_start": 0.0,
                            "guidance_end": 1.0,
                            "control_mode": "Balanced",
                            "pixel_perfect": False
                        }
                    ]
                }
            
            # Make API request
            response = requests.post(
                f"{self.api_url}/sdapi/v1/img2img",
                json=payload,
                timeout=120
            )
            
            if response.status_code == 200:
                result = response.json()
                if result.get("images"):
                    return {
                        "success": True,
                        "image": result["images"][0]
                    }
            
            return {"success": False, "error": f"API returned {response.status_code}"}
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def run_training(self, iterations=10):
        """Run training iterations"""
        print(f"\n🚀 Starting RL training with {iterations} iterations")
        print("=" * 60)
        
        best_params = None
        best_score = 0.0
        
        for i in range(iterations):
            print(f"\n📊 Iteration {i+1}/{iterations}")
            
            # Generate parameters
            params = self.generate_parameters()
            print(f"   Parameters: denoising={params['denoising_strength']}, cfg={params['cfg_scale']}, steps={params['steps']}")
            
            # Convert image
            start_time = time.time()
            result = self.convert_image(params)
            conversion_time = time.time() - start_time
            
            if result["success"]:
                # Evaluate result
                scores = self.evaluate_result(self.test_image, result["image"])
                combined_score = scores["combined_score"]
                
                print(f"   ✅ Success! Score: {combined_score:.3f} (time: {conversion_time:.1f}s)")
                print(f"      - Quality: {scores['overall_quality']:.3f}")
                print(f"      - Subject: {scores['subject_preservation']:.3f}")
                print(f"      - Oil Effect: {scores['oil_painting_effect']:.3f}")
                
                # Track results
                self.results.append({
                    "iteration": i+1,
                    "parameters": params,
                    "scores": scores,
                    "time": conversion_time
                })
                
                # Update best
                if combined_score > best_score:
                    best_score = combined_score
                    best_params = params.copy()
                    print(f"   🏆 New best score!")
            else:
                print(f"   ❌ Conversion failed: {result['error']}")
        
        # Report results
        print("\n" + "=" * 60)
        print("📈 TRAINING COMPLETED")
        print("=" * 60)
        
        if best_params:
            print(f"\n🏆 Best Parameters (Score: {best_score:.3f}):")
            print(f"   - Denoising Strength: {best_params['denoising_strength']}")
            print(f"   - CFG Scale: {best_params['cfg_scale']}")
            print(f"   - Steps: {best_params['steps']}")
            print(f"   - Sampler: {best_params['sampler']}")
            print(f"   - ControlNet Weight: {best_params['controlnet_weight']}")
            
            # Save results
            output_file = f"training_results_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
            with open(output_file, 'w') as f:
                json.dump({
                    "best_parameters": best_params,
                    "best_score": best_score,
                    "all_results": self.results
                }, f, indent=2)
            
            print(f"\n💾 Results saved to: {output_file}")
        else:
            print("\n❌ No successful conversions")
        
        return best_params, best_score

if __name__ == "__main__":
    trainer = SimpleRLTrainer()
    
    # Check if test image exists
    if not Path(trainer.test_image).exists():
        print(f"❌ Test image not found: {trainer.test_image}")
        exit(1)
    
    # Check API availability
    try:
        response = requests.get(f"{trainer.api_url}/docs", timeout=5)
        if response.status_code != 200:
            print(f"❌ Stable Diffusion API not available at {trainer.api_url}")
            exit(1)
    except:
        print(f"❌ Could not connect to Stable Diffusion API at {trainer.api_url}")
        exit(1)
    
    print("✅ API is available, starting training...")
    
    # Run training
    best_params, best_score = trainer.run_training(iterations=5)
    
    if best_params:
        print(f"\n🎉 Training successful! Best score: {best_score:.3f}")
    else:
        print("\n😞 Training failed - no successful conversions")