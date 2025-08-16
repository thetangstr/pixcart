#!/usr/bin/env python3
"""
Create a comparison grid to show the differences between styles
All using SAME parameters, different prompts
"""

from PIL import Image
from pathlib import Path

def create_comparison_grid():
    """Create a grid showing original + 3 styles for first few tasks"""
    
    input_dir = Path("public/evaluation-images/universal_params")
    output_dir = Path("public/evaluation-images")
    
    # Get first 3 tasks that have all images
    for task_id in range(1, 6):
        original = input_dir / f"task_{task_id}_original.jpg"
        
        # Find corresponding style images
        style_images = []
        for pattern in [f"cat_*_{task_id:03d}_", f"dog_*_{task_id:03d}_", f"cat_*{task_id:02d}_", f"dog_*{task_id:02d}_"]:
            matches = list(input_dir.glob(f"{pattern}*.jpg"))
            if matches:
                # Get classic, impressionist, modern for this image
                base_name = matches[0].stem.rsplit('_', 1)[0]
                classic = input_dir / f"{base_name}_classic.jpg"
                impressionist = input_dir / f"{base_name}_impressionist.jpg"
                modern = input_dir / f"{base_name}_modern.jpg"
                
                if classic.exists() and impressionist.exists() and modern.exists():
                    style_images = [classic, impressionist, modern]
                    break
        
        if not original.exists() or not style_images:
            continue
            
        # Load images
        orig_img = Image.open(original)
        classic_img = Image.open(style_images[0])
        impress_img = Image.open(style_images[1])
        modern_img = Image.open(style_images[2])
        
        # Resize all to same size (512x512)
        size = (512, 512)
        orig_img = orig_img.resize(size, Image.Resampling.LANCZOS)
        classic_img = classic_img.resize(size, Image.Resampling.LANCZOS)
        impress_img = impress_img.resize(size, Image.Resampling.LANCZOS)
        modern_img = modern_img.resize(size, Image.Resampling.LANCZOS)
        
        # Create grid (2x2)
        grid = Image.new('RGB', (1024, 1024), 'white')
        grid.paste(orig_img, (0, 0))
        grid.paste(classic_img, (512, 0))
        grid.paste(impress_img, (0, 512))
        grid.paste(modern_img, (512, 512))
        
        # Save grid
        output_path = output_dir / f"comparison_grid_task_{task_id}.jpg"
        grid.save(output_path, quality=95)
        print(f"Created comparison grid: {output_path}")
        
        # Also create horizontal strip for easier viewing
        strip = Image.new('RGB', (2048, 512), 'white')
        strip.paste(orig_img, (0, 0))
        strip.paste(classic_img, (512, 0))
        strip.paste(impress_img, (1024, 0))
        strip.paste(modern_img, (1536, 0))
        
        strip_path = output_dir / f"comparison_strip_task_{task_id}.jpg"
        strip.save(strip_path, quality=95)
        print(f"Created comparison strip: {strip_path}")
        
        print(f"Task {task_id}: Original | Classic | Impressionist | Modern")
        print("All using SAME parameters, different prompts only!")
        print("-" * 50)

if __name__ == "__main__":
    create_comparison_grid()