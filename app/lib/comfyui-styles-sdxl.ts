import { ComfyUIStyleConfig } from './comfyui-client'

/**
 * SDXL-compatible styles optimized based on the expert guide
 * Implements proper denoising strengths and prompt engineering
 */
export const sdxlComfyUIStyles: Record<string, ComfyUIStyleConfig> = {
  // Classic Portrait - Lower denoise (0.55-0.65) with Rembrandt/baroque keywords
  classic_oil_sdxl: {
    checkpoint: 'sd_xl_base_1.0_0.9vae.safetensors',
    lora_name: undefined,  // Will be filled if available
    lora_strength: 0.8,
    lora_clip_strength: 0.8,
    positive_prompt: '(masterpiece:1.2), best quality, oil painting portrait, by Rembrandt, baroque style, dramatic chiaroscuro lighting, fine brushwork, ((oil on canvas)), glazing technique, classical composition, rich golden tones, museum quality artwork, traditional oil painting technique, visible but refined brushstrokes',
    negative_prompt: '(worst quality, low quality:1.4), photograph, photo, photographic, photorealistic, digital art, 3d render, smooth surface, flat colors, anime, cartoon, sharp edges, modern, oversaturated',
    steps: 35,
    cfg: 7.0,
    sampler_name: 'dpmpp_2m_sde',
    scheduler: 'karras',
    denoise: 0.60,  // Lower denoise for classic portraits as per guide
    controlnet_strength: 0.7,  // Higher control for portrait preservation
    controlnet_model: 'control-lora-canny-rank256.safetensors',
    preprocessor: 'CannyEdgePreprocessor',
    style_intensity: 0.65
  },
  
  // Monet Style - Medium denoise (0.65-0.75) with impressionism keywords
  impressionist_sdxl: {
    checkpoint: 'sd_xl_base_1.0_0.9vae.safetensors',
    lora_name: undefined,  // Will use oil painting LoRA if available
    lora_strength: 0.9,
    lora_clip_strength: 0.85,
    positive_prompt: '(masterpiece:1.2), oil painting by Claude Monet, impressionism, broken color technique, ((visible brushstrokes)), thick paint dabs, plein air painting, light reflecting off paint texture, French impressionist masterpiece, water lilies style, soft edges, atmospheric perspective, oil on canvas',
    negative_prompt: '(worst quality:1.4), photograph, photorealistic, sharp focus, digital art, 3d render, smooth rendering, clean edges, flat colors, anime, cartoon',
    steps: 30,
    cfg: 7.5,
    sampler_name: 'euler_ancestral',
    scheduler: 'karras',
    denoise: 0.70,  // Medium denoise for Monet style as per guide
    controlnet_strength: 0.6,  // Moderate control for impressionist freedom
    controlnet_model: 'control-lora-depth-rank256.safetensors',  // Depth for soft painterly feel
    preprocessor: 'DepthPreprocessor',
    style_intensity: 0.75
  },
  
  // Van Gogh Style - Higher denoise (0.75-0.85) with expressionism/impasto
  van_gogh_sdxl: {
    checkpoint: 'sd_xl_base_1.0_0.9vae.safetensors',
    lora_name: undefined,  // Will use oil painting LoRA if available
    lora_strength: 1.0,
    lora_clip_strength: 0.95,
    positive_prompt: '(masterpiece:1.3), oil painting by Vincent Van Gogh, thick impasto technique, heavy paint application, swirling brushstrokes, expressionism, post-impressionist, vibrant complementary colors, emotional intensity, starry night style, palette knife texture, ((very thick paint)), dramatic brushwork, oil on canvas',
    negative_prompt: '(worst quality:1.4), photograph, smooth surface, digital art, flat colors, 3d render, photorealistic, clean lines, anime, cartoon, watermark',
    steps: 35,
    cfg: 8.0,
    sampler_name: 'euler_ancestral',
    scheduler: 'karras',
    denoise: 0.80,  // Higher denoise for Van Gogh style as per guide
    controlnet_strength: 0.5,  // Lower control for expressive freedom
    controlnet_model: 'control-lora-depth-rank256.safetensors',
    preprocessor: 'DepthAnythingV2Preprocessor',
    style_intensity: 0.85
  },
  
  // Method 1: Simple Img2Img with LoRA (from guide)
  simple_lora_method: {
    checkpoint: 'sd_xl_base_1.0_0.9vae.safetensors',
    lora_name: undefined,  // Will be auto-detected
    lora_strength: 0.8,
    lora_clip_strength: 0.8,
    positive_prompt: '(masterpiece:1.2), best quality, oil painting, textured brushstrokes, impasto, oil on canvas, palette knife painting, museum quality, artistic interpretation',
    negative_prompt: '(worst quality, low quality:1.4), photo, photographic, realism, ugly, deformed, blurry, digital art, 3d render',
    steps: 30,
    cfg: 7.5,
    sampler_name: 'euler_ancestral',
    scheduler: 'karras',
    denoise: 0.75,  // Starting point from guide (0.55-0.8 range)
    // No ControlNet for simple method
    style_intensity: 0.7
  },
  
  // Method 2: Advanced with ControlNet (from guide)
  advanced_controlnet_method: {
    checkpoint: 'sd_xl_base_1.0_0.9vae.safetensors',
    lora_name: undefined,  // Will be auto-detected
    lora_strength: 0.9,
    lora_clip_strength: 0.85,
    positive_prompt: '(masterpiece:1.3), oil painting, thick impasto, visible brushstrokes, palette knife texture, artistic interpretation, museum quality, dramatic lighting',
    negative_prompt: '(worst quality:1.4), photograph, digital art, smooth surface, 3d render, photorealistic',
    steps: 35,
    cfg: 8.0,
    sampler_name: 'dpmpp_2m_sde',
    scheduler: 'karras',
    denoise: 0.90,  // Higher denoise with ControlNet (0.8-1.0 range from guide)
    controlnet_strength: 1.0,  // Default from guide
    controlnet_model: 'control-lora-canny-rank256.safetensors',
    preprocessor: 'CannyEdgePreprocessor',
    style_intensity: 0.9
  },
  
  // Turner-style Romantic Landscape
  romantic_landscape_sdxl: {
    checkpoint: 'sd_xl_base_1.0_0.9vae.safetensors',
    lora_name: undefined,
    lora_strength: 0.7,
    lora_clip_strength: 0.7,
    positive_prompt: 'oil painting by J.M.W. Turner, romantic landscape, atmospheric perspective, golden light, dramatic sky, loose brushwork, luminous colors, marine painting, impressionistic technique, oil on canvas',
    negative_prompt: 'photograph, digital art, sharp details, 3d render, cartoon, modern, photorealistic',
    steps: 35,
    cfg: 7.0,
    sampler_name: 'euler_ancestral',
    scheduler: 'karras',
    denoise: 0.72,
    controlnet_strength: 0.5,
    controlnet_model: 'control-lora-depth-rank256.safetensors',
    preprocessor: 'DepthPreprocessor',
    style_intensity: 0.7
  },
  
  // John Singer Sargent Portrait Style
  sargent_portrait_sdxl: {
    checkpoint: 'sd_xl_base_1.0_0.9vae.safetensors',
    lora_name: undefined,
    lora_strength: 0.75,
    lora_clip_strength: 0.75,
    positive_prompt: 'oil painting portrait by John Singer Sargent, elegant brushwork, sophisticated lighting, alla prima technique, confident brushstrokes, refined color palette, society portrait, masterful technique',
    negative_prompt: 'photograph, digital art, anime, cartoon, 3d render, photorealistic, oversaturated',
    steps: 40,
    cfg: 6.5,
    sampler_name: 'dpmpp_2m_sde',
    scheduler: 'karras',
    denoise: 0.58,  // Lower denoise for portrait preservation
    controlnet_strength: 0.8,
    controlnet_model: 'control-lora-canny-rank256.safetensors',
    preprocessor: 'CannyEdgePreprocessor',
    style_intensity: 0.6
  },
  
  // Abstract Expressionist Style
  abstract_expressionist_sdxl: {
    checkpoint: 'sd_xl_base_1.0_0.9vae.safetensors',
    lora_name: undefined,
    lora_strength: 1.1,
    lora_clip_strength: 1.0,
    positive_prompt: 'abstract expressionist oil painting, Jackson Pollock style, Willem de Kooning influence, bold gestural brushstrokes, dynamic composition, emotional intensity, action painting, thick layers of paint',
    negative_prompt: 'realistic, photograph, digital art, precise details, photographic, 3d render',
    steps: 30,
    cfg: 8.5,
    sampler_name: 'euler_ancestral',
    scheduler: 'karras',
    denoise: 0.85,  // High denoise for abstract interpretation
    controlnet_strength: 0.3,  // Low control for abstract freedom
    controlnet_model: 'control-lora-depth-rank256.safetensors',
    preprocessor: 'DepthPreprocessor',
    style_intensity: 0.95
  }
}

export function getSDXLStyleById(styleId: string): ComfyUIStyleConfig | null {
  return sdxlComfyUIStyles[styleId] || null
}

export function getAllSDXLStyles(): Array<{ id: string; config: ComfyUIStyleConfig }> {
  return Object.entries(sdxlComfyUIStyles).map(([id, config]) => ({ id, config }))
}