#!/usr/bin/env python3
"""
Download real, high-quality pet photos for artistic conversion
Using direct URLs to ensure we get actual pet portraits
"""

import os
import requests
import time
import json
from pathlib import Path

# Real pet photo URLs - carefully selected for front-facing portraits
REAL_PET_PHOTOS = [
    # Dogs - Front facing portraits
    {
        "name": "golden_retriever",
        "type": "dog",
        "breed": "Golden Retriever",
        "url": "https://images.pexels.com/photos/2253275/pexels-photo-2253275.jpeg?auto=compress&cs=tinysrgb&w=800"
    },
    {
        "name": "german_shepherd",
        "type": "dog", 
        "breed": "German Shepherd",
        "url": "https://images.pexels.com/photos/356378/pexels-photo-356378.jpeg?auto=compress&cs=tinysrgb&w=800"
    },
    {
        "name": "labrador",
        "type": "dog",
        "breed": "Labrador",
        "url": "https://images.pexels.com/photos/33053/dog-young-dog-small-dog-maltese.jpg?auto=compress&cs=tinysrgb&w=800"
    },
    {
        "name": "poodle",
        "type": "dog",
        "breed": "Poodle",
        "url": "https://images.pexels.com/photos/1458916/pexels-photo-1458916.jpeg?auto=compress&cs=tinysrgb&w=800"
    },
    {
        "name": "husky",
        "type": "dog",
        "breed": "Siberian Husky",
        "url": "https://images.pexels.com/photos/3715587/pexels-photo-3715587.jpeg?auto=compress&cs=tinysrgb&w=800"
    },
    
    # Cats - Front facing portraits
    {
        "name": "persian_cat",
        "type": "cat",
        "breed": "Persian Cat",
        "url": "https://images.pexels.com/photos/45201/kitty-cat-kitten-pet-45201.jpeg?auto=compress&cs=tinysrgb&w=800"
    },
    {
        "name": "siamese_cat",
        "type": "cat",
        "breed": "Siamese Cat",
        "url": "https://images.pexels.com/photos/596590/pexels-photo-596590.jpeg?auto=compress&cs=tinysrgb&w=800"
    },
    {
        "name": "maine_coon",
        "type": "cat",
        "breed": "Maine Coon",
        "url": "https://images.pexels.com/photos/1741205/pexels-photo-1741205.jpeg?auto=compress&cs=tinysrgb&w=800"
    },
    {
        "name": "british_shorthair",
        "type": "cat",
        "breed": "British Shorthair",
        "url": "https://images.pexels.com/photos/1170986/pexels-photo-1170986.jpeg?auto=compress&cs=tinysrgb&w=800"
    },
    {
        "name": "tabby_cat",
        "type": "cat",
        "breed": "Tabby Cat",
        "url": "https://images.pexels.com/photos/774731/pexels-photo-774731.jpeg?auto=compress&cs=tinysrgb&w=800"
    }
]

def download_pet_photo(pet_info: dict, output_dir: str) -> dict:
    """Download a single pet photo"""
    try:
        print(f"📥 Downloading {pet_info['breed']}...")
        
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
        
        response = requests.get(pet_info['url'], headers=headers, timeout=30)
        
        if response.status_code == 200:
            filename = f"{pet_info['name']}.jpg"
            filepath = os.path.join(output_dir, filename)
            
            with open(filepath, 'wb') as f:
                f.write(response.content)
            
            # Verify file size
            file_size = os.path.getsize(filepath)
            if file_size > 10000:  # At least 10KB
                print(f"  ✅ Saved: {filename} ({file_size//1024}KB)")
                return {
                    "success": True,
                    "name": pet_info['name'],
                    "breed": pet_info['breed'],
                    "type": pet_info['type'],
                    "filepath": filepath,
                    "filename": filename
                }
            else:
                print(f"  ❌ File too small: {filename}")
                os.remove(filepath)
                return {"success": False, "name": pet_info['name']}
        else:
            print(f"  ❌ Download failed: HTTP {response.status_code}")
            return {"success": False, "name": pet_info['name']}
            
    except Exception as e:
        print(f"  ❌ Error: {e}")
        return {"success": False, "name": pet_info['name'], "error": str(e)}

def main():
    """Download all real pet photos"""
    print("🐾 Real Pet Photo Downloader")
    print("=" * 50)
    print(f"Downloading {len(REAL_PET_PHOTOS)} high-quality pet portraits...")
    print()
    
    # Create output directory
    output_dir = "real_pet_photos"
    os.makedirs(output_dir, exist_ok=True)
    
    # Download all photos
    successful_downloads = []
    failed_downloads = []
    
    for pet_info in REAL_PET_PHOTOS:
        result = download_pet_photo(pet_info, output_dir)
        
        if result["success"]:
            successful_downloads.append(result)
        else:
            failed_downloads.append(result)
        
        time.sleep(0.5)  # Be nice to servers
    
    # Save metadata
    metadata = {
        "total_attempted": len(REAL_PET_PHOTOS),
        "successful": len(successful_downloads),
        "failed": len(failed_downloads),
        "photos": successful_downloads,
        "timestamp": time.time()
    }
    
    metadata_file = os.path.join(output_dir, "metadata.json")
    with open(metadata_file, 'w') as f:
        json.dump(metadata, f, indent=2)
    
    # Summary
    print()
    print("=" * 50)
    print(f"✅ Download Complete!")
    print(f"📊 Success: {len(successful_downloads)}/{len(REAL_PET_PHOTOS)}")
    print(f"📁 Output: {output_dir}/")
    print(f"📋 Metadata: {metadata_file}")
    
    if successful_downloads:
        print("\n🐕 Dogs downloaded:")
        for photo in successful_downloads:
            if photo['type'] == 'dog':
                print(f"  • {photo['breed']}")
        
        print("\n🐈 Cats downloaded:")
        for photo in successful_downloads:
            if photo['type'] == 'cat':
                print(f"  • {photo['breed']}")
    
    print("\n🎨 Ready for ComfyUI artistic conversion!")
    return successful_downloads

if __name__ == "__main__":
    main()