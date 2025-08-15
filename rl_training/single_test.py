#!/usr/bin/env python3
"""Single test to generate one image for evaluation"""

import requests
import base64
import io
from PIL import Image
import json
import time

print("Loading test image...")
with Image.open("../test-image.png") as img:
    img = img.convert('RGB').resize((512, 512))
    buffered = io.BytesIO()
    img.save(buffered, format="PNG")
    img_base64 = base64.b64encode(buffered.getvalue()).decode('utf-8')

print("Testing Classic Portrait with denoising=0.65...")

payload = {
    "init_images": [img_base64],
    "prompt": "exact same subject, thick Renaissance oil painting, classical brushwork",
    "negative_prompt": "different animal, changed species, photograph",
    "denoising_strength": 0.65,
    "cfg_scale": 9.0,
    "steps": 20,  # Reduced steps for faster test
    "sampler_name": "DPM++ 2M Karras",
    "width": 512,
    "height": 512,
    "seed": 12345
}

try:
    print("Sending request to SD API...")
    start = time.time()
    response = requests.post("http://localhost:7860/sdapi/v1/img2img", json=payload, timeout=120)
    elapsed = time.time() - start
    
    if response.status_code == 200:
        result = response.json()
        if result.get("images"):
            # Save result
            result_img = Image.open(io.BytesIO(base64.b64decode(result["images"][0])))
            filename = "single_test_result.png"
            result_img.save(filename)
            print(f"✅ Success! Image saved to {filename} (took {elapsed:.1f}s)")
            print(f"Parameters used: denoising=0.65, cfg=9.0, steps=20")
        else:
            print("❌ No images in response")
    else:
        print(f"❌ API returned {response.status_code}")
        print(response.text[:500])
except Exception as e:
    print(f"❌ Error: {e}")

print("\nTest complete!")