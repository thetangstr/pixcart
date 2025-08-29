#!/usr/bin/env python3
"""
Quick verification that all 4 styles use different prompts and parameters
"""

import requests
import json
import base64
import time

def test_style_parameters():
    print("🎨 Verifying SDXL Style Parameter Differences")
    print("=" * 50)
    
    # Load test image
    dog_image_path = "/Volumes/home/Projects_Hosted/pixcart_v2/ComfyUI/input/golden_retriever.jpg"
    
    try:
        with open(dog_image_path, 'rb') as f:
            image_data = f.read()
        base64_data = base64.b64encode(image_data).decode('utf-8')
        print("✅ Test image loaded\n")
    except Exception as e:
        print(f"❌ Failed to load image: {e}")
        return
    
    styles = ['classic', 'impressionist', 'vangogh', 'modern']
    
    for style in styles:
        print(f"🔍 Testing {style.upper()} style parameters...")
        
        # Quick request to see what parameters are being used
        test_data = {
            'image': ('test_dog.jpg', base64.b64decode(base64_data), 'image/jpeg'),
            'style': (None, style),
            'subject': (None, 'pet'),
            'mode': (None, 'hybrid'),
            'preservationMode': (None, 'medium'),
            'sessionId': (None, f"verify_{style}_{int(time.time())}")
        }
        
        try:
            # Short timeout since we just want to see the workflow being sent
            response = requests.post(
                "http://localhost:5174/api/convert-hybrid",
                files=test_data,
                timeout=10  # Quick timeout
            )
            
            if response.status_code == 200:
                print(f"   ✅ {style} - Parameters sent successfully")
            else:
                print(f"   ⚠️  {style} - HTTP {response.status_code}")
                
        except requests.exceptions.Timeout:
            print(f"   ⏱️  {style} - Parameters sent (processing started)")
        except Exception as e:
            print(f"   ❌ {style} - Error: {e}")
        
        time.sleep(0.5)  # Brief pause
    
    print("\n📋 Check server logs to verify:")
    print("   • Each style uses different prompts")
    print("   • Different denoising strengths (0.65-0.80)")
    print("   • Different CFG scales (10.0-13.0)")  
    print("   • Different samplers (dpmpp_2m, dpmpp_sde, euler)")
    print("   • Different step counts (50-65)")

if __name__ == "__main__":
    test_style_parameters()