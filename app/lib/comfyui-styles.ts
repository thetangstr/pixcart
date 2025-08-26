import { ComfyUIStyleConfig } from './comfyui-client'
import { sdxlComfyUIStyles } from './comfyui-styles-sdxl'

// SD 1.5 styles optimized based on the expert guide recommendations
export const originalComfyUIStyles: Record<string, ComfyUIStyleConfig> = {
  // Classic Portrait - Expert guide: 0.55-0.65 denoising for portraits
  classic_portrait: {
    checkpoint: 'v1-5-pruned-emaonly.safetensors',
    lora_name: 'epinikionimpressionismoilpainting.safetensors',
    lora_strength: 0.8,  // Standard strength as per guide
    lora_clip_strength: 0.8,
    positive_prompt: '(masterpiece:1.2), best quality, oil painting portrait by Rembrandt, baroque style, dramatic chiaroscuro lighting, oil on canvas, impasto technique, fine glazing, classical old master technique, rich earth tones, museum quality fine art',
    negative_prompt: '(worst quality, low quality:1.4), photograph, photo, photographic, photorealistic, digital art, 3d render, smooth surface, flat colors, ugly, deformed',
    steps: 35,
    cfg: 7.0,  // Guide recommends 6-8 for oil paintings
    sampler_name: 'dpmpp_2m_sde',
    scheduler: 'karras',
    denoise: 0.60,  // Within guide's 0.55-0.65 range for portraits
    controlnet_strength: 0.75,  // Higher for portrait preservation
    controlnet_model: 'control_v11p_sd15_canny.pth',
    preprocessor: 'CannyEdgePreprocessor',  // Fixed preprocessor name
    style_intensity: 0.65
  },
  
  // Van Gogh style - Expert guide: 0.75-0.85 denoising for expressionism
  thick_textured: {
    checkpoint: 'v1-5-pruned-emaonly.safetensors',
    lora_name: 'epinikionimpressionismoilpainting.safetensors',
    lora_strength: 1.0,  // Full strength for Van Gogh's bold style
    lora_clip_strength: 0.95,
    positive_prompt: 'oil painting by Vincent Van Gogh, thick impasto technique, heavy palette knife application, swirling dynamic brushstrokes, expressionism, vibrant complementary colors, textured paint surface, post-impressionist masterpiece, visible canvas texture',
    negative_prompt: '(worst quality:1.4), smooth surface, photograph, photorealistic, digital art, flat colors, 3d render, plastic, glossy',
    steps: 30,
    cfg: 8.0,  // Higher CFG for Van Gogh's bold style
    sampler_name: 'euler_ancestral',
    scheduler: 'karras',
    denoise: 0.80,  // Within guide's 0.75-0.85 range for Van Gogh
    controlnet_strength: 0.5,  // Lower for artistic freedom
    controlnet_model: 'control_v11p_sd15_depth.pth',
    preprocessor: 'DepthAnythingV2Preprocessor',  // Better depth processor
    style_intensity: 0.85
  },
  
  // Monet style - Expert guide: 0.65-0.75 denoising for impressionism
  soft_impressionist: {
    checkpoint: 'v1-5-pruned-emaonly.safetensors',
    lora_name: 'epinikionimpressionismoilpainting.safetensors',
    lora_strength: 0.9,
    lora_clip_strength: 0.85,
    positive_prompt: 'oil painting by Claude Monet, impressionism style, broken color technique, visible brushstrokes, plein air painting, soft atmospheric edges, light and color study, French impressionist masterpiece, dappled light effects, oil on canvas',
    negative_prompt: '(worst quality:1.4), photograph, photorealistic, sharp focus, digital art, 3d render, smooth surface, hard edges',
    steps: 30,
    cfg: 7.5,
    sampler_name: 'euler_ancestral',
    scheduler: 'karras',
    denoise: 0.70,  // Within guide's 0.65-0.75 range for Monet
    controlnet_strength: 0.6,
    controlnet_model: 'control_v11p_sd15_depth.pth',  // Depth for soft painterly feel as per guide
    preprocessor: 'DepthAnythingV2Preprocessor',
    style_intensity: 0.75
  },
  
  baroque_drama: {
    checkpoint: 'v1-5-pruned-emaonly.safetensors',
    lora_name: 'epinikionimpressionismoilpainting.safetensors',  // Add LoRA for oil effect
    lora_strength: 0.7,
    lora_clip_strength: 0.7,
    positive_prompt: 'baroque oil painting by Caravaggio, dramatic tenebrism lighting, deep chiaroscuro, rich saturated colors, classical composition, oil on canvas, glazing technique, old master painting, museum quality fine art',
    negative_prompt: '(worst quality:1.4), bright flat lighting, photograph, digital art, cartoon, blurry, smooth surface',
    steps: 35,
    cfg: 7.0,
    sampler_name: 'dpmpp_2m_sde',  // Better sampler for oil paintings
    scheduler: 'karras',
    denoise: 0.60,  // Good for baroque portraits
    controlnet_strength: 0.70,  // Higher for classical precision
    controlnet_model: 'control_v11p_sd15_canny.pth',  // Canny for sharp baroque details
    preprocessor: 'CannyEdgePreprocessor',
    style_intensity: 0.70
  },
  
  romantic_landscape: {
    checkpoint: 'v1-5-pruned-emaonly.safetensors',
    lora_name: 'epinikionimpressionismoilpainting.safetensors',
    lora_strength: 0.85,
    lora_clip_strength: 0.85,
    positive_prompt: 'romantic landscape oil painting by J.M.W. Turner, atmospheric perspective, luminous sky, warm golden hour light, impasto highlights, wet-on-wet technique, oil on canvas, romanticism masterpiece, sublime nature',
    negative_prompt: '(worst quality:1.4), photograph, digital art, modern style, harsh details, smooth surface, flat colors',
    steps: 35,  // Reduced from 40 for efficiency
    cfg: 6.5,  // Slightly higher for landscape detail
    sampler_name: 'dpmpp_2m_sde',
    scheduler: 'karras',
    denoise: 0.70,  // Good for landscapes
    controlnet_strength: 0.55,  // Lower for atmospheric softness
    controlnet_model: 'control_v11p_sd15_depth.pth',  // Depth for landscapes
    preprocessor: 'DepthAnythingV2Preprocessor',
    style_intensity: 0.72
  },
  
  portrait_master: {
    checkpoint: 'v1-5-pruned-emaonly.safetensors',
    lora_name: 'epinikionimpressionismoilpainting.safetensors',
    lora_strength: 0.75,
    lora_clip_strength: 0.75,
    positive_prompt: 'portrait oil painting by John Singer Sargent, alla prima technique, confident economical brushwork, sophisticated lighting, wet-on-wet method, oil on canvas, society portrait, Edwardian elegance, masterpiece',
    negative_prompt: '(worst quality:1.4), photograph, digital art, cartoon, anime, smooth surface, overworked details',
    steps: 35,
    cfg: 6.5,
    sampler_name: 'dpmpp_2m_sde',
    scheduler: 'karras',
    denoise: 0.55,  // Lower for portrait preservation
    controlnet_strength: 0.75,  // High for accurate features
    controlnet_model: 'control_v11p_sd15_canny.pth',  // Canny for portrait precision
    preprocessor: 'CannyEdgePreprocessor',
    style_intensity: 0.60
  },
  
  modern_abstract: {
    checkpoint: 'v1-5-pruned-emaonly.safetensors',
    lora_name: 'epinikionimpressionismoilpainting.safetensors',
    lora_strength: 1.0,  // Full strength for abstract expression
    lora_clip_strength: 1.0,
    positive_prompt: 'modern abstract oil painting, Jackson Pollock influence, bold gestural brushstrokes, action painting, thick impasto, vibrant color field, contemporary art, emotional expression, oil on canvas',
    negative_prompt: '(worst quality:1.4), realistic, photograph, digital art, smooth surface, precise details',
    steps: 25,
    cfg: 8.0,
    sampler_name: 'euler_ancestral',
    scheduler: 'karras',
    denoise: 0.85,  // Higher for abstract freedom (guide allows up to 0.95)
    controlnet_strength: 0.40,  // Very low for abstract interpretation
    controlnet_model: 'control_v11p_sd15_depth.pth',  // Depth for basic structure only
    preprocessor: 'DepthAnythingV2Preprocessor',
    style_intensity: 0.95
  },
  
  photorealistic_oil: {
    checkpoint: 'v1-5-pruned-emaonly.safetensors',
    lora_name: 'epinikionimpressionismoilpainting.safetensors',
    lora_strength: 0.6,  // Lower for subtle oil effect
    lora_clip_strength: 0.6,
    positive_prompt: 'photorealistic oil painting, hyperrealistic technique, subtle visible brushwork, realistic lighting, fine glazing layers, oil on canvas, trompe-l\'oeil effect, masterpiece quality',
    negative_prompt: '(worst quality:1.4), photograph, digital art, cartoon, anime, flat colors, oversaturated',
    steps: 40,  // Reduced from 45 for efficiency
    cfg: 5.5,
    sampler_name: 'dpmpp_2m_sde',
    scheduler: 'karras',
    denoise: 0.45,  // Lower for photorealistic preservation
    controlnet_strength: 0.85,  // Very high for accuracy
    controlnet_model: 'control_v11p_sd15_canny.pth',  // Canny for precise details
    preprocessor: 'CannyEdgePreprocessor',
    style_intensity: 0.45
  }
}

// Combined styles with SDXL fallbacks taking precedence
export const comfyUIStyles: Record<string, ComfyUIStyleConfig> = {
  ...originalComfyUIStyles,
  ...sdxlComfyUIStyles  // SDXL styles override originals where names match
}

export function getComfyUIStyleById(styleId: string): ComfyUIStyleConfig | null {
  return comfyUIStyles[styleId] || null
}

export function getAllComfyUIStyles(): Array<{ id: string; config: ComfyUIStyleConfig }> {
  return Object.entries(comfyUIStyles).map(([id, config]) => ({ id, config }))
}

/**
 * Get styles that work with currently available models
 */
export function getAvailableStyles(availableModels: {
  checkpoints: string[]
  loras: string[]
  controlnets: string[]
}): Array<{ id: string; config: ComfyUIStyleConfig }> {
  return getAllComfyUIStyles().filter(({ config }) => {
    // Check if checkpoint is available
    const hasCheckpoint = availableModels.checkpoints.includes(config.checkpoint)
    
    // If LoRA is specified, check if it's available (or skip if not critical)
    const loraOk = !config.lora_name || availableModels.loras.includes(config.lora_name)
    
    return hasCheckpoint  // Only require checkpoint, LoRA is optional
  })
}