#!/usr/bin/env python3
"""Download and process famous paintings as style icons"""

import requests
from PIL import Image
from io import BytesIO
from pathlib import Path

def download_and_process_image(url, output_path, size=(512, 512)):
    """Download image from URL and process it"""
    try:
        # Download image
        response = requests.get(url, headers={'User-Agent': 'Mozilla/5.0'})
        response.raise_for_status()
        
        # Open and process image
        img = Image.open(BytesIO(response.content))
        
        # Convert to RGB if necessary
        if img.mode != 'RGB':
            img = img.convert('RGB')
        
        # Calculate crop for square aspect ratio
        width, height = img.size
        min_dim = min(width, height)
        
        # Center crop
        left = (width - min_dim) // 2
        top = (height - min_dim) // 2
        right = left + min_dim
        bottom = top + min_dim
        
        img = img.crop((left, top, right, bottom))
        
        # Resize to target size
        img = img.resize(size, Image.Resampling.LANCZOS)
        
        # Save
        img.save(output_path, 'JPEG', quality=95)
        return True
        
    except Exception as e:
        print(f"Error processing {url}: {e}")
        return False

def main():
    output_dir = Path('../public/style-icons')
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # Famous paintings for each style
    paintings = {
        'classic': {
            'name': 'Mona Lisa - Classic Portrait',
            'url': 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ec/Mona_Lisa%2C_by_Leonardo_da_Vinci%2C_from_C2RMF_retouched.jpg/800px-Mona_Lisa%2C_by_Leonardo_da_Vinci%2C_from_C2RMF_retouched.jpg',
            'fallback': 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6a/Mona_Lisa.jpg/800px-Mona_Lisa.jpg'
        },
        'vangogh': {
            'name': 'Starry Night - Van Gogh',
            'url': 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg/1280px-Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg',
            'fallback': 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/94/Starry_Night_Over_the_Rhone.jpg/1280px-Starry_Night_Over_the_Rhone.jpg'
        },
        'monet': {
            'name': 'Water Lilies - Monet',
            'url': 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/aa/Claude_Monet_-_Water_Lilies_-_1906%2C_Ryerson.jpg/1280px-Claude_Monet_-_Water_Lilies_-_1906%2C_Ryerson.jpg',
            'fallback': 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/31/Monet_-_Seerosen_1906.jpg/1280px-Monet_-_Seerosen_1906.jpg'
        }
    }
    
    print("🎨 Downloading Famous Paintings for Style Icons")
    print("=" * 50)
    
    for style_id, info in paintings.items():
        output_path = output_dir / f"{style_id}.jpg"
        print(f"\n📥 Downloading {info['name']}...")
        
        # Try primary URL first
        if download_and_process_image(info['url'], output_path):
            print(f"✅ Saved {style_id}.jpg")
        else:
            # Try fallback URL
            print(f"   Trying fallback URL...")
            if download_and_process_image(info['fallback'], output_path):
                print(f"✅ Saved {style_id}.jpg (from fallback)")
            else:
                print(f"❌ Failed to download {style_id}")
    
    # Keep the modern abstract as the generated texture since there's no single famous painting
    print(f"\n📝 Note: Keeping existing modern.jpg as it represents abstract style well")
    
    print("\n" + "=" * 50)
    print("✅ Style icons updated with famous paintings!")
    print("\nIcon mapping:")
    print("  • classic.jpg = Mona Lisa (Renaissance/Classic style)")
    print("  • vangogh.jpg = Starry Night (Thick textured style)")
    print("  • monet.jpg = Water Lilies (Soft impressionist style)")
    print("  • modern.jpg = Abstract texture (Modern style)")

if __name__ == "__main__":
    main()