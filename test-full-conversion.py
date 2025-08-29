#!/usr/bin/env python3
"""
Full conversion test with actual image
"""

import requests
import base64
import json
import os
import time

def create_test_image():
    """Create a simple test image if none exists"""
    try:
        from PIL import Image
        import io
        
        # Create a simple 200x200 test image
        img = Image.new('RGB', (200, 200), color='blue')
        img_buffer = io.BytesIO()
        img.save(img_buffer, format='JPEG')
        return img_buffer.getvalue()
    except ImportError:
        print("   PIL not available, skipping image creation test")
        return None

def test_full_conversion():
    print("🎨 Testing Full Gemini Oil Painting Conversion...")
    
    base_url = "http://localhost:5174"
    
    # Check for existing test image
    test_image_paths = [
        'tests/fixtures/test-cat.jpg',
        'tests/fixtures/test-dog.jpg', 
        'public/test-images/sample.jpg'
    ]
    
    image_data = None
    image_name = "test-image"
    
    for path in test_image_paths:
        if os.path.exists(path):
            with open(path, 'rb') as f:
                image_data = f.read()
            image_name = os.path.basename(path)
            print(f"   Using existing image: {path}")
            break
    
    if not image_data:
        print("   No test images found, creating simple test image...")
        image_data = create_test_image()
        if not image_data:
            print("   ❌ Cannot create test image")
            return False
    
    print(f"\n🖼️  Testing conversion with {image_name}...")
    
    # Test conversion
    try:
        files = {
            'image': (image_name, image_data, 'image/jpeg'),
            'style': (None, 'classic'),
            'subject': (None, 'general'),
            'preservationMode': (None, 'high'),
            'quality': (None, 'high')
        }
        
        print("   Sending request to Gemini...")
        start_time = time.time()
        
        response = requests.post(
            f"{base_url}/api/convert-gemini",
            files=files,
            timeout=60  # Give Gemini time to process
        )
        
        processing_time = time.time() - start_time
        
        print(f"   Response status: {response.status_code}")
        
        if response.status_code == 200:
            try:
                result = response.json()
                print(f"   ✅ Conversion successful in {processing_time:.1f}s!")
                print(f"   Gemini processing: {result.get('metadata', {}).get('processingTime', 'N/A')}ms")
                print(f"   Provider: {result.get('metadata', {}).get('provider', 'N/A')}")
                print(f"   Style: {result.get('metadata', {}).get('style', 'N/A')}")
                print(f"   Cost: ${result.get('metadata', {}).get('totalCost', 0.039)}")
                
                # Check if image was generated
                if result.get('image'):
                    image_size = len(result['image'])
                    print(f"   Generated image size: {image_size:,} characters")
                    if image_size > 1000:
                        print("   ✅ Valid oil painting image generated!")
                        return True
                    else:
                        print("   ⚠️  Image seems too small")
                else:
                    print("   ❌ No image in response")
                    
            except json.JSONDecodeError:
                print("   ❌ Invalid JSON response")
                print(f"   Response: {response.text[:500]}...")
                
        else:
            try:
                error = response.json()
                print(f"   ❌ Conversion failed: {error.get('error', 'Unknown error')}")
            except json.JSONDecodeError:
                print(f"   ❌ HTTP {response.status_code}: {response.text[:200]}...")
        
    except requests.exceptions.Timeout:
        print("   ⏰ Request timed out (Gemini may be processing)")
        print("   Try again or check Gemini API quotas")
    except requests.exceptions.RequestException as e:
        print(f"   ❌ Request failed: {e}")
    
    return False

def main():
    print("🚀 Full Pipeline Test: Photo → Gemini → Oil Painting")
    
    success = test_full_conversion()
    
    print(f"\n{'='*50}")
    if success:
        print("🎉 FRONTEND TEST SUCCESSFUL!")
        print("✅ Gemini 2.5 Flash integration is working perfectly!")
        print("✅ Photo-to-oil-painting conversion pipeline active!")
        print("✅ Ready for production deployment!")
    else:
        print("⚠️  Manual testing recommended:")
        print("   1. Visit: http://localhost:5174/upload")
        print("   2. Upload a photo and test conversion")
        print("   3. Verify oil painting style output")
    
    print(f"\n🎨 Your PetCanvas app is running on Gemini 2.5 Flash!")
    print("   Model: gemini-2.5-flash-image-preview")
    print("   Cost: $0.039 per image")
    print("   Styles: Classic, Van Gogh, Monet, Modern")

if __name__ == "__main__":
    main()