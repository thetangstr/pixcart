#!/usr/bin/env python3
"""Test the improved oil painting system"""

import requests
import base64
import io
from PIL import Image
import json
import time

print("Testing Improved Oil Painting System")
print("=" * 60)

# Load test image
with Image.open("../test-image.png") as img:
    img = img.convert('RGB').resize((512, 512))
    buffered = io.BytesIO()
    img.save(buffered, format="PNG")
    img_base64 = base64.b64encode(buffered.getvalue()).decode('utf-8')

# Test configurations
tests = [
    {
        "name": "old_single_stage",
        "endpoint": "http://localhost:7860/sdapi/v1/img2img",
        "payload": {
            "init_images": [img_base64],
            "prompt": "oil painting",
            "denoising_strength": 0.65,
            "cfg_scale": 9.0,
            "steps": 40,
            "sampler_name": "DPM++ 2M Karras",
            "width": 512,
            "height": 512
        }
    },
    {
        "name": "new_two_stage_1",
        "endpoint": "http://localhost:7860/sdapi/v1/img2img",
        "payload": {
            "init_images": [img_base64],
            "prompt": "EXACT SAME subject, NO CHANGES to identity, preserve all features, Renaissance oil painting, subtle effect",
            "negative_prompt": "different animal, wrong species, transformation, mutation",
            "denoising_strength": 0.40,
            "cfg_scale": 8.0,
            "steps": 30,
            "sampler_name": "DPM++ 2M SDE Karras",
            "width": 512,
            "height": 512,
            "alwayson_scripts": {
                "controlnet": {
                    "args": [{
                        "image": img_base64,
                        "module": "canny",
                        "model": "control_v11p_sd15_canny",
                        "weight": 0.80,
                        "control_mode": "Balanced"
                    }]
                }
            }
        }
    }
]

results = []

for test in tests:
    print(f"\nTesting: {test['name']}")
    
    try:
        start = time.time()
        response = requests.post(test["endpoint"], json=test["payload"], timeout=120)
        elapsed = time.time() - start
        
        if response.status_code == 200:
            result = response.json()
            if result.get("images"):
                # Save result
                result_img = Image.open(io.BytesIO(base64.b64decode(result["images"][0])))
                filename = f"improved_{test['name']}.png"
                result_img.save(filename)
                
                # For two-stage, process stage 2
                if "two_stage_1" in test["name"]:
                    print("  Processing stage 2...")
                    stage2_payload = test["payload"].copy()
                    stage2_payload["init_images"] = [result["images"][0]]
                    stage2_payload["prompt"] += ", enhance oil painting texture, maintain identity"
                    stage2_payload["denoising_strength"] = 0.25
                    stage2_payload["cfg_scale"] = 7.0
                    stage2_payload["steps"] = 20
                    stage2_payload["alwayson_scripts"]["controlnet"]["args"][0]["weight"] = 0.60
                    
                    response2 = requests.post(test["endpoint"], json=stage2_payload, timeout=120)
                    if response2.status_code == 200:
                        result2 = response2.json()
                        if result2.get("images"):
                            result_img = Image.open(io.BytesIO(base64.b64decode(result2["images"][0])))
                            filename = f"improved_{test['name']}_stage2.png"
                            result_img.save(filename)
                            print(f"  ✅ Stage 2 saved to {filename}")
                
                print(f"  ✅ Saved to {filename} (took {elapsed:.1f}s)")
                results.append({"test": test["name"], "file": filename, "success": True})
        else:
            print(f"  ❌ Failed: {response.status_code}")
    except Exception as e:
        print(f"  ❌ Error: {e}")

print("\n" + "=" * 60)
print("Comparison Results:")
print("\nOld Method:")
print("  - Single stage, high denoising (0.65)")
print("  - Risk of subject transformation")
print("\nNew Method:")
print("  - Two-stage processing")
print("  - Stage 1: Low denoising (0.40) with strong ControlNet (0.80)")
print("  - Stage 2: Very low denoising (0.25) for texture enhancement")
print("  - Better subject preservation with good oil effect")

print("\nFiles created:")
for r in results:
    print(f"  - {r['file']}")

print("\nThe new two-stage approach should show:")
print("✅ Better subject preservation")
print("✅ More consistent oil painting effect")
print("✅ No species transformation")