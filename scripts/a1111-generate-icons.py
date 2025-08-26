#!/usr/bin/env python3
"""Generate style icons using Automatic1111 WebUI API"""

import json
import base64
import time
import requests
from pathlib import Path
from PIL import Image
import io

A1111_URL = "http://localhost:7860"

style_configs = [
    {
        "id": "classic",
        "prompt": """(macro photography:1.4) of Renaissance oil painting surface texture, extreme closeup of paint surface,
                     subtle glazing layers with gentle impasto highlights, burnt umber and raw sienna paint ridges,
                     varnished surface with golden light reflection, visible fine linen canvas weave texture underneath paint,
                     old master technique with delicate scumbling, smooth transitions between paint layers,
                     warm earth tones, ochre and burnt sienna pigments, professional museum quality paint texture,
                     slight craquelure pattern in aged varnish, soft diffused lighting on paint surface,
                     DSLR macro lens photography, focus stacking, high detail texture scan,
                     ultra high quality, 8k resolution, extreme detail, professional macro photography,
                     museum documentation, fine art photography, texture study, paint surface analysis, archival quality""",
        "negative_prompt": """portrait, face, person, figure, animal, landscape, objects, recognizable forms,
                           text, watermark, logo, digital art, 3d render, smooth plastic, flat color, cartoon,
                           illustration, anime, blurry, out of focus, low quality, jpeg artifacts, nsfw,
                           ugly, deformed, noisy, pixelated, grainy, low resolution""",
        "cfg_scale": 9.5,
        "steps": 40,
        "sampler_name": "DPM++ 2M SDE Karras",
        "width": 1024,
        "height": 1024,
        "seed": 42100
    },
    {
        "id": "vangogh",
        "prompt": """(macro photography:1.5) extreme closeup of thick impasto oil paint texture,
                     Van Gogh style energetic brushwork, dramatic swirling patterns in ultramarine blue and cadmium yellow paint,
                     5mm thick paint ridges, palette knife marks creating deep grooves and peaks, wet-on-wet paint mixing visible,
                     dynamic circular and curved brush movements frozen in thick paint, chrome yellow and cobalt blue pigments,
                     heavy texture with strong directional lighting casting shadows between paint ridges,
                     expressive gestural marks, paint squeezed directly from tube, thick buttery consistency,
                     professional art photography with raking light, focus stacked macro shot, museum documentation quality,
                     ultra high quality, 8k resolution, extreme detail, professional macro photography, archival quality""",
        "negative_prompt": """portrait, face, person, starry night, sunflowers, subject matter, landscape,
                           smooth surface, thin paint, watercolor, digital art, 3d render, flat, illustration,
                           cartoon, low quality, blurry, text, watermark, nsfw, ugly, deformed""",
        "cfg_scale": 10.5,
        "steps": 45,
        "sampler_name": "DPM++ 3M SDE Karras",
        "width": 1024,
        "height": 1024,
        "seed": 42200
    },
    {
        "id": "monet",
        "prompt": """(macro photography:1.3) impressionist paint texture closeup, Claude Monet brushwork technique,
                     soft broken color application with visible individual paint dabs, cerulean blue and rose madder dots,
                     gentle feathery brushstrokes creating optical color mixing, delicate paint texture with subtle impasto,
                     lilac, coral pink, and sage green paint touches, wet paint blending at edges,
                     loose gestural marks suggesting light and atmosphere, visible canvas texture between paint strokes,
                     soft natural lighting revealing gentle paint texture, shallow depth of field,
                     professional macro photography of fine art surface, museum quality documentation,
                     ultra high quality, 8k resolution, extreme detail, texture study, archival quality""",
        "negative_prompt": """portrait, face, water lilies subject, sharp details, hard edges, geometric,
                           smooth gradient, digital art, 3d render, photograph of real scene, illustration,
                           cartoon, flat color, low quality, text, watermark, nsfw""",
        "cfg_scale": 8.5,
        "steps": 35,
        "sampler_name": "Euler a",
        "width": 1024,
        "height": 1024,
        "seed": 42300
    },
    {
        "id": "modern",
        "prompt": """(macro photography:1.4) contemporary abstract oil paint texture, bold gestural brushwork closeup,
                     high contrast between smooth glazed areas and thick impasto sections, fluorescent magenta and electric teal paint,
                     aggressive palette knife scraping revealing underlayers, mixed media texture with sand or pumice in paint,
                     geometric hard-edge painting meets expressionist texture, metallic and iridescent pigments catching light,
                     experimental techniques with drips and splatters, industrial materials mixed with traditional oil paint,
                     stark shadows emphasizing three-dimensional paint relief, dynamic angular compositions in paint application,
                     professional art photography with dramatic lighting, ultra high resolution texture scan,
                     8k resolution, extreme detail, museum documentation, archival quality""",
        "negative_prompt": """portrait, face, traditional painting, representational art, smooth blending,
                           classical technique, digital art, 3d render, photograph of real objects, illustration,
                           low quality, blurry, flat, text, watermark, nsfw""",
        "cfg_scale": 11.0,
        "steps": 38,
        "sampler_name": "DPM++ 2M SDE Karras",
        "width": 1024,
        "height": 1024,
        "seed": 42400
    }
]

def check_a1111_status():
    """Check if A1111 is running and get available models"""
    try:
        response = requests.get(f"{A1111_URL}/sdapi/v1/sd-models")
        if response.status_code == 200:
            models = response.json()
            print("✅ A1111 is running")
            print(f"   Available models: {len(models)}")
            if models:
                print(f"   Current model: {models[0]['model_name']}")
            return True
    except Exception as e:
        print(f"❌ A1111 is not running or not accessible: {e}")
        print("   Please start it with: ./webui.sh --api")
        return False
    return False

def generate_icon(style_config):
    """Generate a single style icon using A1111 API"""
    
    print(f"\n🎨 Generating {style_config['id']} style icon...")
    
    payload = {
        "prompt": style_config["prompt"],
        "negative_prompt": style_config["negative_prompt"],
        "cfg_scale": style_config["cfg_scale"],
        "steps": style_config["steps"],
        "sampler_name": style_config["sampler_name"],
        "width": style_config["width"],
        "height": style_config["height"],
        "seed": style_config["seed"],
        "batch_size": 1,
        "n_iter": 1,
        "restore_faces": False,
        "tiling": False,
        "enable_hr": False,  # Can enable for higher quality
        "denoising_strength": 0.7,
        "hr_scale": 2,
        "hr_upscaler": "R-ESRGAN 4x+",
    }
    
    # Optional: Add ControlNet settings if available
    # payload["alwayson_scripts"] = {
    #     "controlnet": {
    #         "args": [
    #             {
    #                 "enabled": True,
    #                 "module": "tile_resample",
    #                 "model": "control_v11f1e_sd15_tile",
    #                 "weight": 0.4,
    #                 "guidance_start": 0.0,
    #                 "guidance_end": 1.0,
    #             }
    #         ]
    #     }
    # }
    
    try:
        # Send generation request
        response = requests.post(
            f"{A1111_URL}/sdapi/v1/txt2img",
            json=payload,
            timeout=120
        )
        
        if response.status_code == 200:
            result = response.json()
            
            # Get the generated image
            if 'images' in result and result['images']:
                image_data = result['images'][0]
                
                # Decode base64 image
                image = Image.open(io.BytesIO(base64.b64decode(image_data)))
                
                # Save the image
                output_dir = Path("output/style-icons")
                output_dir.mkdir(parents=True, exist_ok=True)
                
                output_path = output_dir / f"{style_config['id']}_icon.png"
                image.save(output_path, quality=95, optimize=True)
                
                print(f"✅ Saved {style_config['id']} icon to {output_path}")
                
                # Also save a 512x512 version for immediate use
                icon_512 = image.resize((512, 512), Image.Resampling.LANCZOS)
                icon_path = output_dir / f"{style_config['id']}_512.png"
                icon_512.save(icon_path, quality=95, optimize=True)
                print(f"   📐 Saved 512x512 version to {icon_path}")
                
                return str(output_path)
            else:
                print(f"❌ No image returned for {style_config['id']}")
                return None
                
        else:
            print(f"❌ Failed to generate {style_config['id']}: {response.status_code}")
            print(f"   Response: {response.text[:200]}")
            return None
            
    except requests.exceptions.Timeout:
        print(f"❌ Timeout generating {style_config['id']} - try reducing steps or resolution")
        return None
    except Exception as e:
        print(f"❌ Error generating {style_config['id']}: {e}")
        return None

def batch_generate_variations(style_config, num_variations=4):
    """Generate multiple variations of a style for selection"""
    
    print(f"\n🎲 Generating {num_variations} variations for {style_config['id']}...")
    
    results = []
    base_seed = style_config["seed"]
    
    for i in range(num_variations):
        # Modify seed for variation
        style_config["seed"] = base_seed + (i * 1000)
        result = generate_icon(style_config)
        if result:
            results.append(result)
        time.sleep(2)  # Small delay between generations
    
    print(f"   Generated {len(results)} variations")
    return results

def create_comparison_html(generated_files):
    """Create an HTML file to compare generated icons"""
    
    html_content = """
<!DOCTYPE html>
<html>
<head>
    <title>Style Icon Comparison</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 2rem;
        }
        .container {
            max-width: 1400px;
            margin: 0 auto;
            background: white;
            border-radius: 20px;
            padding: 2rem;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        }
        h1 {
            text-align: center;
            color: #333;
            margin-bottom: 2rem;
        }
        .style-section {
            margin-bottom: 3rem;
            border-bottom: 2px solid #eee;
            padding-bottom: 2rem;
        }
        .style-title {
            font-size: 1.5rem;
            font-weight: bold;
            color: #764ba2;
            margin-bottom: 1rem;
        }
        .icon-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 1rem;
        }
        .icon-card {
            text-align: center;
            padding: 1rem;
            background: #f7f7f7;
            border-radius: 10px;
            transition: transform 0.3s;
        }
        .icon-card:hover {
            transform: scale(1.05);
            background: #fff;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
        }
        .icon-card img {
            width: 100%;
            border-radius: 8px;
            margin-bottom: 0.5rem;
        }
        .size-tests {
            display: flex;
            gap: 0.5rem;
            justify-content: center;
            align-items: center;
            margin-top: 0.5rem;
        }
        .size-label {
            font-size: 0.75rem;
            color: #666;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🎨 Oil Painting Style Icons - Texture Studies</h1>
"""
    
    for style in style_configs:
        style_files = [f for f in generated_files if style["id"] in f]
        if style_files:
            html_content += f"""
        <div class="style-section">
            <div class="style-title">{style["id"].title()} Style</div>
            <div class="icon-grid">
"""
            for file_path in style_files:
                file_name = Path(file_path).name
                html_content += f"""
                <div class="icon-card">
                    <img src="{file_path}" alt="{file_name}">
                    <div class="size-tests">
                        <span class="size-label">32px:</span>
                        <img src="{file_path}" width="32" height="32">
                        <span class="size-label">64px:</span>
                        <img src="{file_path}" width="64" height="64">
                    </div>
                </div>
"""
            html_content += """
            </div>
        </div>
"""
    
    html_content += """
    </div>
</body>
</html>
"""
    
    comparison_path = Path("output/style-icons/comparison.html")
    comparison_path.write_text(html_content)
    print(f"\n📊 Comparison page saved to: {comparison_path}")
    return str(comparison_path)

def main():
    print("🚀 Starting Style Icon Generation with A1111")
    print("=" * 50)
    
    # Check if A1111 is running
    if not check_a1111_status():
        return
    
    generated_files = []
    
    # Choose generation mode
    print("\n📌 Generation Mode:")
    print("1. Single icon per style (faster)")
    print("2. Multiple variations per style (recommended)")
    
    mode = input("Choose mode (1 or 2): ").strip()
    
    if mode == "2":
        # Generate variations
        for style in style_configs:
            results = batch_generate_variations(style, num_variations=4)
            generated_files.extend(results)
            time.sleep(5)  # Delay between styles
    else:
        # Generate single icons
        for style in style_configs:
            result = generate_icon(style)
            if result:
                generated_files.append(result)
            time.sleep(5)  # Delay between generations
    
    print("\n" + "=" * 50)
    print("✅ Icon generation complete!")
    
    if generated_files:
        # Create comparison HTML
        comparison_file = create_comparison_html(generated_files)
        
        print("\n📁 Next steps:")
        print(f"1. Review generated icons at: {comparison_file}")
        print("2. Select the best ones for each style")
        print("3. Copy to: oil-painting-app/public/style-icons/")
        print("4. Rename as: classic.jpg, vangogh.jpg, monet.jpg, modern.jpg")
        print("\n💡 Tips for selection:")
        print("   - Check how they look at small sizes (64x64)")
        print("   - Ensure no recognizable forms are visible")
        print("   - Verify style is immediately recognizable from texture alone")
    else:
        print("❌ No icons were generated successfully")

if __name__ == "__main__":
    main()