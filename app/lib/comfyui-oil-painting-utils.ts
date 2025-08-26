import { ComfyUIStyleConfig } from './comfyui-client'

/**
 * Oil Painting Style Utilities based on the expert guide
 * Provides intelligent style selection and parameter optimization
 */

export interface OilPaintingStyle {
  name: string
  description: string
  artistReference: string[]
  techniques: string[]
  denoisingRange: [number, number]
  preferredControlNet: 'canny' | 'depth' | 'none'
  intensity: number
}

export const oilPaintingStyles: Record<string, OilPaintingStyle> = {
  classical: {
    name: 'Classical Portrait',
    description: 'Rembrandt-style with dramatic lighting and fine brushwork',
    artistReference: ['Rembrandt', 'Vermeer', 'Caravaggio'],
    techniques: ['glazing', 'chiaroscuro', 'sfumato'],
    denoisingRange: [0.55, 0.65],
    preferredControlNet: 'canny',
    intensity: 0.65
  },
  
  impressionist: {
    name: 'Impressionist',
    description: 'Monet-style with broken color and atmospheric effects',
    artistReference: ['Claude Monet', 'Pierre-Auguste Renoir', 'Camille Pissarro'],
    techniques: ['broken color', 'plein air', 'light capturing'],
    denoisingRange: [0.65, 0.75],
    preferredControlNet: 'depth',
    intensity: 0.75
  },
  
  expressionist: {
    name: 'Expressionist',
    description: 'Van Gogh-style with bold strokes and emotional intensity',
    artistReference: ['Vincent Van Gogh', 'Edvard Munch', 'Ernst Ludwig Kirchner'],
    techniques: ['impasto', 'palette knife', 'swirling brushstrokes'],
    denoisingRange: [0.75, 0.85],
    preferredControlNet: 'depth',
    intensity: 0.85
  },
  
  baroque: {
    name: 'Baroque',
    description: 'Dramatic lighting with rich colors and dynamic composition',
    artistReference: ['Caravaggio', 'Peter Paul Rubens', 'Diego Velázquez'],
    techniques: ['chiaroscuro', 'tenebrism', 'dramatic composition'],
    denoisingRange: [0.55, 0.65],
    preferredControlNet: 'canny',
    intensity: 0.7
  },
  
  romantic: {
    name: 'Romantic Landscape',
    description: 'Turner-style with atmospheric effects and luminous colors',
    artistReference: ['J.M.W. Turner', 'Caspar David Friedrich', 'John Constable'],
    techniques: ['atmospheric perspective', 'luminosity', 'loose brushwork'],
    denoisingRange: [0.65, 0.75],
    preferredControlNet: 'depth',
    intensity: 0.72
  },
  
  portrait_master: {
    name: 'Portrait Master',
    description: 'Sargent-style with confident brushwork and sophisticated lighting',
    artistReference: ['John Singer Sargent', 'Anders Zorn', 'Joaquín Sorolla'],
    techniques: ['alla prima', 'wet-on-wet', 'economy of brushstrokes'],
    denoisingRange: [0.50, 0.60],
    preferredControlNet: 'canny',
    intensity: 0.6
  },
  
  abstract_expressionist: {
    name: 'Abstract Expressionist',
    description: 'Pollock-style with gestural marks and emotional intensity',
    artistReference: ['Jackson Pollock', 'Willem de Kooning', 'Mark Rothko'],
    techniques: ['action painting', 'gestural brushwork', 'color field'],
    denoisingRange: [0.80, 0.95],
    preferredControlNet: 'none',
    intensity: 0.95
  }
}

/**
 * Generate optimized prompt based on style and subject
 */
export function generateOilPaintingPrompt(
  style: OilPaintingStyle,
  subjectType: 'portrait' | 'landscape' | 'still_life' | 'abstract',
  customDescription?: string
): string {
  const artist = style.artistReference[0]
  const technique = style.techniques[0]
  
  let basePrompt = `(masterpiece:1.2), best quality, oil painting`
  
  // Add artist reference
  basePrompt += ` by ${artist}`
  
  // Add technique
  basePrompt += `, ${technique} technique`
  
  // Add subject-specific keywords
  switch (subjectType) {
    case 'portrait':
      basePrompt += ', fine facial details, sophisticated lighting, character study'
      break
    case 'landscape':
      basePrompt += ', atmospheric perspective, natural lighting, scenic vista'
      break
    case 'still_life':
      basePrompt += ', careful composition, texture study, light and shadow play'
      break
    case 'abstract':
      basePrompt += ', emotional expression, dynamic composition, pure form and color'
      break
  }
  
  // Add style-specific keywords
  if (style.name.includes('Impressionist')) {
    basePrompt += ', broken color, visible brushstrokes, light effects'
  } else if (style.name.includes('Expressionist')) {
    basePrompt += ', thick impasto, emotional intensity, bold colors'
  } else if (style.name.includes('Classical')) {
    basePrompt += ', refined technique, old master style, museum quality'
  }
  
  // Add custom description if provided
  if (customDescription) {
    basePrompt += `, ${customDescription}`
  }
  
  // Always end with quality markers
  basePrompt += ', oil on canvas, artistic masterpiece'
  
  return basePrompt
}

/**
 * Determine optimal denoising strength based on multiple factors
 */
export function calculateOptimalDenoising(
  style: OilPaintingStyle,
  useControlNet: boolean,
  preserveDetails: boolean = false
): number {
  const [minDenoise, maxDenoise] = style.denoisingRange
  
  // Start with middle of range
  let denoise = (minDenoise + maxDenoise) / 2
  
  // Adjust based on ControlNet usage
  if (useControlNet) {
    // Can use higher denoising with ControlNet (as per guide)
    denoise = Math.min(denoise * 1.2, 1.0)
  }
  
  // Adjust if detail preservation is important
  if (preserveDetails) {
    denoise = Math.max(minDenoise, denoise * 0.9)
  }
  
  return Number(denoise.toFixed(2))
}

/**
 * Select appropriate ControlNet model based on style and content
 */
export function selectControlNetModel(
  style: OilPaintingStyle,
  availableModels: string[]
): { model: string | undefined, preprocessor: string, strength: number } {
  if (style.preferredControlNet === 'none') {
    return { model: undefined, preprocessor: '', strength: 0 }
  }
  
  // Priority list based on style preference
  const cannyModels = availableModels.filter(m => m.toLowerCase().includes('canny'))
  const depthModels = availableModels.filter(m => m.toLowerCase().includes('depth'))
  
  let selectedModel: string | undefined
  let preprocessor: string
  let strength: number
  
  if (style.preferredControlNet === 'canny' && cannyModels.length > 0) {
    selectedModel = cannyModels[0]
    preprocessor = 'Canny'
    strength = style.name.includes('Portrait') ? 0.75 : 0.6
  } else if (style.preferredControlNet === 'depth' && depthModels.length > 0) {
    selectedModel = depthModels[0]
    preprocessor = 'DepthAnythingV2Preprocessor'
    strength = style.name.includes('Expressionist') ? 0.5 : 0.65
  } else if (availableModels.length > 0) {
    // Fallback to any available model
    selectedModel = availableModels[0]
    preprocessor = selectedModel.includes('canny') ? 'Canny' : 'DepthAnythingV2Preprocessor'
    strength = 0.6
  } else {
    selectedModel = undefined
    preprocessor = ''
    strength = 0
  }
  
  return { model: selectedModel, preprocessor, strength }
}

/**
 * Find appropriate oil painting LoRA from available models
 */
export function findOilPaintingLoRA(availableLoRAs: string[]): string | undefined {
  // Priority keywords to look for in LoRA names
  const keywords = [
    'oil_painting',
    'oilpainting',
    'oil-painting',
    'impasto',
    'impressionism',
    'impressionist',
    'painterly',
    'brushstroke',
    'vangogh',
    'van_gogh',
    'monet',
    'rembrandt',
    'painting_style',
    'traditional_art'
  ]
  
  // Find LoRAs matching keywords
  for (const keyword of keywords) {
    const matches = availableLoRAs.filter(lora => 
      lora.toLowerCase().includes(keyword)
    )
    if (matches.length > 0) {
      return matches[0]
    }
  }
  
  return undefined
}

/**
 * Create a complete style configuration based on available resources
 */
export function createOptimizedStyleConfig(
  styleName: keyof typeof oilPaintingStyles,
  checkpointModel: string,
  availableLoRAs: string[],
  availableControlNets: string[],
  subjectType: 'portrait' | 'landscape' | 'still_life' | 'abstract' = 'portrait'
): ComfyUIStyleConfig {
  const style = oilPaintingStyles[styleName]
  const oilLoRA = findOilPaintingLoRA(availableLoRAs)
  const controlNet = selectControlNetModel(style, availableControlNets)
  const useControlNet = controlNet.model !== undefined
  
  return {
    checkpoint: checkpointModel,
    lora_name: oilLoRA,
    lora_strength: oilLoRA ? 0.8 : undefined,
    lora_clip_strength: oilLoRA ? 0.8 : undefined,
    positive_prompt: generateOilPaintingPrompt(style, subjectType),
    negative_prompt: '(worst quality, low quality:1.4), photograph, photo, photographic, photorealistic, digital art, 3d render, smooth surface, flat colors',
    steps: useControlNet ? 35 : 30,
    cfg: style.intensity > 0.8 ? 8.0 : 7.0,
    sampler_name: 'dpmpp_2m_sde',
    scheduler: 'karras',
    denoise: calculateOptimalDenoising(style, useControlNet),
    controlnet_model: controlNet.model,
    controlnet_strength: controlNet.strength,
    preprocessor: controlNet.preprocessor,
    style_intensity: style.intensity
  }
}

/**
 * Adjust existing config based on subject analysis
 */
export function adjustConfigForSubject(
  config: ComfyUIStyleConfig,
  subjectAnalysis: {
    hasfaces: boolean
    isPortrait: boolean
    isLandscape: boolean
    hasFinDetails: boolean
    colorComplexity: 'low' | 'medium' | 'high'
  }
): ComfyUIStyleConfig {
  const adjusted = { ...config }
  
  // Adjust denoising based on subject
  if (subjectAnalysis.hasfaces && subjectAnalysis.isPortrait) {
    // Lower denoising for face preservation
    adjusted.denoise = Math.max(0.55, adjusted.denoise * 0.9)
    // Higher ControlNet strength for faces
    if (adjusted.controlnet_strength) {
      adjusted.controlnet_strength = Math.min(0.85, adjusted.controlnet_strength * 1.2)
    }
  }
  
  if (subjectAnalysis.hasFinDetails) {
    // Increase steps for fine details
    adjusted.steps = Math.min(45, adjusted.steps + 5)
    // Slightly lower CFG for detail preservation
    adjusted.cfg = Math.max(6.0, adjusted.cfg * 0.9)
  }
  
  if (subjectAnalysis.colorComplexity === 'high') {
    // Adjust for complex color palettes
    adjusted.cfg = Math.min(8.5, adjusted.cfg * 1.1)
  }
  
  return adjusted
}