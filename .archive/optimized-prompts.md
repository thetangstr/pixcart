# Optimized Oil Painting Style Prompts for Stable Diffusion

## Analysis of Current Prompts

### Common Issues Identified:
1. **Over-weighting**: Too many (1.4-1.6) weights can conflict and reduce consistency
2. **Redundancy**: Multiple similar terms dilute the prompt effectiveness
3. **Missing technical terms**: Lack of specific painting terminology
4. **Weak negative prompts**: Not comprehensive enough to prevent common artifacts

## OPTIMIZED STYLE CONFIGURATIONS

---

## Style 1: Classic Portrait (Renaissance/Academic)

### Optimized Positive Prompt:
```
oil painting portrait, Renaissance technique, academic realism, glazing layers, sfumato shading, chiaroscuro lighting, old master style, canvas texture, varnished finish, classical composition, natural skin tones, subtle gradients, museum quality, professional portrait artist, traditional pigments, refined details
```

### Optimized Negative Prompt:
```
photograph, digital art, 3d render, cgi, anime, cartoon, illustration, watercolor, acrylic, sketch, pencil, charcoal, flat colors, oversaturated, neon, modern art, abstract, impressionist, expressionist, rough texture, visible brushstrokes, impasto, plastic skin, airbrushed, smooth gradient, vector art, low quality, blurry, distorted features, bad anatomy
```

### Recommended Settings:
- **Sampling Method**: DPM++ 2M Karras or DPM++ SDE Karras
- **Steps**: 30-40
- **CFG Scale**: 6-8
- **Denoising Strength**: 0.35-0.45
- **ControlNet Canny**: 0.4-0.5 weight
- **ControlNet Depth**: 0.3-0.4 weight
- **Clip Skip**: 1-2

### Key Improvements:
- Removed excessive weighting for cleaner interpretation
- Added specific techniques: "glazing layers", "sfumato", "chiaroscuro"
- Included "canvas texture" and "varnished finish" for authenticity
- Expanded negative prompt to exclude competing styles

---

## Style 2: Thick & Textured (Van Gogh/Expressionist)

### Optimized Positive Prompt:
```
thick impasto oil painting, heavy paint application, Van Gogh technique, visible palette knife marks, three-dimensional paint texture, bold brushstrokes, expressive color, swirling patterns, textured canvas, rough paint surface, dynamic movement, saturated pigments, energetic application, chunky paint buildup, artistic interpretation, post-impressionist style
```

### Optimized Negative Prompt:
```
smooth surface, flat painting, thin paint, watercolor, digital art, photograph, 3d render, anime, subtle texture, refined brushwork, photorealistic, glazed finish, academic style, precise details, clean edges, minimalist, pencil, ink, marker, airbrush, vector graphics, low texture, polished, sleek, uniform color, gradient, blended
```

### Recommended Settings:
- **Sampling Method**: Euler a or DPM++ 2M Karras
- **Steps**: 35-45
- **CFG Scale**: 7-9
- **Denoising Strength**: 0.45-0.60
- **ControlNet Canny**: 0.5-0.6 weight
- **ControlNet Depth**: 0.4-0.5 weight
- **Clip Skip**: 2

### Key Improvements:
- Added "palette knife marks" and "three-dimensional paint texture"
- Included "swirling patterns" for Van Gogh character
- Strengthened negative prompt against smooth surfaces
- Focused on texture-specific terminology

---

## Style 3: Soft & Dreamy (Impressionist/Monet)

### Optimized Positive Prompt:
```
soft impressionist oil painting, Monet style brushwork, broken color technique, atmospheric light, plein air painting, gentle brushstrokes, color vibration, optical mixing, morning light, hazy atmosphere, romantic mood, French impressionism, loose painting style, captured moment, natural lighting, harmonious palette, outdoor scene feeling, light-filled composition
```

### Optimized Negative Prompt:
```
sharp focus, hard edges, photographic detail, dark shadows, high contrast, thick impasto, heavy texture, precise lines, technical drawing, digital precision, 3d render, anime, cartoon, hyperrealistic, gothic, noir, dramatic lighting, bold outlines, geometric, architectural precision, harsh colors, neon, oversaturated, flat illustration
```

### Recommended Settings:
- **Sampling Method**: DPM++ 2M Karras or Euler
- **Steps**: 25-35
- **CFG Scale**: 5-7
- **Denoising Strength**: 0.40-0.50
- **ControlNet Canny**: 0.3-0.4 weight (lower for softer edges)
- **ControlNet Depth**: 0.4-0.5 weight
- **Clip Skip**: 1-2

### Key Improvements:
- Added impressionist techniques: "broken color", "optical mixing"
- Included "plein air painting" for authentic impressionist feel
- Emphasized light and atmosphere over detail
- Negative prompt specifically excludes hard edges and sharp focus

---

## EVALUATION FRAMEWORK

### A. Subject Preservation Score (0-10)
**Test Criteria:**
1. **Facial Recognition** (for portraits):
   - Key features maintained (eyes, nose, mouth position)
   - Proportions accurate to source
   - Expression preserved
   
2. **Object Identity** (for objects/pets):
   - Shape integrity maintained
   - Distinguishing features visible
   - Size relationships preserved

**Pass Threshold**: 7/10 minimum

### B. Oil Painting Authenticity Score (0-10)
**Test Criteria:**
1. **Texture Quality**:
   - Canvas texture visible (subtle to prominent based on style)
   - Paint buildup appropriate to style
   - No digital artifacts
   
2. **Color Behavior**:
   - Natural color mixing/blending
   - Appropriate opacity/transparency
   - Pigment-like saturation

3. **Brushwork Characteristics**:
   - Style-appropriate stroke patterns
   - Consistent technique throughout
   - No impossible paint behaviors

**Pass Threshold**: 8/10 minimum

### C. Style Distinctiveness Score (0-10)
**Test Criteria:**
1. **Visual Differentiation**:
   - Each style clearly distinguishable
   - No style bleeding between presets
   - Consistent style application

2. **Historical Accuracy**:
   - Matches expected period characteristics
   - Appropriate to named artistic movement
   - Technique alignment with style

**Pass Threshold**: 8/10 minimum

### D. Consistency Score (0-10)
**Test Criteria:**
1. **Batch Consistency**:
   - Same prompt produces similar quality across 5+ generations
   - Style remains stable with different seeds
   - Works across diverse input images

2. **Parameter Stability**:
   - Results remain good within recommended setting ranges
   - Degradation is gradual outside optimal range
   - No sudden quality drops

**Pass Threshold**: 7/10 minimum

---

## TESTING PROTOCOL

### Input Image Requirements:
1. Test with minimum 5 diverse images per style:
   - Close-up portrait
   - Full body shot
   - Pet/animal
   - Landscape with figure
   - Object/still life

### Generation Testing:
1. Generate 3 variations per input image
2. Use different seeds but same settings
3. Test edge cases (very light/dark images)

### Success Metrics:
- **Excellent**: All scores ≥ 8/10
- **Good**: All scores ≥ 7/10, at least two ≥ 8/10
- **Acceptable**: All scores ≥ 7/10
- **Needs Revision**: Any score < 7/10

---

## ADVANCED OPTIMIZATION TIPS

### 1. Model-Specific Adjustments:
- **Realistic Vision**: Reduce CFG by 1-2 points
- **DreamShaper**: Increase denoising by 0.05-0.1
- **Deliberate**: Works best with these prompts as-is

### 2. ControlNet Fine-Tuning:
- **For faces**: Add OpenPose at 0.2-0.3 weight
- **For pets**: Increase Canny to 0.6-0.7
- **For landscapes**: Reduce all ControlNet weights by 0.1

### 3. Problem-Solving Guide:
- **Too photographic**: Increase denoising strength by 0.05
- **Lost identity**: Decrease denoising, increase ControlNet
- **Weak texture**: Add "(oil paint texture:1.2)" to prompt
- **Inconsistent style**: Reduce CFG scale by 1 point

### 4. Upscaling Settings:
- Use Ultimate SD Upscale with 0.3-0.4 denoising
- Tile size: 512-768 pixels
- Keep same prompt but reduce CFG by 1-2 points

---

## PROMPT TEMPLATES FOR CUSTOMIZATION

### Base Template Structure:
```
[STYLE BASE], [SUBJECT DESCRIPTION], [LIGHTING], [MOOD/ATMOSPHERE], [TECHNICAL DETAILS], [QUALITY MARKERS]
```

### Example Customization:
```
# For Classic Portrait of a young woman:
"oil painting portrait, Renaissance technique, young woman with brown hair, soft window lighting, serene expression, glazing layers, sfumato shading, canvas texture, museum quality"

# For Thick Textured landscape:
"thick impasto oil painting, mountain landscape, dramatic sunset, Van Gogh technique, visible palette knife marks, three-dimensional paint texture, bold brushstrokes, saturated pigments"
```

---

## BATCH PROCESSING RECOMMENDATIONS

### Optimal Batch Settings:
1. **Batch Size**: 4-8 images
2. **Seed Iteration**: -1 (random) or incremental
3. **Variation Strength**: 0.05-0.15 for subtle variations
4. **Memory Management**: Process in groups of 4 for 8GB VRAM

### Quality Control Checklist:
- [ ] Subject recognizable in all outputs
- [ ] Consistent style application
- [ ] No digital artifacts
- [ ] Appropriate paint texture
- [ ] Natural color behavior
- [ ] Proper lighting/atmosphere
- [ ] No anatomical distortions
- [ ] Style matches intention

---

*Last Updated: 2025*
*Tested with: SD 1.5, SDXL, Realistic Vision, DreamShaper, Deliberate*