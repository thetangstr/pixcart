#!/usr/bin/env python3
"""Generate comparison images with different parameters for evaluation"""

import requests
import base64
import io
from PIL import Image
import json
import time

print("Parameter Comparison Test for Classic Portrait Style")
print("=" * 60)

# Load test image
with Image.open("../test-image.png") as img:
    img = img.convert('RGB').resize((512, 512))
    buffered = io.BytesIO()
    img.save(buffered, format="PNG")
    img_base64 = base64.b64encode(buffered.getvalue()).decode('utf-8')

# Different parameter sets to test
test_configs = [
    {
        "name": "current_production",
        "denoising": 0.65,
        "cfg": 9.0,
        "steps": 30,
        "controlnet": 0.65,
        "description": "Current production settings"
    },
    {
        "name": "lower_denoising",
        "denoising": 0.55,
        "cfg": 9.0,
        "steps": 30,
        "controlnet": 0.65,
        "description": "Lower denoising for more preservation"
    },
    {
        "name": "higher_denoising",
        "denoising": 0.75,
        "cfg": 9.0,
        "steps": 30,
        "controlnet": 0.65,
        "description": "Higher denoising for more effect"
    },
    {
        "name": "stronger_controlnet",
        "denoising": 0.65,
        "cfg": 9.0,
        "steps": 30,
        "controlnet": 0.80,
        "description": "Stronger ControlNet for better preservation"
    },
    {
        "name": "balanced_new",
        "denoising": 0.60,
        "cfg": 8.5,
        "steps": 35,
        "controlnet": 0.70,
        "description": "Balanced approach with slight adjustments"
    }
]

results = []

for i, config in enumerate(test_configs, 1):
    print(f"\n[{i}/{len(test_configs)}] Testing: {config['name']}")
    print(f"    {config['description']}")
    print(f"    Parameters: denoising={config['denoising']}, cfg={config['cfg']}, controlnet={config['controlnet']}")
    
    payload = {
        "init_images": [img_base64],
        "prompt": "exact same subject, ((thick Renaissance oil painting:1.5)), classical brushwork technique, layered paint texture, traditional oil on canvas, masterpiece quality, museum artwork",
        "negative_prompt": "different animal, monkey, dog, human, changed species, photograph, digital, smooth, 3d render",
        "denoising_strength": config["denoising"],
        "cfg_scale": config["cfg"],
        "steps": config["steps"],
        "sampler_name": "DPM++ 2M Karras",
        "width": 512,
        "height": 512,
        "seed": 42,  # Fixed seed for consistency
        "alwayson_scripts": {
            "controlnet": {
                "args": [{
                    "image": img_base64,
                    "module": "canny",
                    "model": "control_v11p_sd15_canny",
                    "weight": config["controlnet"],
                    "processor_res": 512,
                    "guidance_start": 0.0,
                    "guidance_end": 1.0,
                    "control_mode": "Balanced"
                }]
            }
        }
    }
    
    try:
        start = time.time()
        response = requests.post("http://localhost:7860/sdapi/v1/img2img", json=payload, timeout=120)
        elapsed = time.time() - start
        
        if response.status_code == 200:
            result = response.json()
            if result.get("images"):
                # Save result
                result_img = Image.open(io.BytesIO(base64.b64decode(result["images"][0])))
                filename = f"compare_{config['name']}.png"
                result_img.save(filename)
                print(f"    ✅ Saved to {filename} (took {elapsed:.1f}s)")
                
                results.append({
                    "config": config,
                    "file": filename,
                    "time": elapsed,
                    "success": True
                })
        else:
            print(f"    ❌ API returned {response.status_code}")
    except Exception as e:
        print(f"    ❌ Error: {e}")

# Create comparison grid
if len(results) > 0:
    print("\n" + "=" * 60)
    print("Creating comparison grid...")
    
    # Load all result images
    images = []
    for r in results:
        img = Image.open(r["file"])
        # Add label
        images.append(img)
    
    # Create grid (2x3 layout)
    grid_width = 2
    grid_height = 3
    img_size = 512
    grid = Image.new('RGB', (img_size * grid_width, img_size * grid_height), 'white')
    
    for idx, img in enumerate(images[:6]):
        x = (idx % grid_width) * img_size
        y = (idx // grid_width) * img_size
        grid.paste(img, (x, y))
    
    grid.save("comparison_grid.png")
    print("✅ Comparison grid saved to comparison_grid.png")

# Save results summary
with open("comparison_results.json", "w") as f:
    json.dump({
        "test_configs": test_configs,
        "results": [{"config": r["config"], "file": r["file"], "time": r["time"]} for r in results]
    }, f, indent=2)

print("\n" + "=" * 60)
print(f"✅ Generated {len(results)} test images")
print("\nFiles created:")
for r in results:
    print(f"  - {r['file']}: {r['config']['description']}")
print("\nReady for evaluation!")