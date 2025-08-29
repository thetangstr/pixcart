#!/usr/bin/env python3
"""
Test SDXL connection through the hybrid system
"""

import requests
import json
import base64
import os

def test_sdxl_hybrid_system():
    print("🧪 Testing SDXL Connection via Hybrid System")
    print("=" * 50)
    
    # Test 1: Check ComfyUI direct connectivity
    print("1. Testing ComfyUI direct connection...")
    try:
        response = requests.get("http://127.0.0.1:8188/system_stats", timeout=10)
        if response.status_code == 200:
            stats = response.json()
            print(f"   ✅ ComfyUI server online")
            print(f"   Version: {stats['system']['comfyui_version']}")
            print(f"   Device: {stats['devices'][0]['name']}")
            print(f"   VRAM: {stats['devices'][0]['vram_free'] / (1024**3):.1f}GB free")
        else:
            print(f"   ❌ ComfyUI server returned {response.status_code}")
            return False
    except Exception as e:
        print(f"   ❌ ComfyUI connection failed: {e}")
        return False
    
    # Test 2: Test hybrid API with a small image
    print("\n2. Testing hybrid API with test image...")
    
    # Create a simple test image (base64 encoded 1x1 pixel)
    test_image_base64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
    
    # Prepare test data - fix form data format
    test_data = {
        'image': ('test.png', base64.b64decode(test_image_base64), 'image/png'),
        'style': (None, 'classic'),
        'subject': (None, 'general'), 
        'mode': (None, 'hybrid'),
        'preservationMode': (None, 'high'),
        'sessionId': (None, 'test_session_sdxl')
    }
    
    try:
        response = requests.post(
            "http://localhost:5174/api/convert-hybrid",
            files=test_data,
            timeout=120  # SDXL can take time
        )
        
        if response.status_code == 200:
            data = response.json()
            
            print(f"   ✅ Hybrid API call successful")
            print(f"   Model used: {data.get('modelInfo', {}).get('primary', 'unknown')}")
            print(f"   Provider: {data.get('modelInfo', {}).get('provider', 'unknown')}")
            print(f"   Processing time: {data.get('modelInfo', {}).get('processingTime', 0)/1000:.1f}s")
            print(f"   Fallback used: {data.get('modelInfo', {}).get('fallbackUsed', False)}")
            print(f"   Cost: ${data.get('modelInfo', {}).get('cost', 0):.3f}")
            
            # Check if SDXL was successfully used
            if data.get('modelInfo', {}).get('primary') == 'sdxl' and not data.get('modelInfo', {}).get('fallbackUsed'):
                print(f"\n🎉 SUCCESS: SDXL is working correctly!")
                return True
            elif data.get('modelInfo', {}).get('fallbackUsed'):
                print(f"\n⚠️  SDXL failed, fell back to Gemini (this was the previous behavior)")
                print(f"   This suggests SDXL model or workflow issues")
                return False
            else:
                print(f"\n❓ Unexpected result - check model configuration")
                return False
                
        else:
            print(f"   ❌ Hybrid API failed with status {response.status_code}")
            try:
                error_data = response.json()
                print(f"   Error: {error_data.get('error', 'Unknown error')}")
            except:
                print(f"   Raw response: {response.text[:200]}")
            return False
            
    except Exception as e:
        print(f"   ❌ Hybrid API request failed: {e}")
        return False

if __name__ == "__main__":
    success = test_sdxl_hybrid_system()
    
    if success:
        print(f"\n✅ ComfyUI/SDXL is now working with the hybrid system!")
        print(f"   Users will get:")
        print(f"   • First 3 images: SDXL ($0.01 each)")  
        print(f"   • After 3 images: Gemini Premium ($0.039 each)")
    else:
        print(f"\n❌ SDXL still has issues. System will continue using Gemini fallback.")
        print(f"   • All images: Gemini ($0.039 each)")
        print(f"   • Higher cost but reliable service")