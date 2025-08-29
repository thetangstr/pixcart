#!/usr/bin/env python3
"""
Simple test for Gemini API integration
"""

import requests
import json
import time

def test_gemini_api():
    print("🧪 Testing Gemini API Integration...")
    
    base_url = "http://localhost:5174"
    
    # Test 1: Health check
    print("\n1. Testing health check...")
    try:
        response = requests.get(f"{base_url}/api/convert-gemini", timeout=30)
        print(f"   Status: {response.status_code}")
        print(f"   Response: {response.text[:200]}...")
        
        if response.status_code == 200:
            try:
                data = response.json()
                print("   ✅ Health check successful")
                print(f"   Model: {data.get('model', 'N/A')}")
                print(f"   Available: {data.get('available', 'N/A')}")
                print(f"   Styles: {', '.join(data.get('styles', []))}")
            except json.JSONDecodeError:
                print("   ⚠️  Response not JSON format")
        else:
            print("   ❌ Health check failed")
            
    except requests.exceptions.RequestException as e:
        print(f"   ❌ Connection error: {e}")
        return False
    
    # Test 2: Test upload page
    print("\n2. Testing upload page...")
    try:
        response = requests.get(f"{base_url}/upload", timeout=15)
        if response.status_code == 200:
            print("   ✅ Upload page accessible")
            # Check if it contains oil painting related content
            if "oil" in response.text.lower() or "paint" in response.text.lower():
                print("   ✅ Contains oil painting content")
            else:
                print("   ⚠️  May not contain expected oil painting content")
        else:
            print(f"   ❌ Upload page failed: {response.status_code}")
    except requests.exceptions.RequestException as e:
        print(f"   ❌ Upload page error: {e}")
    
    print("\n🎉 Basic frontend test completed!")
    print("\n📋 Manual Test Instructions:")
    print("   1. Open: http://localhost:5174/upload")
    print("   2. Upload any image (JPG, PNG)")
    print("   3. Select a style: Classic, Van Gogh, Monet, or Modern")
    print("   4. Click 'Convert to Oil Painting'")
    print("   5. Wait 15-30 seconds for Gemini to process")
    print("   6. Verify the result is an oil painting style image")
    
    return True

if __name__ == "__main__":
    test_gemini_api()