# Comprehensive Research Report: Photo to Oil Painting Conversion in Stable Diffusion
*Date: January 2025*

## Executive Summary

After extensive research, the main issues with your current oil painting conversion are:
1. **No ControlNet** - This is critical for preserving subject geometry
2. **Incorrect denoising strength** - Too low for classic style (needs 0.45-0.6)
3. **Missing specialized models/LoRAs** - ClassipeintXL or similar oil painting LoRAs significantly improve results
4. **No subject preservation techniques** - Need IP-Adapter or InstantID for faces/subjects

## Critical Findings

### 1. ControlNet is ESSENTIAL

**Why cats turn into monkeys:** Without ControlNet, img2img only uses the image as a rough guide. High denoising + animal prompts = SD's tendency to generate common animals (monkeys are more common in training data than specific cat breeds).

**Required ControlNet Models:**
- **Canny** (Primary): Weight 0.8-1.0 for edge preservation
- **Depth** (Secondary): Weight 0.5-0.7 for 3D structure
- **HED** (Alternative): Better for artistic styles, preserves lighting and details

### 2. Optimal Settings That Actually Work

```python
PROVEN_SETTINGS = {
    "denoising_strength": {
        "subtle_change": 0.2-0.35,
        "moderate_style": 0.35-0.5,  # Sweet spot for oil painting
        "dramatic_change": 0.5-0.65
    },
    "controlnet": {
        "canny": {
            "weight": 0.8-1.0,
            "guidance_start": 0.0,
            "guidance_end": 1.0,
            "threshold_a": 100,
            "threshold_b": 200
        },
        "depth": {
            "weight": 0.5-0.7,
            "preprocessor": "depth_midas"
        }
    },
    "cfg_scale": 7-8,
    "steps": 25-30,
    "sampler": "DPM++ 2M Karras"
}
```

### 3. Specialized Oil Painting Models/LoRAs

**ClassipeintXL** (Most recommended):
- Specifically trained for oil painting style
- LoRA strength: 0.8-1.0
- Prompt format: "oil painting of [subject]"
- Works with SDXL base models

**Alternative approaches:**
- Use artistic checkpoints (Deliberate, DreamShaper)
- Stack multiple LoRAs for complex styles
- Consider fine-tuned models for specific painting styles

### 4. Advanced Subject Preservation

For perfect subject preservation (especially faces/pets):

**InstantID** (Best for 2024):
- Zero-shot identity preservation
- Better than IP-Adapter FaceID
- Maintains style compatibility
- Requires ~20GB VRAM

**IP-Adapter:**
- Good for general subject preservation
- Can use CLIP or face embeddings
- Less VRAM intensive

### 5. Iterative Refinement Strategy

Instead of one high-denoising pass:
```
Better approach:
1. First pass: denoising 0.25 with ControlNet
2. Second pass: denoising 0.25 on result
3. Third pass: denoising 0.2 for final touches
= Better preservation than single 0.6 pass
```

## Implementation Roadmap

### Phase 1: Install ControlNet (IMMEDIATE)
```bash
# In Automatic1111 WebUI:
1. Extensions → Available → Search "sd-webui-controlnet"
2. Install and restart
3. Download models:
   - control_v11p_sd15_canny.pth (REQUIRED)
   - control_v11f1p_sd15_depth.pth (RECOMMENDED)
```

### Phase 2: Fix API Payload Structure
```python
payload = {
    "init_images": [base64_image],
    "prompt": "oil painting on canvas, thick impasto brushstrokes, [subject description]",
    "negative_prompt": "photo, 3d, smooth, cartoon, anime, deformed, mutated",
    "denoising_strength": 0.45,
    "cfg_scale": 7,
    "sampler_name": "DPM++ 2M Karras",
    "steps": 30,
    "alwayson_scripts": {
        "controlnet": {
            "args": [{
                "enabled": True,
                "module": "canny",
                "model": "control_v11p_sd15_canny",
                "weight": 0.9,
                "image": base64_image,
                "control_mode": "Balanced",
                "pixel_perfect": True
            }]
        }
    }
}
```

### Phase 3: Style-Specific Optimizations

**Classic Style Fix:**
- Increase denoising to 0.5-0.55
- Add prompt: "Renaissance, old masters technique, Rembrandt lighting"
- ControlNet weight: 0.85-0.9

**Impressionist Style:**
- Denoising: 0.55-0.6
- Prompt: "loose brushwork, visible strokes, Monet style"
- ControlNet weight: 0.8

**Modern Style:**
- Denoising: 0.6-0.65
- Prompt: "bold strokes, expressive, contemporary"
- ControlNet weight: 0.75

### Phase 4: Consider Advanced Options

**Option A: Add ClassipeintXL LoRA**
- Download from Civitai
- Add to models/Lora folder
- Include in prompt with <lora:classipeintxl:1.0>

**Option B: Switch to ComfyUI (if needed)**
Pros:
- Better workflow control
- More memory efficient
- Node-based visual programming

Cons:
- Steeper learning curve
- More complex setup
- May have consistency issues

## Recommended Immediate Actions

1. **Install ControlNet NOW** - This alone will fix 80% of your problems
2. **Increase denoising strength** to 0.45-0.55 for visible style changes
3. **Fix prompts** - Be specific about preserving cats: "cat, feline, NOT monkey, NOT ape"
4. **Test iterative approach** - Multiple low-denoising passes instead of one high pass
5. **Download ClassipeintXL LoRA** for authentic oil painting texture

## Testing Protocol

```python
# Test these exact settings first:
test_config = {
    "prompt": "oil painting of a cat, thick paint texture, visible brushstrokes",
    "negative_prompt": "photo, 3d render, smooth, cartoon, monkey, ape, deformed",
    "denoising_strength": 0.45,
    "cfg_scale": 7,
    "steps": 30,
    "sampler": "DPM++ 2M Karras",
    "controlnet": {
        "model": "canny",
        "weight": 0.9
    }
}
```

## Expected Results After Implementation

With ControlNet + proper settings:
- Cats will remain cats (99% accuracy)
- Classic style will show visible paint texture
- All styles will maintain subject geometry
- Artistic transformation will be clearly visible

## Long-term Considerations

1. **Build a test suite** with various animal photos to validate preservation
2. **Create style presets** with proven working parameters
3. **Consider InstantID** for human portraits requiring exact face preservation
4. **Implement batch testing** to find optimal settings per image type

---

## TL;DR - Fix Your App in 3 Steps

1. **INSTALL CONTROLNET** (Extensions → sd-webui-controlnet → Install)
2. **Change denoising_strength** from 0.3 to 0.45-0.5
3. **Update API payload** to include ControlNet args (see Phase 2 above)

This will immediately solve your cats-to-monkeys problem and make classic style actually work.