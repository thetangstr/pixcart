import { ComfyUIStyleConfig } from './comfyui-client'

export const comfyUIStyles: Record<string, ComfyUIStyleConfig> = {
  classic_portrait: {
    checkpoint: 'v1-5-pruned-emaonly.safetensors',
    positive_prompt: 'oil painting, classical renaissance style, detailed brushwork, warm lighting, masterpiece, Leonardo da Vinci style, fine art, portrait painting, realistic, highly detailed',
    negative_prompt: 'photograph, digital art, 3d render, cartoon, anime, low quality, blurry, watermark, signature, text, oversaturated',
    steps: 30,
    cfg: 6.5,
    sampler_name: 'euler_ancestral',
    scheduler: 'normal',
    denoise: 0.65,
    controlnet_strength: 0.55
  },
  
  thick_textured: {
    checkpoint: 'v1-5-pruned-emaonly.safetensors',
    positive_prompt: 'thick oil painting, Van Gogh style, heavy impasto, visible brushstrokes, textured paint, expressive, vibrant colors, post-impressionist, masterpiece',
    negative_prompt: 'smooth, photograph, digital art, flat colors, low quality, blurry, watermark, signature, text',
    steps: 25,
    cfg: 7.5,
    sampler_name: 'euler_ancestral',
    scheduler: 'normal',
    denoise: 0.65,
    controlnet_strength: 0.70
  },
  
  soft_impressionist: {
    checkpoint: 'v1-5-pruned-emaonly.safetensors',
    positive_prompt: 'soft impressionist oil painting, Monet style, gentle brushstrokes, light and airy, pastel colors, dreamy atmosphere, fine art',
    negative_prompt: 'sharp details, photograph, digital art, harsh lighting, low quality, blurry, watermark, signature, text',
    steps: 30,
    cfg: 5.0,
    sampler_name: 'euler_ancestral',
    scheduler: 'normal',
    denoise: 0.55,
    controlnet_strength: 0.85
  },
  
  baroque_drama: {
    checkpoint: 'v1-5-pruned-emaonly.safetensors',
    positive_prompt: 'baroque oil painting, Caravaggio style, dramatic lighting, chiaroscuro, rich colors, classical composition, fine art masterpiece',
    negative_prompt: 'bright lighting, photograph, digital art, cartoon, low quality, blurry, watermark, signature, text',
    steps: 35,
    cfg: 7.0,
    sampler_name: 'euler_ancestral',
    scheduler: 'normal',
    denoise: 0.60,
    controlnet_strength: 0.65
  },
  
  romantic_landscape: {
    checkpoint: 'v1-5-pruned-emaonly.safetensors',
    positive_prompt: 'romantic landscape oil painting, Turner style, atmospheric, dramatic sky, warm golden light, fine art, masterpiece',
    negative_prompt: 'photograph, digital art, modern, low quality, blurry, watermark, signature, text, harsh details',
    steps: 40,
    cfg: 6.0,
    sampler_name: 'euler_ancestral',
    scheduler: 'normal',
    denoise: 0.70,
    controlnet_strength: 0.60
  },
  
  portrait_master: {
    checkpoint: 'v1-5-pruned-emaonly.safetensors',
    positive_prompt: 'portrait oil painting, John Singer Sargent style, elegant brushwork, sophisticated lighting, fine art portrait, masterpiece',
    negative_prompt: 'photograph, digital art, cartoon, anime, low quality, blurry, watermark, signature, text',
    steps: 35,
    cfg: 6.5,
    sampler_name: 'euler_ancestral',
    scheduler: 'normal',
    denoise: 0.55,
    controlnet_strength: 0.75
  },
  
  modern_abstract: {
    checkpoint: 'v1-5-pruned-emaonly.safetensors',
    positive_prompt: 'modern abstract oil painting, bold colors, expressive brushstrokes, contemporary art, artistic interpretation',
    negative_prompt: 'realistic, photograph, digital art, low quality, blurry, watermark, signature, text',
    steps: 25,
    cfg: 8.0,
    sampler_name: 'euler_ancestral',
    scheduler: 'normal',
    denoise: 0.75,
    controlnet_strength: 0.50
  },
  
  photorealistic_oil: {
    checkpoint: 'v1-5-pruned-emaonly.safetensors',
    positive_prompt: 'photorealistic oil painting, highly detailed, subtle brushwork, realistic lighting, fine art, masterpiece quality',
    negative_prompt: 'photograph, digital art, cartoon, anime, low quality, blurry, watermark, signature, text, oversaturated',
    steps: 45,
    cfg: 5.5,
    sampler_name: 'euler_ancestral',
    scheduler: 'normal',
    denoise: 0.45,
    controlnet_strength: 0.80
  }
}

export function getComfyUIStyleById(styleId: string): ComfyUIStyleConfig | null {
  return comfyUIStyles[styleId] || null
}

export function getAllComfyUIStyles(): Array<{ id: string; config: ComfyUIStyleConfig }> {
  return Object.entries(comfyUIStyles).map(([id, config]) => ({ id, config }))
}