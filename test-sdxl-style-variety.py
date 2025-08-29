#!/usr/bin/env python3
"""
Test SDXL style variety with dramatically improved parameters
"""

import requests
import json
import base64
import time
import os

def test_style_variety():
    print("🎨 Testing SDXL Style Variety with Enhanced Parameters")
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
        print("✅ Image loaded successfully\n")
    except Exception as e:
        print(f"❌ Failed to load image: {e}")
        return
    
    # Test all four styles with new parameters
    styles = [
        ('classic', 'Rembrandt baroque style - warm earth tones, chiaroscuro'),
        ('impressionist', 'Monet style - loose brushstrokes, dappled light'),
        ('vangogh', 'Van Gogh style - swirling strokes, vibrant colors'),
        ('modern', 'Contemporary abstract - bold shapes, neon colors')
    ]
    
    print("🚀 Key Improvements Applied:")
    print("  • MUCH higher denoising (0.65-0.80 vs 0.30)")
    print("  • Style-specific prompts with distinct characteristics")
    print("  • Different samplers per style")
    print("  • Higher CFG (10-13 vs 7.5)")
    print("  • More steps (50-65 vs 30)")
    print()
    
    results = []
    
    for style_id, description in styles:
        print(f"🖼️  Testing {style_id.upper()} style")
        print(f"   Description: {description}")
        print(f"   Expected: Distinctive {style_id} characteristics")
        
        test_data = {
            'image': ('test_dog.jpg', base64.b64decode(base64_data), 'image/jpeg'),
            'style': (None, style_id),
            'subject': (None, 'pet'),
            'mode': (None, 'hybrid'),
            'preservationMode': (None, 'medium'),  # Allow more transformation
            'sessionId': (None, f"style_test_{style_id}_{int(time.time())}")
        }
        
        try:
            print("   ⏱️  Processing...")
            start_time = time.time()
            
            response = requests.post(
                "http://localhost:5174/api/convert-hybrid",
                files=test_data,
                timeout=180
            )
            
            elapsed = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                
                model_used = data.get('modelInfo', {}).get('primary', 'unknown')
                fallback_used = data.get('modelInfo', {}).get('fallbackUsed', False)
                
                if model_used == 'sdxl' and not fallback_used:
                    print(f"   ✅ Success! Processed in {elapsed:.1f}s")
                    
                    # Save result
                    if data.get('image') or data.get('bestResult', {}).get('image'):
                        result_image = data.get('image') or data.get('bestResult', {}).get('image')
                        
                        output_file = f"/tmp/sdxl_{style_id}_enhanced.png"
                        if result_image.startswith('data:'):
                            image_data = result_image.split(',')[1]
                            with open(output_file, 'wb') as f:
                                f.write(base64.b64decode(image_data))
                            print(f"   💾 Saved to: {output_file}")
                    
                    results.append({
                        'style': style_id,
                        'success': True,
                        'time': elapsed,
                        'model': model_used
                    })
                else:
                    print(f"   ⚠️  Fell back to {model_used}")
                    results.append({
                        'style': style_id,
                        'success': False,
                        'time': elapsed,
                        'model': model_used
                    })
                    
            else:
                print(f"   ❌ Request failed: {response.status_code}")
                results.append({
                    'style': style_id,
                    'success': False,
                    'time': elapsed,
                    'error': response.status_code
                })
                
        except requests.exceptions.Timeout:
            print(f"   ⏱️  Timed out (processing with higher quality)")
            results.append({
                'style': style_id,
                'success': 'timeout',
                'time': 180
            })
        except Exception as e:
            print(f"   ❌ Error: {e}")
            results.append({
                'style': style_id,
                'success': False,
                'error': str(e)
            })
        
        print()
        time.sleep(2)  # Brief pause between styles
    
    # Summary
    print("=" * 60)
    print("📊 STYLE VARIETY TEST RESULTS")
    print("=" * 60)
    
    successful = [r for r in results if r.get('success') == True]
    
    if len(successful) == 4:
        print("✅ EXCELLENT! All 4 styles processed successfully")
        print("\n🎯 Expected Improvements:")
        print("  • CLASSIC: Deep shadows, warm browns, Rembrandt lighting")
        print("  • IMPRESSIONIST: Soft edges, color vibration, Monet palette")
        print("  • VAN GOGH: Swirling strokes, intense blues/yellows")
        print("  • MODERN: Abstract shapes, bold neon colors")
        print("\n🖼️  Compare the results:")
        print("  /tmp/sdxl_classic_enhanced.png")
        print("  /tmp/sdxl_impressionist_enhanced.png")
        print("  /tmp/sdxl_vangogh_enhanced.png")
        print("  /tmp/sdxl_modern_enhanced.png")
        print("\nEach should look DISTINCTLY different now!")
    else:
        print(f"⚠️  Only {len(successful)}/4 styles succeeded")
        print("Check server logs for any issues")
    
    print()
    print("📈 Processing Times:")
    for r in results:
        if 'time' in r:
            print(f"  {r['style']}: {r['time']:.1f}s")
    
    avg_time = sum(r.get('time', 0) for r in results if r.get('success')) / max(len(successful), 1)
    if successful:
        print(f"\n  Average: {avg_time:.1f}s (higher quality = more time)")

if __name__ == "__main__":
    test_style_variety()