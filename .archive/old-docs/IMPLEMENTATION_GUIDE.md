# Oil Painting Style Presets - Implementation Guide

## Overview
This guide provides detailed instructions for implementing oil painting style conversions using the provided presets with Stable Diffusion and Automatic1111 WebUI.

## Quick Start

### 1. Basic Usage with A1111 WebUI

1. **Load your photo** in img2img tab
2. **Choose a style preset** from `oil_painting_presets.json`
3. **Copy the prompt settings** into positive/negative prompt fields
4. **Apply the recommended parameters**:
   - Sampling method
   - Sampling steps
   - CFG Scale
   - Denoising strength
5. **Enable ControlNet** with recommended settings
6. **Generate** your oil painting

### 2. Using the Python Implementation

```python
from oil_painting_styles import OilPaintingPresetManager, OilPaintingStyle

# Initialize preset manager
manager = OilPaintingPresetManager()

# Get style preset
style = manager.get_style_preset(OilPaintingStyle.IMPRESSIONIST_LIGHT)

# Build prompts with base description
prompts = manager.build_prompt(
    OilPaintingStyle.IMPRESSIONIST_LIGHT,
    base_prompt="golden retriever in garden",
    preserve_subject=True
)

# Get optimized img2img parameters
params = manager.get_img2img_params(
    OilPaintingStyle.IMPRESSIONIST_LIGHT,
    preserve_level="high"  # high preservation for pets
)
```

## Style Selection Guide

### Subject-Based Recommendations

| Subject Type | Primary Styles | Secondary Styles |
|-------------|---------------|------------------|
| **Human Portraits** | Portrait Master, Classical Renaissance | Baroque Drama, Photorealistic Oil |
| **Pets/Animals** | Portrait Master, Classical Renaissance | Photorealistic Oil (for detail) |
| **Landscapes** | Romantic Landscape, Impressionist Light | Post-Impressionist Expression |
| **Still Life** | Photorealistic Oil, Classical Renaissance | Impressionist Light |
| **Groups/Crowds** | Classical Renaissance, Baroque Drama | Impressionist Light |
| **Architecture** | Romantic Landscape, Classical Renaissance | Impressionist Light |
| **Abstract Subjects** | Modern Abstract, Post-Impressionist | Impressionist Light |

## Preservation Techniques

### Face Preservation Workflow

1. **Initial Pass** (High Preservation):
   - Denoising: 0.35-0.4
   - ControlNet Canny: Weight 0.7
   - Enable "Restore Faces" option

2. **Refinement Pass** (If Needed):
   - Use Inpainting on face only
   - Denoising: 0.25-0.3
   - Keep original face structure

3. **ADetailer Integration**:
   - Enable ADetailer extension
   - Use "face_yolov8n.pt" model
   - Set confidence to 0.3
   - Inpaint denoising: 0.35

### Pet/Animal Preservation

1. **Structure Maintenance**:
   - Use OpenPose for body structure
   - ControlNet weight: 0.65
   - Add to prompt: "accurate [animal] anatomy"

2. **Fur Texture**:
   - Canny ControlNet at 0.5 weight
   - Preserve fur direction and patterns
   - Lower denoising (0.4-0.45)

## Advanced Techniques

### Multi-Pass Processing

#### Pass 1: Structure
```
Denoising: 0.3
ControlNet: High weight (0.7-0.8)
Focus: Preserve geometry
```

#### Pass 2: Style
```
Denoising: 0.5-0.6
ControlNet: Medium weight (0.4-0.5)
Focus: Apply artistic style
```

#### Pass 3: Details (Optional)
```
Denoising: 0.2-0.3
Inpainting: Specific areas only
Focus: Refine problem areas
```

### Regional Prompter Setup

For differential styling (e.g., painterly background, detailed subject):

```
Region 1 (Subject):
- Weight: 1.2
- Prompt: base_prompt + "detailed, sharp focus"
- ControlNet weight: 0.7

Region 2 (Background):
- Weight: 0.8
- Prompt: "impressionist background, loose brushstrokes"
- ControlNet weight: 0.3
```

## Troubleshooting Common Issues

### Problem: Face/Subject Not Recognizable

**Solutions**:
1. Lower denoising strength (try 0.05 increments)
2. Increase ControlNet weight
3. Use multiple ControlNet units (Canny + OpenPose)
4. Try Photorealistic Oil style first, then convert

### Problem: Not Painterly Enough

**Solutions**:
1. Increase denoising strength (0.55-0.7)
2. Add more style keywords with higher weights
3. Lower ControlNet weight for background
4. Use Post-Impressionist or Modern Abstract styles

### Problem: Colors Look Wrong

**Solutions**:
1. Adjust CFG scale (lower for more creative interpretation)
2. Add color-specific keywords to prompt
3. Use color correction in post-processing
4. Try different samplers (Euler a for vibrant, DPM++ for accurate)

### Problem: Artifacts or Distortions

**Solutions**:
1. Check image resolution (use SD-optimal sizes)
2. Reduce batch size if using batch generation
3. Lower CFG scale if too high (>10)
4. Enable "Restore Faces" for facial artifacts

## Optimal Settings by Style

### High Detail Styles
(Classical Renaissance, Photorealistic Oil, Portrait Master)
- **Resolution**: 512x512 minimum, 768x768 optimal
- **Steps**: 30-40
- **CFG**: 7-8.5
- **Sampler**: DPM++ 2M Karras

### Expressive Styles
(Impressionist, Post-Impressionist, Modern Abstract)
- **Resolution**: 512x512 works well
- **Steps**: 20-30
- **CFG**: 6-7
- **Sampler**: Euler a or DPM++ SDE Karras

### Dramatic Styles
(Baroque Drama, Romantic Landscape)
- **Resolution**: 512x768 for portraits, 768x512 for landscapes
- **Steps**: 30-35
- **CFG**: 7.5-8
- **Sampler**: DPM++ 2M Karras

## Batch Processing Tips

For converting multiple photos:

1. **Test Settings First**:
   - Process one image with various settings
   - Save successful seed values
   - Note optimal denoising range

2. **Batch Configuration**:
   ```python
   batch_settings = {
       "batch_size": 2,  # Process 2 at a time
       "n_iter": 4,       # Generate 4 variations
       "seed": -1,        # Random seeds
       "subseed_strength": 0.1  # Slight variations
   }
   ```

3. **Progressive Processing**:
   - Start with lower denoising
   - Gradually increase for variety
   - Save intermediate results

## Integration with Extensions

### ControlNet Multi-Unit Setup

For maximum control:
```
Unit 1: Canny (Edges)
- Weight: 0.6
- Guidance: 0.0-0.85

Unit 2: Depth (3D Structure)
- Weight: 0.4
- Guidance: 0.0-0.7

Unit 3: OpenPose (Human Pose)
- Weight: 0.7
- Guidance: 0.0-0.9
```

### Ultimate SD Upscale Settings

For high-resolution output:
```
Target Size: 2048x2048
Upscaler: R-ESRGAN 4x+
Tile Size: 512
Padding: 32
Denoising: 0.2
```

## Performance Optimization

### VRAM Management
- **Low VRAM (4-6GB)**: Use 512x512, batch size 1
- **Medium VRAM (8-12GB)**: Use 768x768, batch size 2
- **High VRAM (16GB+)**: Use 1024x1024, batch size 4

### Speed Optimization
- Use fewer steps (20-25) for initial tests
- Enable xformers for memory efficiency
- Use "Euler a" sampler for faster generation
- Disable "Restore Faces" for speed (enable only for final)

## Quality Assurance Checklist

Before finalizing:
- [ ] Subject is recognizable
- [ ] Oil painting characteristics visible
- [ ] No major artifacts or distortions
- [ ] Colors appropriate for style
- [ ] Composition maintained from original
- [ ] Brushstroke texture appropriate
- [ ] Lighting consistent with style
- [ ] Background complements subject

## Next Steps

1. **Experiment** with different styles on the same image
2. **Create variations** using different seeds
3. **Combine styles** using Regional Prompter
4. **Train LoRAs** for specific artistic styles
5. **Build automated pipelines** using the Python implementation