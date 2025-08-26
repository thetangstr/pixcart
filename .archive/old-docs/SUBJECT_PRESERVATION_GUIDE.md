# Subject Preservation Guide for Oil Painting Conversion

## Core Problem Solved
The application was transforming subjects (cats becoming other animals, people changing appearance) instead of just applying oil painting styles. This guide ensures subjects remain unchanged while only the artistic style is modified.

## Key Changes Applied

### 1. Denoising Strength Optimization
**Previous Issue**: Denoising at 0.4-0.52 gave SD too much creative freedom

**New Settings**:
- Classic Portrait: 0.28 (was 0.4)
- Thick & Textured: 0.35 (was 0.52)  
- Soft Impressionist: 0.3 (was 0.45)

**Rationale**: Lower denoising preserves original geometry and features while still allowing style transfer

### 2. Prompt Engineering for Subject Lock

**Key Additions to Positive Prompts**:
- Start every prompt with "same subject"
- Focus on TECHNIQUE words: "painting technique", "brushwork method", "paint application"
- Remove subject-descriptive words like "portrait" that might trigger content changes
- End with "painted version" to emphasize style-only transformation

**Enhanced Negative Prompts**:
- Added subject-preservation terms first: "different subject", "changed species", "transformed animal"
- Include variations: "morphed subject", "hybrid creature", "altered identity"
- Prevent any form of subject modification

### 3. Recommended A1111 Extensions & Settings

#### ControlNet (ESSENTIAL)
**Purpose**: Locks subject geometry while allowing style changes

**Recommended Setup**:
```
Model: control_v11p_sd15_canny
Preprocessor: canny
Control Weight: 0.6-0.8
Starting Control Step: 0
Ending Control Step: 0.7
Control Mode: Balanced
```

**Alternative for Depth**:
```
Model: control_v11f1p_sd15_depth
Preprocessor: depth_midas
Control Weight: 0.5-0.7
```

#### Regional Prompter
**Purpose**: Apply different denoising to subject vs background

**Setup**:
```
Mode: Mask
Base Ratio: 0.2
Use base prompt: Yes
Use common prompt: Yes
Use common negative prompt: Yes
```

**Usage**: Create mask for main subject, use lower denoising (0.15-0.25) for subject area

#### Ultimate SD Upscale
**Purpose**: Maintain painterly texture at higher resolutions

**Settings**:
```
Target Size Type: Scale from image size
Scale: 2
Upscaler: R-ESRGAN 4x+
Type: Chess
Tile width: 512
Tile height: 512
Mask blur: 8
Padding: 32
Denoising: 0.2
```

### 4. Additional img2img Settings

**Recommended Configuration**:
```json
{
  "resize_mode": 0,  // Just resize
  "image_cfg_scale": 1.5,  // If using ControlNet
  "mask_blur": 4,
  "inpainting_fill": 1,  // Original
  "inpaint_full_res": false,
  "inpaint_full_res_padding": 32,
  "seed": -1,  // Random, or use fixed for consistency
  "subseed": -1,
  "subseed_strength": 0,
  "seed_resize_from_h": -1,
  "seed_resize_from_w": -1
}
```

### 5. Sampler Recommendations

**Best for Subject Preservation**:
1. DPM++ 2M Karras - Most stable, good for portraits
2. Euler a - Good for textured styles
3. DPM++ SDE Karras - Alternative for stubborn cases

**Avoid**: DDIM, Heun (can cause more drift)

### 6. Testing Protocol

1. **Test Image Selection**: Use clear subjects (face, pet, object)
2. **Baseline Test**: Run at 0.2 denoising first
3. **Incremental Adjustment**: Increase by 0.05 until style is visible
4. **Subject Check**: If subject changes, reduce by 0.1 and add ControlNet
5. **Batch Testing**: Generate 4-8 images with different seeds

### 7. Troubleshooting

**Subject Still Changing?**
- Reduce denoising by 0.05
- Increase ControlNet weight to 0.8-0.9
- Add "exact same [subject type]" to prompt start
- Check if model is trained on specific subjects (use more general model)

**Not Enough Style Transfer?**
- Increase CFG scale by 1-2 points
- Add more technique-specific terms
- Use two ControlNet units: Canny at 0.6 + Depth at 0.4
- Try inpainting specific areas that need more style

**Color Shifts Too Dramatic?**
- Add "original colors" to positive prompt
- Use Color ControlNet model additionally
- Reduce CFG scale by 1-2 points

### 8. Quality Assurance Checklist

Before deployment, verify:
- [ ] Cat remains a cat (same breed, features)
- [ ] Human faces keep same identity
- [ ] Objects maintain their form
- [ ] Only texture/style changes
- [ ] No species transformations
- [ ] No feature morphing
- [ ] Colors shift artististically but not unrealistically

## Implementation Notes

The updated `/Users/Kailor/Desktop/Projects/pixcart_v2/oil-painting-app/app/lib/oilPaintingStyles.ts` file now contains:
- Optimized denoising strengths (0.28-0.35 range)
- Subject-preserving prompts
- Anti-transformation negative prompts
- Technique-focused language

These settings prioritize subject fidelity while still achieving authentic oil painting aesthetics.