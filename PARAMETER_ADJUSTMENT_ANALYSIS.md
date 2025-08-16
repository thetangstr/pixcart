# Parameter Adjustment Analysis

## Evaluation Feedback Summary

Based on your evaluations, here are the key issues identified:

### Critical Issues:
1. **"can't tell if this is a oil painting"** - The oil painting effect is not visible enough
2. **"oil painting quality is good but the pet is gone"** - Pet identity/features being lost
3. **"preservation failed"**, **"eyes not preserved"** - Specific feature preservation issues  
4. **"cat converted to a person"**, **"cat is gone"** - Complete subject transformation

## Recommended Parameter Adjustments

### Current Parameters (showing issues):
```javascript
// Classic style
denoising_strength: 0.35  // Too low - not enough oil painting effect
controlnet_weight: 0.7    // May need adjustment

// Impressionist  
denoising_strength: 0.45  // Better but still losing pet identity
controlnet_weight: 0.55    // Too low - causing identity loss

// Modern
denoising_strength: 0.55  // Too high - completely losing the pet
controlnet_weight: 0.45    // Way too low - causing transformations
```

## Proposed New Parameters

### Option 1: Balanced Approach
```javascript
// Classic - Stronger oil effect while preserving identity
denoising_strength: 0.50  // Increased for visible oil painting
controlnet_weight: 0.80   // Increased for better preservation
cfg_scale: 6.0           // Slightly higher for prompt adherence

// Impressionist - Better balance
denoising_strength: 0.55  // Slightly increased 
controlnet_weight: 0.70   // Significantly increased
cfg_scale: 5.5

// Modern - Much more conservative
denoising_strength: 0.45  // Reduced from 0.55
controlnet_weight: 0.75   // Much higher for preservation
cfg_scale: 6.5
```

### Option 2: Conservative with Multiple ControlNets
```javascript
// Use TWO ControlNets simultaneously:
controlnet_units: [
  {
    model: "control_v11p_sd15_canny",  // Edge preservation
    weight: 0.7,
    module: "canny"
  },
  {
    model: "control_v11f1p_sd15_depth",  // Depth/structure
    weight: 0.5,
    module: "depth"
  }
]

// With more conservative denoising:
denoising_strength: 0.40-0.45
```

### Option 3: Style-Specific Prompting Enhancement
```javascript
// Add stronger preservation keywords to prompts:
prompt: "(oil painting:1.5), (preserve pet features:1.3), (maintain eyes:1.2), ..."

// Use negative prompts more aggressively:
negative_prompt: "human, person, face change, different animal, transformation, ..."
```

## Implementation Priority

1. **IMMEDIATE**: Increase ControlNet weights across all styles (minimum 0.65)
2. **IMMEDIATE**: Add preservation keywords to prompts
3. **TEST**: Try dual ControlNet approach for problematic images
4. **ADJUST**: Fine-tune denoising per style based on results

## Test Approach

1. Apply new parameters to tasks that received negative feedback
2. Compare before/after results
3. Focus on:
   - Pet identity preservation (especially eyes)
   - Visible oil painting texture
   - No species/subject transformation

## Code Location to Update

- `/app/lib/oilPaintingStyles.ts` - Main style definitions
- `/scripts/apply_distinct_styles.py` - Batch conversion parameters
- `/app/api/convert/masterpiece/route.ts` - User-facing conversion

Would you like me to implement these parameter adjustments now?