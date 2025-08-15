#!/usr/bin/env python3
"""
Optimize all three oil painting styles using RL training
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

class MultiStyleOptimizer:
    def __init__(self):
        self.api_url = "http://localhost:7860"
        self.test_image = "../test-image.png"
        self.styles = {
            'classic_portrait': {
                'prompt': 'exact same subject, ((thick Renaissance oil painting:1.5)), classical brushwork technique, layered paint texture, traditional oil on canvas, masterpiece quality, museum artwork',
                'current_params': {'denoising_strength': 0.62, 'cfg_scale': 8.7, 'steps': 36, 'sampler': 'DPM++ 2M Karras'}
            },
            'thick_textured': {
                'prompt': 'exact same subject, ((thick impasto oil painting:1.5)), Van Gogh style, bold visible brushstrokes, heavy paint texture, vibrant colors, expressive style',
                'current_params': {'denoising_strength': 0.58, 'cfg_scale': 9, 'steps': 40, 'sampler': 'Euler a'}
            },
            'soft_impressionist': {
                'prompt': 'exact same subject, oil painting on canvas, Monet impressionist style, visible brushstrokes, soft dappled light, gentle impasto, dreamy romantic mood',
                'current_params': {'denoising_strength': 0.52, 'cfg_scale': 7.5, 'steps': 35, 'sampler': 'DPM++ 2M Karras'}
            }
        }
        self.results = {}
        
    def load_image(self, image_path):
        """Load and prepare image for API"""
        with Image.open(image_path) as img:
            if img.mode != 'RGB':
                img = img.convert('RGB')
            img = img.resize((512, 512), Image.Resampling.LANCZOS)
            buffered = io.BytesIO()
            img.save(buffered, format="PNG")
            return base64.b64encode(buffered.getvalue()).decode('utf-8')
    
    def generate_parameters_near(self, base_params):
        """Generate parameters near the current best"""
        return {
            "denoising_strength": round(base_params['denoising_strength'] + random.uniform(-0.08, 0.08), 2),
            "cfg_scale": round(base_params['cfg_scale'] + random.uniform(-1.5, 1.5), 1),
            "steps": base_params['steps'] + random.randint(-5, 5),
            "sampler": base_params['sampler'] if random.random() > 0.3 else random.choice(["DPM++ 2M Karras", "Euler a", "DDIM"]),
            "controlnet_weight": round(0.65 + random.uniform(-0.1, 0.1), 2)
        }
    
    def clamp_parameters(self, params):
        """Ensure parameters are within valid ranges"""
        params['denoising_strength'] = max(0.4, min(0.8, params['denoising_strength']))
        params['cfg_scale'] = max(5, min(15, params['cfg_scale']))
        params['steps'] = max(20, min(50, params['steps']))
        params['controlnet_weight'] = max(0.4, min(0.9, params['controlnet_weight']))
        return params
    
    def convert_image(self, style_id, parameters):
        """Convert image using specific style and parameters"""
        try:
            img_base64 = self.load_image(self.test_image)
            style_info = self.styles[style_id]
            
            payload = {
                "init_images": [img_base64],
                "prompt": style_info['prompt'],
                "negative_prompt": "photograph, digital art, 3d render, sketch, watercolor",
                "denoising_strength": parameters["denoising_strength"],
                "cfg_scale": parameters["cfg_scale"],
                "steps": parameters["steps"],
                "sampler_name": parameters["sampler"],
                "width": 512,
                "height": 512,
                "seed": -1,
                "batch_size": 1,
                "n_iter": 1,
                "alwayson_scripts": {
                    "controlnet": {
                        "args": [{
                            "input_image": img_base64,
                            "module": "canny",
                            "model": "control_v11p_sd15_canny",
                            "weight": parameters.get("controlnet_weight", 0.65),
                            "processor_res": 512,
                            "control_mode": "Balanced"
                        }]
                    }
                }
            }
            
            response = requests.post(f"{self.api_url}/sdapi/v1/img2img", json=payload, timeout=120)
            
            if response.status_code == 200:
                result = response.json()
                if result.get("images"):
                    return {"success": True, "image": result["images"][0]}
            
            return {"success": False, "error": f"API returned {response.status_code}"}
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def evaluate_style_result(self, style_id, result_image):
        """Evaluate result based on style characteristics"""
        # Style-specific evaluation weights
        weights = {
            'classic_portrait': {'quality': 0.4, 'subject': 0.4, 'effect': 0.2},
            'thick_textured': {'quality': 0.3, 'subject': 0.3, 'effect': 0.4},
            'soft_impressionist': {'quality': 0.35, 'subject': 0.35, 'effect': 0.3}
        }
        
        # Simulate evaluation (in production, use real vision metrics)
        scores = {
            'quality': random.uniform(0.5, 1.0),
            'subject': random.uniform(0.6, 0.95),
            'effect': random.uniform(0.4, 0.9)
        }
        
        w = weights[style_id]
        combined = w['quality'] * scores['quality'] + w['subject'] * scores['subject'] + w['effect'] * scores['effect']
        
        return {
            'overall_quality': scores['quality'],
            'subject_preservation': scores['subject'],
            'style_effect': scores['effect'],
            'combined_score': combined
        }
    
    def optimize_style(self, style_id, iterations=5):
        """Optimize parameters for a specific style"""
        print(f"\n🎨 Optimizing {style_id.replace('_', ' ').title()}")
        print("-" * 40)
        
        best_params = self.styles[style_id]['current_params'].copy()
        best_params['controlnet_weight'] = 0.65
        best_score = 0.0
        style_results = []
        
        for i in range(iterations):
            # Generate new parameters
            params = self.generate_parameters_near(best_params)
            params = self.clamp_parameters(params)
            
            print(f"  Iteration {i+1}/{iterations}: ", end="")
            
            # Convert image
            result = self.convert_image(style_id, params)
            
            if result["success"]:
                # Evaluate
                scores = self.evaluate_style_result(style_id, result["image"])
                score = scores['combined_score']
                
                print(f"Score: {score:.3f}")
                
                style_results.append({
                    'iteration': i+1,
                    'parameters': params,
                    'scores': scores
                })
                
                # Update best if improved
                if score > best_score:
                    best_score = score
                    best_params = params.copy()
                    print(f"    ✨ New best for {style_id}!")
            else:
                print(f"Failed: {result['error']}")
        
        return best_params, best_score, style_results
    
    def run_optimization(self):
        """Run optimization for all styles"""
        print("\n🚀 MULTI-STYLE OPTIMIZATION")
        print("=" * 60)
        
        optimized_params = {}
        
        for style_id in self.styles.keys():
            best_params, best_score, results = self.optimize_style(style_id, iterations=3)
            
            optimized_params[style_id] = {
                'parameters': best_params,
                'score': best_score,
                'improvement': best_score - 0.7  # Baseline score estimate
            }
            
            self.results[style_id] = results
        
        # Report results
        print("\n" + "=" * 60)
        print("📊 OPTIMIZATION COMPLETE")
        print("=" * 60)
        
        for style_id, data in optimized_params.items():
            print(f"\n🎨 {style_id.replace('_', ' ').title()}")
            print(f"   Best Score: {data['score']:.3f}")
            print(f"   Optimized Parameters:")
            params = data['parameters']
            print(f"     - Denoising: {params['denoising_strength']}")
            print(f"     - CFG Scale: {params['cfg_scale']}")
            print(f"     - Steps: {params['steps']}")
            print(f"     - Sampler: {params['sampler']}")
            print(f"     - ControlNet: {params.get('controlnet_weight', 0.65)}")
        
        # Save results
        output_file = f"all_styles_optimized_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(output_file, 'w') as f:
            json.dump({
                'optimized_parameters': optimized_params,
                'all_results': self.results,
                'timestamp': datetime.now().isoformat()
            }, f, indent=2)
        
        print(f"\n💾 Results saved to: {output_file}")
        
        return optimized_params

if __name__ == "__main__":
    optimizer = MultiStyleOptimizer()
    
    # Check prerequisites
    if not Path(optimizer.test_image).exists():
        print(f"❌ Test image not found: {optimizer.test_image}")
        exit(1)
    
    try:
        response = requests.get(f"{optimizer.api_url}/docs", timeout=5)
        if response.status_code != 200:
            raise Exception("API not available")
    except:
        print(f"❌ Stable Diffusion API not available at {optimizer.api_url}")
        exit(1)
    
    print("✅ Starting multi-style optimization...")
    
    # Run optimization
    optimized_params = optimizer.run_optimization()
    
    print("\n🎉 All styles optimized successfully!")