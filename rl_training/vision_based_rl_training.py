#!/usr/bin/env python3
"""
Vision-based RL Training using Claude's image analysis
Evaluates oil painting conversions with real computer vision metrics
"""

import json
import requests
import time
import random
import base64
import io
from pathlib import Path
from datetime import datetime
from PIL import Image
import os
import tempfile

class VisionBasedRLTrainer:
    def __init__(self):
        self.api_url = "http://localhost:7860"
        self.test_image = "../test-image.png"
        self.results = []
        self.temp_dir = tempfile.mkdtemp(prefix="rl_training_")
        print(f"Temporary directory for images: {self.temp_dir}")
        
    def load_image(self, image_path):
        """Load and prepare image for API"""
        with Image.open(image_path) as img:
            if img.mode != 'RGB':
                img = img.convert('RGB')
            img = img.resize((512, 512), Image.Resampling.LANCZOS)
            buffered = io.BytesIO()
            img.save(buffered, format="PNG")
            return base64.b64encode(buffered.getvalue()).decode('utf-8')
    
    def save_base64_image(self, base64_string, filename):
        """Save base64 image to file for evaluation"""
        img_data = base64.b64decode(base64_string)
        img = Image.open(io.BytesIO(img_data))
        filepath = os.path.join(self.temp_dir, filename)
        img.save(filepath)
        return filepath
    
    def generate_parameters(self, iteration, style_id='classic_portrait'):
        """Generate parameters for exploration"""
        # Start with baseline parameters
        baseline = {
            'classic_portrait': {
                'denoising_strength': 0.65,
                'cfg_scale': 9.0,
                'steps': 40,
                'sampler': 'DPM++ 2M Karras',
                'controlnet_weight': 0.65
            },
            'thick_textured': {
                'denoising_strength': 0.58,
                'cfg_scale': 9.0,
                'steps': 40,
                'sampler': 'Euler a',
                'controlnet_weight': 0.60
            },
            'soft_impressionist': {
                'denoising_strength': 0.52,
                'cfg_scale': 7.5,
                'steps': 35,
                'sampler': 'DPM++ 2M Karras',
                'controlnet_weight': 0.65
            }
        }
        
        base = baseline[style_id]
        
        # Vary parameters slightly for exploration
        variations = []
        
        # Iteration 1: baseline
        if iteration == 1:
            return base
        
        # Iteration 2: lower denoising
        elif iteration == 2:
            params = base.copy()
            params['denoising_strength'] = round(base['denoising_strength'] - 0.05, 2)
            return params
        
        # Iteration 3: higher denoising
        elif iteration == 3:
            params = base.copy()
            params['denoising_strength'] = round(base['denoising_strength'] + 0.05, 2)
            return params
        
        # Iteration 4: adjust CFG
        elif iteration == 4:
            params = base.copy()
            params['cfg_scale'] = base['cfg_scale'] - 1.5
            return params
        
        # Iteration 5: different sampler
        elif iteration == 5:
            params = base.copy()
            params['sampler'] = 'Euler a' if params['sampler'] != 'Euler a' else 'DDIM'
            return params
        
        # Default: small random variations
        else:
            return {
                "denoising_strength": round(base['denoising_strength'] + random.uniform(-0.08, 0.08), 2),
                "cfg_scale": round(base['cfg_scale'] + random.uniform(-2, 2), 1),
                "steps": base['steps'] + random.randint(-5, 5),
                "sampler": base['sampler'],
                "controlnet_weight": round(base['controlnet_weight'] + random.uniform(-0.1, 0.1), 2)
            }
    
    def clamp_parameters(self, params):
        """Ensure parameters are within valid ranges"""
        params['denoising_strength'] = max(0.3, min(0.85, params['denoising_strength']))
        params['cfg_scale'] = max(4, min(15, params['cfg_scale']))
        params['steps'] = max(20, min(60, params['steps']))
        params['controlnet_weight'] = max(0.3, min(1.0, params['controlnet_weight']))
        return params
    
    def convert_image(self, parameters, style_id='classic_portrait'):
        """Convert image using Stable Diffusion API"""
        try:
            img_base64 = self.load_image(self.test_image)
            
            # Style-specific prompts
            prompts = {
                'classic_portrait': 'exact same subject, ((thick Renaissance oil painting:1.5)), classical brushwork technique, layered paint texture, traditional oil on canvas, masterpiece quality, museum artwork, professional oil painting',
                'thick_textured': 'exact same subject, ((thick impasto oil painting:1.5)), Van Gogh style, bold visible brushstrokes, heavy paint texture, swirling dynamic strokes, vibrant colors, expressive energetic style',
                'soft_impressionist': 'exact same subject, oil painting on canvas, Monet impressionist style, visible brushstrokes, soft dappled light, gentle impasto, dreamy romantic mood, atmospheric lighting'
            }
            
            payload = {
                "init_images": [img_base64],
                "prompt": prompts[style_id],
                "negative_prompt": "different animal, changed species, photograph, digital art, 3d render, sketch, watercolor, modern art, abstract",
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
                            "weight": parameters["controlnet_weight"],
                            "processor_res": 512,
                            "guidance_start": 0.0,
                            "guidance_end": 1.0,
                            "control_mode": "Balanced",
                            "pixel_perfect": False
                        }]
                    }
                }
            }
            
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
    
    def prepare_evaluation_prompt(self, style_id):
        """Prepare evaluation prompt for Claude vision analysis"""
        style_criteria = {
            'classic_portrait': """
Please evaluate this oil painting conversion focusing on Renaissance portrait style:
1. Subject Preservation (0-10): Is the original subject (cat/dog) clearly recognizable? Has it changed species or features?
2. Oil Painting Authenticity (0-10): Does it look like a real Renaissance oil painting with proper brushwork and texture?
3. Style Correctness (0-10): Does it match Renaissance portrait style (smooth, refined, classical)?
4. Technical Quality (0-10): Are there artifacts, distortions, or quality issues?
5. Overall Success (0-10): How successful is this as an oil painting conversion?

Provide scores in JSON format: {"subject": X, "authenticity": X, "style": X, "quality": X, "overall": X}
Also note any issues like species changes, distortions, or style mismatches.
""",
            'thick_textured': """
Please evaluate this oil painting conversion focusing on Van Gogh thick impasto style:
1. Subject Preservation (0-10): Is the original subject clearly recognizable without species changes?
2. Texture Visibility (0-10): Are thick brushstrokes and paint texture clearly visible?
3. Style Energy (0-10): Does it have Van Gogh's dynamic, expressive energy?
4. Technical Quality (0-10): Overall image quality without artifacts?
5. Overall Success (0-10): Success as a thick textured oil painting?

Provide scores in JSON format: {"subject": X, "texture": X, "energy": X, "quality": X, "overall": X}
""",
            'soft_impressionist': """
Please evaluate this oil painting conversion focusing on Monet impressionist style:
1. Subject Preservation (0-10): Is the original subject recognizable?
2. Impressionist Effect (0-10): Soft edges, dappled light, atmospheric quality?
3. Brushwork (0-10): Visible but gentle brush strokes?
4. Technical Quality (0-10): Image quality without artifacts?
5. Overall Success (0-10): Success as impressionist painting?

Provide scores in JSON format: {"subject": X, "impression": X, "brushwork": X, "quality": X, "overall": X}
"""
        }
        return style_criteria.get(style_id, style_criteria['classic_portrait'])
    
    def create_evaluation_file(self, original_path, result_base64, iteration, params, style_id):
        """Create a file for Claude to evaluate"""
        # Save the result image
        result_path = self.save_base64_image(
            result_base64, 
            f"result_{style_id}_{iteration}.png"
        )
        
        # Create evaluation request file
        eval_file = os.path.join(self.temp_dir, f"evaluate_{style_id}_{iteration}.txt")
        
        eval_content = f"""EVALUATION REQUEST - Iteration {iteration}

Style: {style_id}
Parameters Used:
- Denoising: {params['denoising_strength']}
- CFG Scale: {params['cfg_scale']}
- Steps: {params['steps']}
- Sampler: {params['sampler']}
- ControlNet: {params['controlnet_weight']}

Original Image: {original_path}
Result Image: {result_path}

{self.prepare_evaluation_prompt(style_id)}

Please provide your evaluation of the result image.
"""
        
        with open(eval_file, 'w') as f:
            f.write(eval_content)
        
        print(f"\n📝 Evaluation request saved to: {eval_file}")
        print(f"🖼️  Result image saved to: {result_path}")
        
        return result_path, eval_file
    
    def run_training(self, style_id='classic_portrait', iterations=5):
        """Run training iterations for a specific style"""
        print(f"\n🚀 Starting Vision-Based RL Training for {style_id}")
        print("=" * 60)
        
        best_params = None
        best_score = 0.0
        
        for i in range(1, iterations + 1):
            print(f"\n📊 Iteration {i}/{iterations}")
            
            # Generate parameters
            params = self.generate_parameters(i, style_id)
            params = self.clamp_parameters(params)
            
            print(f"   Parameters: denoising={params['denoising_strength']}, cfg={params['cfg_scale']}, steps={params['steps']}")
            
            # Convert image
            start_time = time.time()
            result = self.convert_image(params, style_id)
            conversion_time = time.time() - start_time
            
            if result["success"]:
                print(f"   ✅ Conversion successful (time: {conversion_time:.1f}s)")
                
                # Save result for evaluation
                result_path, eval_file = self.create_evaluation_file(
                    self.test_image,
                    result["image"],
                    i,
                    params,
                    style_id
                )
                
                # Track results
                self.results.append({
                    "iteration": i,
                    "style": style_id,
                    "parameters": params,
                    "time": conversion_time,
                    "result_image": result_path,
                    "evaluation_file": eval_file
                })
                
                print(f"   ⏳ Ready for evaluation - check {result_path}")
                
            else:
                print(f"   ❌ Conversion failed: {result['error']}")
        
        # Save results
        output_file = f"vision_training_{style_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(output_file, 'w') as f:
            json.dump({
                "style": style_id,
                "iterations": iterations,
                "results": self.results,
                "temp_directory": self.temp_dir
            }, f, indent=2)
        
        print("\n" + "=" * 60)
        print(f"💾 Training complete! Results saved to: {output_file}")
        print(f"🖼️  Images saved in: {self.temp_dir}")
        print("\n📋 Next Steps:")
        print("1. Review the generated images in the temp directory")
        print("2. I can evaluate each image if you provide them to me")
        print("3. Based on evaluations, we'll identify the best parameters")
        
        return self.results

if __name__ == "__main__":
    trainer = VisionBasedRLTrainer()
    
    # Check if test image exists
    if not Path(trainer.test_image).exists():
        print(f"❌ Test image not found: {trainer.test_image}")
        exit(1)
    
    # Check API availability
    try:
        response = requests.get(f"{trainer.api_url}/docs", timeout=5)
        if response.status_code != 200:
            raise Exception("API not available")
    except:
        print(f"❌ Stable Diffusion API not available at {trainer.api_url}")
        exit(1)
    
    print("✅ API is available, starting vision-based training...")
    print("\nThis will generate images for Claude to evaluate.")
    print("After generation, I can analyze each result to find optimal parameters.\n")
    
    # Run training for classic portrait style
    results = trainer.run_training(style_id='classic_portrait', iterations=5)
    
    print("\n🎉 Image generation complete!")
    print("I can now evaluate each generated image to determine the best parameters.")