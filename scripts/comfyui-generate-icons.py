#!/usr/bin/env python3
"""Generate style icons using ComfyUI API"""

import json
import time
import requests
from pathlib import Path

COMFYUI_URL = "http://localhost:8188"

style_configs = [
    {
        "id": "classic",
        "prompt": """(macro photography:1.4) of Renaissance oil painting surface texture, extreme closeup of paint surface,
                     subtle glazing layers with gentle impasto highlights, burnt umber and raw sienna paint ridges,
                     varnished surface with golden light reflection, visible fine linen canvas weave texture underneath paint,
                     old master technique with delicate scumbling, smooth transitions between paint layers,
                     warm earth tones, ochre and burnt sienna pigments, professional museum quality paint texture,
                     slight craquelure pattern in aged varnish, soft diffused lighting on paint surface,
                     DSLR macro lens photography, focus stacking, high detail texture scan""",
        "negative": "portrait, face, person, figure, animal, landscape, objects, text, watermark, logo, digital art, 3d render, smooth plastic, flat color, cartoon, illustration, blurry, out of focus, low quality, jpeg artifacts",
        "cfg": 9.5,
        "steps": 40,
        "sampler": "dpmpp_2m_sde"
    },
    {
        "id": "vangogh",
        "prompt": """(macro photography:1.5) extreme closeup of thick impasto oil paint texture, Van Gogh style energetic brushwork,
                     dramatic swirling patterns in ultramarine blue and cadmium yellow paint, 5mm thick paint ridges,
                     palette knife marks creating deep grooves and peaks, wet-on-wet paint mixing visible,
                     dynamic circular and curved brush movements frozen in thick paint, chrome yellow and cobalt blue pigments,
                     heavy texture with strong directional lighting casting shadows between paint ridges,
                     expressive gestural marks, paint squeezed directly from tube, thick buttery consistency,
                     professional art photography with raking light, focus stacked macro shot, museum documentation quality""",
        "negative": "portrait, face, person, starry night, sunflowers, subject matter, landscape, smooth surface, thin paint, watercolor, digital art, 3d render, flat, illustration, cartoon, low quality, blurry",
        "cfg": 10.5,
        "steps": 45,
        "sampler": "dpmpp_3m_sde"
    },
    {
        "id": "monet",
        "prompt": """(macro photography:1.3) impressionist paint texture closeup, Claude Monet brushwork technique,
                     soft broken color application with visible individual paint dabs, cerulean blue and rose madder dots,
                     gentle feathery brushstrokes creating optical color mixing, delicate paint texture with subtle impasto,
                     lilac, coral pink, and sage green paint touches, wet paint blending at edges,
                     loose gestural marks suggesting light and atmosphere, visible canvas texture between paint strokes,
                     soft natural lighting revealing gentle paint texture, shallow depth of field,
                     professional macro photography of fine art surface, museum quality documentation""",
        "negative": "portrait, face, water lilies subject, sharp details, hard edges, geometric, smooth gradient, digital art, 3d render, photograph of real scene, illustration, cartoon, flat color, low quality",
        "cfg": 8.5,
        "steps": 35,
        "sampler": "euler_ancestral"
    },
    {
        "id": "modern",
        "prompt": """(macro photography:1.4) contemporary abstract oil paint texture, bold gestural brushwork closeup,
                     high contrast between smooth glazed areas and thick impasto sections, fluorescent magenta and electric teal paint,
                     aggressive palette knife scraping revealing underlayers, mixed media texture with sand or pumice in paint,
                     geometric hard-edge painting meets expressionist texture, metallic and iridescent pigments catching light,
                     experimental techniques with drips and splatters, industrial materials mixed with traditional oil paint,
                     stark shadows emphasizing three-dimensional paint relief, dynamic angular compositions in paint application,
                     professional art photography with dramatic lighting, ultra high resolution texture scan""",
        "negative": "portrait, face, traditional painting, representational art, smooth blending, classical technique, digital art, 3d render, photograph of real objects, illustration, low quality, blurry, flat",
        "cfg": 11.0,
        "steps": 38,
        "sampler": "dpmpp_2m_sde_gpu"
    }
]

def create_workflow(prompt, negative, seed=None, cfg=11, steps=35, sampler="dpmpp_2m"):
    """Create ComfyUI workflow for icon generation with style-specific settings"""
    
    workflow = {
        "3": {
            "class_type": "KSampler",
            "inputs": {
                "cfg": cfg,  # Style-specific CFG
                "denoise": 1,
                "latent_image": ["5", 0],
                "model": ["4", 0],
                "negative": ["7", 0],
                "positive": ["6", 0],
                "sampler_name": sampler,
                "scheduler": "karras",
                "seed": seed if seed else 42,
                "steps": steps
            }
        },
        "4": {
            "class_type": "CheckpointLoaderSimple",
            "inputs": {
                "ckpt_name": "sdxl_base_1.0.safetensors"
            }
        },
        "5": {
            "class_type": "EmptyLatentImage",
            "inputs": {
                "batch_size": 1,
                "height": 1024,  # SDXL native resolution
                "width": 1024   # Will be resized to 512x512 in post
            }
        },
        "6": {
            "class_type": "CLIPTextEncode",
            "inputs": {
                "clip": ["4", 1],
                "text": prompt + ", ultra high quality, 8k resolution, extreme detail, professional macro photography, museum documentation, fine art photography, texture study, paint surface analysis, archival quality"
            }
        },
        "7": {
            "class_type": "CLIPTextEncode",
            "inputs": {
                "clip": ["4", 1],
                "text": negative + ", nsfw, ugly, deformed, noisy, pixelated, grainy, low resolution"
            }
        },
        "8": {
            "class_type": "VAEDecode",
            "inputs": {
                "samples": ["3", 0],
                "vae": ["4", 2]
            }
        },
        "9": {
            "class_type": "SaveImage",
            "inputs": {
                "filename_prefix": "style_icon",
                "images": ["8", 0]
            }
        }
    }
    
    return workflow

def generate_icon(style_config):
    """Generate a single style icon"""
    
    print(f"\n🎨 Generating {style_config['id']} style icon...")
    
    workflow = create_workflow(
        style_config["prompt"],
        style_config["negative"],
        seed=hash(style_config["id"]) % 1000000,
        cfg=style_config.get("cfg", 11),
        steps=style_config.get("steps", 35),
        sampler=style_config.get("sampler", "dpmpp_2m")
    )
    
    # Send to ComfyUI
    try:
        response = requests.post(
            f"{COMFYUI_URL}/api/prompt",
            json={"prompt": workflow}
        )
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Queued {style_config['id']} icon generation")
            return result.get("prompt_id")
        else:
            print(f"❌ Failed to queue {style_config['id']}: {response.status_code}")
            return None
            
    except Exception as e:
        print(f"❌ Error generating {style_config['id']}: {e}")
        return None

def main():
    print("🚀 Starting Style Icon Generation")
    print("=" * 50)
    
    # Check if ComfyUI is running
    try:
        response = requests.get(f"{COMFYUI_URL}/api/prompt")
        print("✅ ComfyUI is running")
    except:
        print("❌ ComfyUI is not running. Please start it first.")
        print("   Run: cd /path/to/ComfyUI && python main.py")
        return
    
    # Generate each icon
    for style in style_configs:
        prompt_id = generate_icon(style)
        if prompt_id:
            print(f"   Waiting for completion...")
            time.sleep(10)  # Wait for generation
    
    print("\n" + "=" * 50)
    print("✅ Icon generation complete!")
    print("\n📁 Next steps:")
    print("1. Check ComfyUI/output/ for generated images")
    print("2. Select the best ones")
    print("3. Copy to oil-painting-app/public/style-icons/")
    print("4. Rename as: classic.jpg, vangogh.jpg, monet.jpg, modern.jpg")

if __name__ == "__main__":
    main()