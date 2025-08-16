#!/usr/bin/env python3
"""
Create masterpiece oil painting conversions using professional prompt template
Generates gallery-quality oil paintings with three distinct artistic styles
"""

import requests
import json
import base64
from PIL import Image
import io
from pathlib import Path
import time
import logging
import random

logging.basicConfig(level=logging.INFO, format='%(message)s')
logger = logging.getLogger(__name__)

# Professional SD parameters optimized for authentic oil painting
MASTERPIECE_PARAMS = {
    "denoising_strength": 0.65,  # Much higher for true oil painting transformation
    "cfg_scale": 7.0,  # Higher for stronger style adherence
    "steps": 50,  # More steps for better quality
    "sampler": "DPM++ 2M SDE Karras",  # Better for artistic styles
    "clip_skip": 2,  # Better for artistic styles
    "enable_hr": True,  # High-res fix for better details
    "hr_scale": 1.5,  # Upscale for quality
    "hr_denoising_strength": 0.45,  # Secondary denoising for oil texture
}

# Professional masterpiece prompt template
def create_masterpiece_prompt(subject, style_config):
    """Create a professional oil painting prompt using the masterpiece template"""
    
    # Determine if cat or dog for better descriptions
    is_cat = "cat" in subject.lower()
    
    # Subject-specific personality traits
    if is_cat:
        personalities = [
            "regal and contemplative",
            "mysterious and elegant", 
            "wise and serene",
            "proud and majestic",
            "graceful and poised"
        ]
    else:
        personalities = [
            "loyal and noble",
            "faithful and dignified",
            "courageous and steadfast",
            "gentle and wise",
            "devoted and regal"
        ]
    
    personality = random.choice(personalities)
    
    # Build the masterpiece prompt with enhanced oil painting emphasis
    prompt = f"""(oil painting:1.5), (thick impasto:1.3), (visible brushstrokes:1.4), (canvas texture:1.2), masterpiece oil painting, professional portrait of {subject}. Capture their essential personality as {personality}.
Lighting: {style_config['lighting']}
Setting & Palette: {style_config['setting']}
Artistic Style: {style_config['artistic_style']}
Medium: traditional oil on canvas, museum quality, gallery artwork, thick paint application, painterly style"""
    
    return prompt

# Three distinct masterpiece styles using the template
MASTERPIECE_STYLES = {
    "classic": {
        "name": "Classic Rembrandt Master",
        "lighting": "Dramatic chiaroscuro lighting from a window on the left, casting deep shadows and golden highlights on the fur. The light creates a divine glow around the subject",
        "setting": "Set against a dark mahogany background with subtle warm undertones. Limited palette of burnt umber, raw sienna, ivory black, and golden ochre. The overall atmosphere is timeless and contemplative",
        "artistic_style": "Painted in the style of Rembrandt van Rijn. Feature precise, controlled brushwork with visible canvas texture, thick oil paint application. Layers of translucent glazes create depth. Rich impasto highlights catch the light. Heavy oil paint texture, visible brushstrokes, traditional oil on canvas",
        "negative_prompt": "digital art, anime, cartoon, 3d render, photograph, photorealistic, smooth, plastic, CGI, computer graphics, modern digital, sharp photo, clean edges, perfect details"
    },
    "impressionist": {
        "name": "Impressionist Light Master", 
        "lighting": "Soft, diffused natural light from above, as if filtered through garden leaves. Dappled shadows dance across the subject, creating movement and life",
        "setting": "Set against a sun-drenched garden background with soft blues, lavenders, and pale greens. Limited palette of cerulean, violet, cadmium yellow, and viridian. The atmosphere is dreamy and ethereal",
        "artistic_style": "Painted in the style of Claude Monet and John Singer Sargent. Feature broken color technique with visible, energetic brushstrokes, thick oil paint texture. Short, quick marks of pure color that blend optically. Heavy impasto, rough canvas texture, authentic oil painting on canvas. Captures the fleeting quality of light",
        "negative_prompt": "digital art, anime, cartoon, 3d render, photograph, photorealistic, sharp details, hard edges, smooth surface, clean lines, perfect, CGI, computer graphics"
    },
    "modern": {
        "name": "Modern Expression Master",
        "lighting": "Bold, dramatic lighting from multiple sources creating strong color contrasts. Vibrant highlights against deep, colorful shadows",
        "setting": "Set against an energetic background of swirling colors - deep blues, vibrant oranges, and emerald greens. Bold palette with pure, unmixed colors. The atmosphere is passionate and emotionally charged",
        "artistic_style": "Painted in the style of Vincent van Gogh. Feature expressive, rhythmic brushwork with extremely thick impasto application, visible paint texture, rough canvas. Swirling, energetic strokes that convey emotion. Paint applied with palette knife and brush for varied texture. Heavy oil paint, three-dimensional paint surface",
        "negative_prompt": "digital art, anime, cartoon, 3d render, photograph, photorealistic, smooth, flat surface, clean, perfect details, CGI, computer graphics, sharp edges"
    }
}

def enhance_with_controlnet_params(style_key):
    """Get optimal ControlNet parameters for each style - lower weights for more artistic freedom"""
    
    if style_key == "classic":
        return {
            "module": "canny",
            "model": "control_v11p_sd15_canny",
            "weight": 0.45,  # Lower weight for more painterly transformation
            "guidance_start": 0,
            "guidance_end": 0.7,
            "threshold_a": 100,  # Less edge detection for softer look
            "threshold_b": 200
        }
    elif style_key == "impressionist":
        return {
            "module": "depth_midas",
            "model": "control_v11f1p_sd15_depth",
            "weight": 0.35,  # Very soft for impressionist freedom
            "guidance_start": 0.2,
            "guidance_end": 0.6
        }
    else:  # modern
        return {
            "module": "lineart_coarse",  # Coarser lines for expressive style
            "model": "control_v11p_sd15_lineart",
            "weight": 0.40,  # Low weight for maximum expression
            "guidance_start": 0,
            "guidance_end": 0.65
        }

def convert_to_masterpiece(img_path, subject_type, style_key):
    """Convert image to masterpiece oil painting using professional template"""
    
    try:
        # Load and prepare image
        with open(img_path, 'rb') as f:
            img_data = f.read()
        img_base64 = base64.b64encode(img_data).decode()
        
        # Get style configuration
        style = MASTERPIECE_STYLES[style_key]
        
        # Create masterpiece prompt
        subject = f"beloved {subject_type} companion"
        prompt = create_masterpiece_prompt(subject, style)
        
        # Get ControlNet parameters for this style
        controlnet_params = enhance_with_controlnet_params(style_key)
        
        # Prepare API payload with professional settings
        payload = {
            "init_images": [f"data:image/jpeg;base64,{img_base64}"],
            "prompt": prompt,
            "negative_prompt": style["negative_prompt"] + ", photorealistic, photograph, smooth textures, digital rendering",
            "denoising_strength": MASTERPIECE_PARAMS["denoising_strength"],
            "cfg_scale": MASTERPIECE_PARAMS["cfg_scale"],
            "steps": MASTERPIECE_PARAMS["steps"],
            "sampler_name": MASTERPIECE_PARAMS["sampler"],
            "width": 512,  # Standard resolution for better processing
            "height": 512,
            "restore_faces": False,  # Keep artistic style
            "override_settings": {
                "CLIP_stop_at_last_layers": MASTERPIECE_PARAMS["clip_skip"],
                "sd_vae": "vae-ft-mse-840000-ema-pruned.ckpt"  # Better VAE for colors
            },
            "controlnet_units": [
                {
                    "input_image": f"data:image/jpeg;base64,{img_base64}",
                    "module": controlnet_params["module"],
                    "model": controlnet_params["model"],
                    "weight": controlnet_params["weight"],
                    "guidance_start": controlnet_params["guidance_start"],
                    "guidance_end": controlnet_params["guidance_end"],
                    "control_mode": 1,  # ControlNet is more important
                    "pixel_perfect": True
                }
            ]
        }
        
        # Call SD API
        response = requests.post(
            "http://localhost:7860/sdapi/v1/img2img",
            json=payload,
            timeout=120  # Longer timeout for higher quality
        )
        
        if response.status_code == 200:
            result = response.json()
            converted_data = base64.b64decode(result['images'][0])
            converted_img = Image.open(io.BytesIO(converted_data))
            
            # Return image and the prompt used
            return converted_img, prompt, True
        else:
            logger.error(f"API error: {response.status_code}")
            return None, None, False
            
    except Exception as e:
        logger.error(f"Conversion error: {str(e)[:100]}")
        return None, None, False

def process_masterpiece_portraits():
    """Process quality portraits with masterpiece prompt template"""
    
    input_dir = Path("evaluation_dataset/quality_portraits")
    output_dir = Path("public/evaluation-images/masterpiece_styles")
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # Tasks directory for masterpiece tasks
    tasks_dir = Path("evaluation_dataset/masterpiece_tasks")
    tasks_dir.mkdir(parents=True, exist_ok=True)
    
    logger.info("=" * 70)
    logger.info("🎨 CREATING MASTERPIECE OIL PAINTINGS")
    logger.info("Using Professional Gallery-Quality Prompt Template")
    logger.info("=" * 70)
    
    # Get portrait images starting from task 11
    cat_portraits = sorted(input_dir.glob("cat_*.jpg"))
    dog_portraits = sorted(input_dir.glob("dog_*.jpg"))
    
    # Process images starting from task 11 (10 cats + 10 dogs = 20 images)
    all_portraits = []
    task_id = 11  # Start from task 11
    
    # Add 10 cats
    for cat_img in cat_portraits[:10]:
        all_portraits.append((task_id, "cat", cat_img))
        task_id += 1
    
    # Add 10 dogs
    for dog_img in dog_portraits[:10]:
        all_portraits.append((task_id, "dog", dog_img))
        task_id += 1
    
    logger.info(f"\n📁 Processing {len(all_portraits)} portraits × 3 masterpiece styles")
    logger.info(f"🎯 Starting from Task ID: 11")
    logger.info(f"⚙️  Settings: Denoising={MASTERPIECE_PARAMS['denoising_strength']}, "
                f"CFG={MASTERPIECE_PARAMS['cfg_scale']}, Steps={MASTERPIECE_PARAMS['steps']}")
    
    successful = 0
    all_tasks = []
    
    for task_id, animal_type, img_path in all_portraits:
        logger.info(f"\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
        logger.info(f"🖼️  Task {task_id}: {animal_type.upper()} - {img_path.name}")
        
        # Copy original to public folder
        original_img = Image.open(img_path)
        # Resize to 512x512 for consistency
        original_img = original_img.resize((512, 512), Image.Resampling.LANCZOS)
        original_output = output_dir / f"task_{task_id}_original.jpg"
        original_img.save(original_output, quality=95)
        
        # Task data structure
        task_data = {
            "id": task_id,
            "category": animal_type,
            "original_image": f"/evaluation-images/masterpiece_styles/task_{task_id}_original.jpg",
            "conversions": {},
            "parameters": MASTERPIECE_PARAMS,
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
        }
        
        # Convert in each masterpiece style
        for style_key, style_info in MASTERPIECE_STYLES.items():
            logger.info(f"\n  🎨 Creating {style_info['name']}...")
            
            converted_img, prompt_used, success = convert_to_masterpiece(
                img_path, animal_type, style_key
            )
            
            if success and converted_img:
                # Save converted masterpiece
                converted_output = output_dir / f"task_{task_id}_{style_key}.jpg"
                converted_img.save(converted_output, quality=95)
                
                task_data["conversions"][style_key] = {
                    "image": f"/evaluation-images/masterpiece_styles/task_{task_id}_{style_key}.jpg",
                    "style_name": style_info["name"],
                    "prompt": prompt_used,
                    "lighting": style_info["lighting"],
                    "setting": style_info["setting"],
                    "artistic_style": style_info["artistic_style"]
                }
                
                successful += 1
                logger.info(f"    ✅ Masterpiece created: {style_key}")
                logger.info(f"    📝 Prompt excerpt: {prompt_used[:150]}...")
            else:
                logger.info(f"    ❌ Failed to create {style_key}")
            
            time.sleep(2)  # Rate limiting between conversions
        
        # Save task file
        task_file = tasks_dir / f"task_{str(task_id).zfill(3)}.json"
        with open(task_file, 'w') as f:
            json.dump(task_data, f, indent=2)
        
        all_tasks.append(task_data)
        
        # Brief pause between different images
        time.sleep(3)
    
    # Create comprehensive summary
    summary = {
        "dataset": "masterpiece_oil_paintings",
        "template": "Professional Masterpiece Prompt Template",
        "total_images": len(all_portraits),
        "total_conversions": successful,
        "task_range": {
            "start": 11,
            "end": 11 + len(all_portraits) - 1
        },
        "styles": {
            style_key: {
                "name": style["name"],
                "description": f"{style['lighting'][:100]}..."
            } for style_key, style in MASTERPIECE_STYLES.items()
        },
        "parameters": MASTERPIECE_PARAMS,
        "tasks": all_tasks
    }
    
    summary_file = tasks_dir / "masterpiece_summary.json"
    with open(summary_file, 'w') as f:
        json.dump(summary, f, indent=2)
    
    # Final report
    logger.info("\n" + "=" * 70)
    logger.info("✨ MASTERPIECE CREATION COMPLETE!")
    logger.info(f"📊 Successfully created: {successful}/{len(all_portraits)*3} masterpieces")
    logger.info(f"📁 Gallery location: {output_dir}")
    logger.info(f"📋 Task files: {tasks_dir}")
    logger.info("\n🎨 Masterpiece Styles Created:")
    logger.info("  • Classic Rembrandt: Dramatic chiaroscuro, rich glazes")
    logger.info("  • Impressionist Light: Broken color, optical blending")
    logger.info("  • Modern Expression: Bold impasto, emotional energy")
    logger.info("\n🖼️ Ready for gallery exhibition and evaluation!")

if __name__ == "__main__":
    # Check if quality portraits exist
    portrait_dir = Path("evaluation_dataset/quality_portraits")
    
    if not portrait_dir.exists():
        logger.error("❌ Quality portraits directory not found!")
        logger.info("Please ensure evaluation_dataset/quality_portraits exists with images")
        exit(1)
    
    cat_count = len(list(portrait_dir.glob("cat_*.jpg")))
    dog_count = len(list(portrait_dir.glob("dog_*.jpg")))
    
    if cat_count >= 10 and dog_count >= 10:
        logger.info(f"✅ Found {cat_count} cat and {dog_count} dog portraits")
        logger.info("🚀 Starting masterpiece creation process...")
        process_masterpiece_portraits()
    else:
        logger.error(f"❌ Insufficient portraits: {cat_count} cats, {dog_count} dogs")
        logger.info("Need at least 10 of each for masterpiece creation")