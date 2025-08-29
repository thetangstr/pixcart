#!/usr/bin/env python3
"""
Test improved SDXL vs Gemini with the same golden retriever image
"""

import requests
import json
import base64
import time
import os
from PIL import Image
import io

def load_test_image(image_path):
    """Load and encode image as base64"""
    try:
        with open(image_path, 'rb') as f:
            image_data = f.read()
            
        # Convert to base64
        base64_data = base64.b64encode(image_data).decode('utf-8')
        
        # Determine MIME type
        if image_path.lower().endswith('.jpg') or image_path.lower().endswith('.jpeg'):
            mime_type = 'image/jpeg'
        else:
            mime_type = 'image/png'
            
        return f"data:{mime_type};base64,{base64_data}"
    except Exception as e:
        print(f"Error loading image: {e}")
        return None

def test_model(image_base64, style, session_id_suffix, model_preference=None):
    """Test either SDXL or Gemini with the given image"""
    
    # Create unique session ID to control which model is used
    session_id = f"test_{model_preference}_{session_id_suffix}_{int(time.time())}"
    
    test_data = {
        'image': ('test_dog.jpg', base64.b64decode(image_base64.split(',')[1]), 'image/jpeg'),
        'style': (None, style),
        'subject': (None, 'pet'),  # Specify pet for better prompting
        'mode': (None, 'hybrid'),
        'preservationMode': (None, 'high'),
        'sessionId': (None, session_id)
    }
    
    try:
        print(f"   📤 Sending request to hybrid API...")
        response = requests.post(
            "http://localhost:5174/api/convert-hybrid",
            files=test_data,
            timeout=180  # 3 minutes - enough for either model
        )
        
        if response.status_code == 200:
            data = response.json()
            
            model_used = data.get('modelInfo', {}).get('primary', 'unknown')
            processing_time = data.get('modelInfo', {}).get('processingTime', 0) / 1000
            fallback_used = data.get('modelInfo', {}).get('fallbackUsed', False)
            cost = data.get('modelInfo', {}).get('cost', 0)
            
            print(f"   ✅ Success!")
            print(f"   Model used: {model_used}")
            print(f"   Processing time: {processing_time:.1f}s") 
            print(f"   Fallback used: {fallback_used}")
            print(f"   Cost: ${cost:.3f}")
            
            # Save the result if we got an image
            if data.get('image') or data.get('bestResult', {}).get('image'):
                result_image = data.get('image') or data.get('bestResult', {}).get('image')
                
                # Save to file for comparison
                output_file = f"/tmp/{model_used}_{style}_dog_result.png"
                if result_image.startswith('data:'):
                    image_data = result_image.split(',')[1]
                    with open(output_file, 'wb') as f:
                        f.write(base64.b64decode(image_data))
                    print(f"   💾 Saved result to: {output_file}")
                
            return {
                'success': True,
                'model': model_used,
                'processing_time': processing_time,
                'fallback_used': fallback_used,
                'cost': cost,
                'image': data.get('image') or data.get('bestResult', {}).get('image')
            }
        else:
            print(f"   ❌ Request failed: {response.status_code}")
            try:
                error_data = response.json()
                print(f"   Error: {error_data.get('error', 'Unknown')}")
            except:
                print(f"   Raw response: {response.text[:200]}")
            return {'success': False, 'error': f"HTTP {response.status_code}"}
            
    except requests.exceptions.Timeout:
        print(f"   ⏱️  Request timed out")
        return {'success': False, 'error': 'timeout'}
    except Exception as e:
        print(f"   ❌ Request failed: {e}")
        return {'success': False, 'error': str(e)}

def main():
    print("🎨 SDXL vs Gemini Comparison Test")
    print("=" * 50)
    
    # Load the golden retriever image
    dog_image_path = "/Volumes/home/Projects_Hosted/pixcart_v2/ComfyUI/input/golden_retriever.jpg"
    
    if not os.path.exists(dog_image_path):
        print(f"❌ Dog image not found: {dog_image_path}")
        return
        
    print(f"📸 Loading test image: {dog_image_path}")
    image_base64 = load_test_image(dog_image_path)
    
    if not image_base64:
        print("❌ Failed to load test image")
        return
    
    print("✅ Image loaded successfully")
    print()
    
    # Test both models with classic style
    style = 'classic'
    
    print("1️⃣ Testing SDXL (Primary Model)")
    print("-" * 30)
    
    # Test with session that should use SDXL (new user)
    sdxl_result = test_model(image_base64, style, "sdxl_test", "sdxl")
    print()
    
    print("2️⃣ Testing Gemini (Premium Model)")
    print("-" * 35)
    
    # Test with session that should use Gemini (simulate experienced user)
    # We'll use a hack - create sessions with existing usage to trigger Gemini
    gemini_session = f"experienced_user_{int(time.time())}"
    
    # First, let's just test and see what we get
    gemini_result = test_model(image_base64, style, "gemini_test", "gemini")
    print()
    
    # Compare results
    print("📊 Comparison Summary")
    print("=" * 30)
    
    if sdxl_result.get('success') and gemini_result.get('success'):
        print(f"SDXL Performance:")
        print(f"  ⚡ Processing time: {sdxl_result['processing_time']:.1f}s")
        print(f"  💰 Cost: ${sdxl_result['cost']:.3f}")
        print(f"  🔄 Fallback used: {sdxl_result['fallback_used']}")
        print()
        
        print(f"Gemini Performance:")
        print(f"  ⚡ Processing time: {gemini_result['processing_time']:.1f}s")
        print(f"  💰 Cost: ${gemini_result['cost']:.3f}")
        print(f"  🔄 Fallback used: {gemini_result['fallback_used']}")
        print()
        
        print("🎯 Key Improvements Made to SDXL:")
        print("  • Updated prompts to match Gemini's instructional style")
        print("  • Increased denoising strength (0.22 → 0.35) for more dramatic transformation")  
        print("  • Increased CFG scale (7.5 → 9.0) for stronger prompt adherence")
        print("  • Increased steps (30 → 50) for better quality")
        print("  • Added explicit subject preservation language")
        print()
        
        actual_sdxl = sdxl_result['model'] == 'sdxl' and not sdxl_result['fallback_used']
        actual_gemini = gemini_result['model'] == 'gemini'
        
        if actual_sdxl and actual_gemini:
            print("✅ Perfect! Both models working as expected")
            print("   You can now compare the visual results to see if SDXL looks more like Gemini")
        elif not actual_sdxl:
            print("⚠️  SDXL fell back to Gemini - both results are from Gemini")
            print("   This means the visual comparison will show Gemini vs Gemini")
        else:
            print("✅ Got results from both models for comparison")
            
    else:
        print("❌ One or both tests failed - check the errors above")
    
    print()
    print("🖼️  To compare visually, check the saved images:")
    print("   /tmp/sdxl_classic_dog_result.png")
    print("   /tmp/gemini_classic_dog_result.png")

if __name__ == "__main__":
    main()