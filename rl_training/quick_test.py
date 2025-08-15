#!/usr/bin/env python3
"""Quick test to generate images for Claude evaluation"""

import requests
import base64
import io
from PIL import Image
import json
import time

# Load test image
with Image.open("../test-image.png") as img:
    img = img.convert('RGB').resize((512, 512))
    buffered = io.BytesIO()
    img.save(buffered, format="PNG")
    img_base64 = base64.b64encode(buffered.getvalue()).decode('utf-8')

print("Testing 3 different parameter sets for Classic Portrait...")

# Test different parameters
test_params = [
    {"name": "baseline", "denoising": 0.65, "cfg": 9.0, "steps": 40},
    {"name": "lower_denoise", "denoising": 0.60, "cfg": 9.0, "steps": 40},
    {"name": "higher_denoise", "denoising": 0.70, "cfg": 9.0, "steps": 40}
]

results = []

for test in test_params:
    print(f"\nTesting {test['name']}: denoising={test['denoising']}")
    
    payload = {
        "init_images": [img_base64],
        "prompt": "exact same subject, ((thick Renaissance oil painting:1.5)), classical brushwork technique, layered paint texture, traditional oil on canvas, masterpiece quality",
        "negative_prompt": "different animal, changed species, photograph, digital art",
        "denoising_strength": test["denoising"],
        "cfg_scale": test["cfg"],
        "steps": test["steps"],
        "sampler_name": "DPM++ 2M Karras",
        "width": 512,
        "height": 512,
        "seed": 12345,  # Fixed seed for consistency
        "alwayson_scripts": {
            "controlnet": {
                "args": [{
                    "input_image": img_base64,
                    "module": "canny",
                    "model": "control_v11p_sd15_canny",
                    "weight": 0.65,
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
                filename = f"test_{test['name']}.png"
                result_img.save(filename)
                print(f"✅ Saved to {filename} (took {elapsed:.1f}s)")
                results.append({
                    "name": test["name"],
                    "params": test,
                    "file": filename,
                    "success": True
                })
        else:
            print(f"❌ Failed: {response.status_code}")
    except Exception as e:
        print(f"❌ Error: {e}")

# Save results summary
with open("test_results.json", "w") as f:
    json.dump(results, f, indent=2)

print(f"\n✅ Generated {len(results)} test images for evaluation")
print("Files created:")
for r in results:
    print(f"  - {r['file']}: denoising={r['params']['denoising']}")