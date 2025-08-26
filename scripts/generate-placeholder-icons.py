#!/usr/bin/env python3
"""Generate placeholder style icons using PIL with texture patterns"""

from PIL import Image, ImageDraw, ImageFilter
import numpy as np
from pathlib import Path
import random

def create_texture_pattern(size, style_id):
    """Create texture pattern for each style"""
    img = Image.new('RGB', size, color=(255, 255, 255))
    draw = ImageDraw.Draw(img)
    
    if style_id == 'classic':
        # Classic - warm browns and golds with smooth strokes
        base_color = (139, 115, 85)  # Warm brown
        highlight = (212, 175, 115)  # Gold
        
        # Create smooth horizontal strokes
        for y in range(0, size[1], 8):
            thickness = random.randint(3, 8)
            color_var = random.randint(-20, 20)
            stroke_color = tuple(max(0, min(255, c + color_var)) for c in base_color)
            draw.rectangle([0, y, size[0], y + thickness], fill=stroke_color)
            
        # Add subtle highlights
        for _ in range(20):
            x = random.randint(0, size[0])
            y = random.randint(0, size[1])
            draw.ellipse([x, y, x+30, y+15], fill=highlight)
            
    elif style_id == 'vangogh':
        # Van Gogh - swirling blues and yellows with thick texture
        blue = (0, 78, 137)
        yellow = (255, 193, 7)
        
        # Create swirling circular strokes
        for _ in range(50):
            x = random.randint(-50, size[0])
            y = random.randint(-50, size[1])
            radius = random.randint(20, 80)
            color = blue if random.random() > 0.5 else yellow
            thickness = random.randint(5, 15)
            
            # Draw thick circular strokes
            for offset in range(thickness):
                draw.ellipse([x+offset, y+offset, x+radius, y+radius], 
                           outline=color, width=3)
        
    elif style_id == 'monet':
        # Monet - soft pastels with dabs
        colors = [
            (255, 228, 225),  # Soft pink
            (230, 230, 250),  # Lavender
            (240, 230, 140),  # Khaki
            (152, 251, 152),  # Pale green
        ]
        
        # Create soft dabs of color
        for _ in range(200):
            x = random.randint(0, size[0])
            y = random.randint(0, size[1])
            color = random.choice(colors)
            size_dab = random.randint(5, 20)
            
            # Soft circular dabs
            draw.ellipse([x, y, x+size_dab, y+size_dab], fill=color)
            
    elif style_id == 'modern':
        # Modern - bold geometric shapes with vibrant colors
        colors = [
            (255, 107, 53),   # Vibrant orange
            (0, 78, 137),     # Deep blue
            (255, 193, 7),    # Bold yellow
            (142, 36, 170),   # Purple
        ]
        
        # Create bold geometric strokes
        for _ in range(30):
            color = random.choice(colors)
            x1 = random.randint(0, size[0])
            y1 = random.randint(0, size[1])
            
            if random.random() > 0.5:
                # Rectangle
                x2 = x1 + random.randint(20, 100)
                y2 = y1 + random.randint(20, 100)
                draw.rectangle([x1, y1, x2, y2], fill=color)
            else:
                # Angular line
                x2 = random.randint(0, size[0])
                y2 = random.randint(0, size[1])
                draw.line([x1, y1, x2, y2], fill=color, width=random.randint(5, 20))
    
    # Apply texture filter
    img = img.filter(ImageFilter.EDGE_ENHANCE)
    
    # Add subtle noise for paint texture
    np_img = np.array(img)
    noise = np.random.normal(0, 5, np_img.shape)
    np_img = np.clip(np_img + noise, 0, 255).astype(np.uint8)
    img = Image.fromarray(np_img)
    
    return img

def main():
    output_dir = Path('../public/style-icons')
    output_dir.mkdir(parents=True, exist_ok=True)
    
    styles = [
        {'id': 'classic', 'name': 'Classic Portrait'},
        {'id': 'vangogh', 'name': 'Van Gogh Style'},
        {'id': 'monet', 'name': 'Monet Impressionist'},
        {'id': 'modern', 'name': 'Modern Abstract'},
    ]
    
    print("🎨 Generating placeholder style icons...")
    print("=" * 50)
    
    for style in styles:
        print(f"Creating {style['name']} icon...")
        
        # Generate high res version
        img = create_texture_pattern((1024, 1024), style['id'])
        
        # Apply additional filters based on style
        if style['id'] == 'classic':
            img = img.filter(ImageFilter.SMOOTH_MORE)
        elif style['id'] == 'vangogh':
            img = img.filter(ImageFilter.EMBOSS)
        elif style['id'] == 'monet':
            img = img.filter(ImageFilter.GaussianBlur(radius=2))
        elif style['id'] == 'modern':
            img = img.filter(ImageFilter.SHARPEN)
        
        # Resize to icon size
        img = img.resize((512, 512), Image.Resampling.LANCZOS)
        
        # Save
        output_path = output_dir / f"{style['id']}.jpg"
        img.save(output_path, 'JPEG', quality=95)
        print(f"  ✅ Saved to {output_path}")
    
    print("\n" + "=" * 50)
    print("✅ All placeholder icons generated!")
    print("\n📝 These are temporary placeholder icons.")
    print("Replace them with AI-generated textures when SD/ComfyUI is properly configured.")
    
    # Create an HTML preview
    html = """<!DOCTYPE html>
<html>
<head>
    <title>Style Icons Preview</title>
    <style>
        body {
            font-family: system-ui;
            max-width: 1200px;
            margin: 0 auto;
            padding: 2rem;
            background: #f3f4f6;
        }
        .grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 2rem;
        }
        .card {
            background: white;
            border-radius: 1rem;
            padding: 1rem;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        .icon {
            width: 100%;
            height: 200px;
            border-radius: 0.5rem;
            object-fit: cover;
        }
        h2 {
            margin: 1rem 0 0.5rem;
            color: #1f2937;
        }
        p {
            color: #6b7280;
            font-size: 0.875rem;
        }
    </style>
</head>
<body>
    <h1>🎨 Style Icons Preview</h1>
    <div class="grid">
"""
    
    for style in styles:
        html += f"""
        <div class="card">
            <img src="{style['id']}.jpg" alt="{style['name']}" class="icon">
            <h2>{style['name']}</h2>
            <p>Icon ID: {style['id']}</p>
        </div>
"""
    
    html += """
    </div>
</body>
</html>"""
    
    with open(output_dir / 'preview.html', 'w') as f:
        f.write(html)
    
    print(f"\n👀 Preview at: file://{output_dir.absolute()}/preview.html")

if __name__ == "__main__":
    main()