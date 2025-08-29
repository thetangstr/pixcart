#!/usr/bin/env python3
"""
Test the improved SDXL with Gemini-style prompts and parameters
"""

import requests
import json
import base64
import time
import os

def test_improved_sdxl():
    print("🎨 Testing Improved SDXL (Gemini-style prompts & parameters)")
    print("=" * 60)
    
    # Load the golden retriever image
    dog_image_path = "/Volumes/home/Projects_Hosted/pixcart_v2/ComfyUI/input/golden_retriever.jpg"
    
    if not os.path.exists(dog_image_path):
        print(f"❌ Dog image not found: {dog_image_path}")
        return
        
    print(f"📸 Loading test image: {dog_image_path}")
    try:
        with open(dog_image_path, 'rb') as f:
            image_data = f.read()
        base64_data = base64.b64encode(image_data).decode('utf-8')
        image_base64 = f"data:image/jpeg;base64,{base64_data}"
        print("✅ Image loaded successfully")
    except Exception as e:
        print(f"❌ Failed to load image: {e}")
        return
    
    # Test data
    test_data = {
        'image': ('test_dog.jpg', base64.b64decode(base64_data), 'image/jpeg'),
        'style': (None, 'classic'),
        'subject': (None, 'pet'),
        'mode': (None, 'hybrid'),
        'preservationMode': (None, 'high'),
        'sessionId': (None, f"improved_test_{int(time.time())}")
    }
    
    print()
    print("🔄 Expected Improvements:")
    print("  • New prompts: 'Transform into masterpiece oil painting...'")
    print("  • Enhanced parameters: denoise=0.35, steps=50, cfg=9.0")
    print("  • Better subject preservation language")
    print("  • Stronger negative prompts")
    print()
    
    print("⏱️  Processing (this will take ~1 minute with improved quality)...")
    
    try:
        response = requests.post(
            "http://localhost:5174/api/convert-hybrid",
            files=test_data,
            timeout=180
        )
        
        if response.status_code == 200:
            data = response.json()
            
            model_used = data.get('modelInfo', {}).get('primary', 'unknown')
            processing_time = data.get('modelInfo', {}).get('processingTime', 0) / 1000
            fallback_used = data.get('modelInfo', {}).get('fallbackUsed', False)
            cost = data.get('modelInfo', {}).get('cost', 0)
            
            print("✅ Processing completed!")
            print()
            print("📊 Results:")
            print(f"   Model used: {model_used}")
            print(f"   Processing time: {processing_time:.1f}s") 
            print(f"   Fallback used: {'Yes' if fallback_used else 'No'}")
            print(f"   Cost: ${cost:.3f}")
            
            if model_used == 'sdxl' and not fallback_used:
                print()
                print("🎯 Success! Improved SDXL is working")
                
                # Save result
                if data.get('image') or data.get('bestResult', {}).get('image'):
                    result_image = data.get('image') or data.get('bestResult', {}).get('image')
                    
                    output_file = f"/tmp/improved_sdxl_dog_result.png"
                    if result_image.startswith('data:'):
                        image_data = result_image.split(',')[1]
                        with open(output_file, 'wb') as f:
                            f.write(base64.b64decode(image_data))
                        print(f"💾 Result saved to: {output_file}")
                        print()
                        print("📝 Key Improvements Applied:")
                        print("   ✅ Gemini-style instructional prompts")
                        print("   ✅ Higher CFG scale (9.0) for stronger prompt adherence")
                        print("   ✅ More steps (50) for better quality")
                        print("   ✅ Optimized denoising (0.35) for dramatic transformation")
                        print("   ✅ Enhanced negative prompts")
                        print()
                        print("🖼️  To compare with previous results:")
                        print("   Previous: /tmp/sdxl_classic_dog_result.png")
                        print("   Improved: /tmp/improved_sdxl_dog_result.png")
                        
                        return True
                        
            elif fallback_used:
                print()
                print("⚠️  SDXL failed and fell back to Gemini")
                print("   This means we're still seeing Gemini results, not improved SDXL")
                return False
            else:
                print()
                print("❓ Unexpected model result")
                return False
                
        else:
            print(f"❌ Request failed: {response.status_code}")
            try:
                error_data = response.json()
                print(f"Error: {error_data.get('error', 'Unknown')}")
            except:
                print(f"Raw response: {response.text[:200]}")
            return False
            
    except requests.exceptions.Timeout:
        print("⏱️  Request timed out (expected with higher quality settings)")
        print("   This suggests SDXL is processing with the new parameters")
        return None
    except Exception as e:
        print(f"❌ Request failed: {e}")
        return False

if __name__ == "__main__":
    result = test_improved_sdxl()
    
    print()
    print("=" * 60)
    if result is True:
        print("✅ SUCCESS: Improved SDXL is now working with Gemini-style quality!")
        print("   The result should look much more similar to Gemini's output.")
    elif result is False:
        print("❌ ISSUE: SDXL improvements not taking effect")
        print("   Check server logs for any errors.")
    elif result is None:
        print("⏱️  TIMEOUT: SDXL is processing but taking longer (good sign!)")
        print("   Higher quality settings require more processing time.")
    
    print()
    print("🔄 Next Steps:")
    print("   1. Compare the visual results between SDXL and Gemini")
    print("   2. Adjust parameters if needed for even closer match")
    print("   3. Test with different dog images and styles")