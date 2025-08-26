// Enhanced oil painting styles with hierarchical prompt structure and multi-ControlNet support
// Based on SD.md best practices and RL training results

export interface EnhancedOilPaintingStyle {
  id: string
  name: string
  description: string
  icon: string
  colorPalette?: string[]
  
  // Hierarchical prompt structure
  promptStructure: {
    medium: string
    subjectPreservation: string
    styleKeywords: string
    artistInfluence?: string
    lighting: string
    technicalDetails: string
    vaeCompensation: string // Keywords to enhance VAE output
  }
  
  // Negative prompts with categories
  negativePromptStructure: {
    subjectProtection: string // Prevent subject changes
    styleExclusions: string   // Unwanted styles
    qualityIssues: string     // Common artifacts
  }
  
  // Multi-pass configuration
  passes: {
    initial: PassConfig
    refinement?: PassConfig
    detail?: PassConfig
  }
  
  // LoRA configurations (to be added when downloaded)
  loras?: {
    name: string
    weight: number
    trigger?: string
  }[]
  
  // Multi-ControlNet configuration
  controlnets: ControlNetConfig[]
  
  // Base parameters (can be overridden by passes)
  sampler: string
  vae?: string // Specific VAE if needed
}

export interface PassConfig {
  name: string
  description: string
  denoising_strength: number
  cfg_scale: number
  steps: number
  promptModifier?: string // Additional prompt for this pass
  controlnetWeightOverrides?: Record<string, number> // Override specific controlnet weights
}

export interface ControlNetConfig {
  model: string
  module: string
  weight: number
  guidanceStart: number
  guidanceEnd: number
  processorRes?: number
  thresholdA?: number // For Canny
  thresholdB?: number // For Canny
  controlMode?: 'Balanced' | 'My prompt is more important' | 'ControlNet is more important'
}

export const enhancedOilPaintingStyles: EnhancedOilPaintingStyle[] = [
  {
    id: 'classic_portrait',
    name: 'Classic Portrait',
    description: 'Renaissance-inspired oil painting with refined brushwork',
    icon: '🖼️',
    colorPalette: ['#D4A574', '#8B7355', '#F5DEB3', '#CD853F'],
    
    promptStructure: {
      medium: '((oil painting on canvas:1.4)), ((traditional oil medium:1.3))',
      subjectPreservation: 'EXACT SAME subject, NO CHANGES to identity, preserve all facial features, maintain exact proportions',
      styleKeywords: '((Renaissance brushwork:1.3)), ((classical technique:1.2)), ((subtle impasto:1.2)), ((glazing layers:1.2))',
      artistInfluence: 'in the style of Rembrandt and Vermeer, old master technique',
      lighting: '((warm chiaroscuro lighting:1.2)), dramatic light and shadow, golden hour glow',
      technicalDetails: '((visible canvas texture:1.2)), varnished surface, museum quality, fine details',
      vaeCompensation: 'highly detailed, sharp focus, intricate textures, crisp edges, fine brushstrokes'
    },
    
    negativePromptStructure: {
      subjectProtection: 'different person, changed identity, wrong face, altered features, transformed subject',
      styleExclusions: 'photograph, digital art, 3d render, watercolor, anime, cartoon, modern art, abstract',
      qualityIssues: 'blurry, low quality, artifacts, oversaturated, plastic, smooth, flat, symmetrical'
    },
    
    passes: {
      initial: {
        name: 'Foundation',
        description: 'Establish oil painting base with strong subject preservation',
        denoising_strength: 0.40, // RL optimized
        cfg_scale: 5.0, // RL UPDATED: Lower CFG better for preservation
        steps: 30,
        promptModifier: 'initial oil painting transformation, subject completely unchanged'
      },
      refinement: {
        name: 'Enhancement',
        description: 'Enhance painterly qualities',
        denoising_strength: 0.20,
        cfg_scale: 5.5, // RL UPDATED: Lower CFG maintains quality
        steps: 20,
        promptModifier: 'enhance oil paint texture, refine brushstrokes'
      },
      detail: {
        name: 'Final Touch',
        description: 'Add fine details and varnish effect',
        denoising_strength: 0.15,
        cfg_scale: 5.5,
        steps: 15,
        promptModifier: 'add final details, varnish sheen, museum finish'
      }
    },
    
    controlnets: [
      {
        model: 'control_v11p_sd15_canny',
        module: 'canny',
        weight: 0.55, // RL optimized
        guidanceStart: 0.0,
        guidanceEnd: 1.0,
        thresholdA: 100,
        thresholdB: 200,
        controlMode: 'Balanced'
      },
      {
        model: 'control_v11p_sd15_openpose',
        module: 'openpose_full',
        weight: 0.45, // For human portraits
        guidanceStart: 0.0,
        guidanceEnd: 0.8,
        controlMode: 'Balanced'
      },
      {
        model: 'control_v11f1p_sd15_depth',
        module: 'depth_midas',
        weight: 0.35,
        guidanceStart: 0.2,
        guidanceEnd: 0.9,
        controlMode: 'My prompt is more important'
      }
    ],
    
    sampler: 'DPM++ 2M SDE Karras',
    vae: 'vae-ft-mse-840000-ema-pruned.ckpt' // Better for paintings
  },
  
  {
    id: 'thick_textured',
    name: 'Thick & Textured',
    description: 'Van Gogh-inspired with bold, expressive brushstrokes',
    icon: '🌻',
    colorPalette: ['#FF6B35', '#004E89', '#FFC107', '#8E24AA'],
    
    promptStructure: {
      medium: '((thick oil paint on canvas:1.4)), ((heavy impasto technique:1.3))',
      subjectPreservation: 'EXACT SAME subject identity preserved, all features maintained, no transformation',
      styleKeywords: '((Van Gogh style brushstrokes:1.3)), ((expressive paint application:1.3)), ((visible paint ridges:1.2)), ((palette knife marks:1.2))',
      artistInfluence: 'painted by Vincent van Gogh, post-impressionist masterpiece',
      lighting: '((vibrant contrasting colors:1.2)), swirling energy, dynamic movement',
      technicalDetails: '((three-dimensional paint texture:1.2)), thick paint buildup, tactile surface',
      vaeCompensation: 'highly textured, sharp paint ridges, detailed brushwork, clear definition'
    },
    
    negativePromptStructure: {
      subjectProtection: 'different subject, species change, wrong identity, altered appearance',
      styleExclusions: 'smooth, flat, photograph, digital, watercolor, thin paint, clean',
      qualityIssues: 'blurry, low quality, muddy colors, oversimplified'
    },
    
    passes: {
      initial: {
        name: 'Base Texture',
        description: 'Create thick paint foundation',
        denoising_strength: 0.45, // RL optimized
        cfg_scale: 5.5, // RL UPDATED: Lower CFG for better results
        steps: 35,
        promptModifier: 'initial thick paint application, subject preserved',
        controlnetWeightOverrides: {
          'control_v11p_sd15_canny': 0.70 // Stronger for texture
        }
      },
      refinement: {
        name: 'Texture Enhancement',
        description: 'Build up paint layers',
        denoising_strength: 0.25,
        cfg_scale: 6.0, // RL UPDATED: Reduced for consistency
        steps: 20,
        promptModifier: 'enhance impasto effect, add paint depth'
      }
    },
    
    controlnets: [
      {
        model: 'control_v11p_sd15_canny',
        module: 'canny',
        weight: 0.65,
        guidanceStart: 0.0,
        guidanceEnd: 1.0,
        thresholdA: 80,
        thresholdB: 160,
        controlMode: 'Balanced'
      },
      {
        model: 'control_v11f1p_sd15_depth',
        module: 'depth_midas',
        weight: 0.50,
        guidanceStart: 0.1,
        guidanceEnd: 0.9,
        controlMode: 'Balanced'
      }
    ],
    
    sampler: 'Euler a'
  },
  
  {
    id: 'soft_impressionist',
    name: 'Soft & Dreamy',
    description: 'Monet-style impressionism with gentle, luminous effects',
    icon: '🪷',
    colorPalette: ['#FFE4E1', '#E6E6FA', '#F0E68C', '#98FB98'],
    
    promptStructure: {
      medium: '((impressionist oil painting:1.3)), ((soft oil on canvas:1.2))',
      subjectPreservation: 'PRESERVE subject identity completely, maintain recognition, exact same subject',
      styleKeywords: '((Monet brushwork:1.2)), ((soft dappled strokes:1.2)), ((gentle impasto:1.1)), ((loose brushwork:1.2))',
      artistInfluence: 'Claude Monet painting, impressionist garden scene aesthetic',
      lighting: '((soft diffused light:1.2)), ((atmospheric haze:1.1)), dreamy quality, romantic mood',
      technicalDetails: '((delicate paint texture:1.2)), subtle canvas grain, museum piece',
      vaeCompensation: 'soft details, gentle transitions, luminous quality, refined edges'
    },
    
    negativePromptStructure: {
      subjectProtection: 'different subject, wrong identity, transformed features, mutation',
      styleExclusions: 'sharp, hard edges, photograph, digital, modern, harsh',
      qualityIssues: 'overblurred, muddy, flat, oversaturated'
    },
    
    passes: {
      initial: {
        name: 'Soft Foundation',
        description: 'Create impressionist base',
        denoising_strength: 0.25, // REDUCED: Preserve features, texture only
        cfg_scale: 3.0, // ULTRA LOW: Maximum preservation
        steps: 20,
        promptModifier: 'initial soft impressionist touch, subject unchanged'
      },
      refinement: {
        name: 'Light Effects',
        description: 'Add atmospheric effects',
        denoising_strength: 0.10, // MINIMAL: Polish only
        cfg_scale: 3.5, // LOW: Preserve everything
        steps: 10,
        promptModifier: 'enhance light effects, add shimmer'
      }
    },
    
    controlnets: [
      {
        model: 'control_v11p_sd15_canny',
        module: 'canny',
        weight: 1.0, // MAXIMUM: Total structure preservation
        guidanceStart: 0.0,
        guidanceEnd: 1.0,
        thresholdA: 120,
        thresholdB: 250,
        controlMode: 'ControlNet is more important'
      },
      {
        model: 'control_v11p_sd15_openpose',
        module: 'openpose_full',
        weight: 0.0, // DISABLED: Causes animal face distortion
        guidanceStart: 0.0,
        guidanceEnd: 0.8,
        controlMode: 'Balanced'
      },
      {
        model: 'control_v11f1p_sd15_depth',
        module: 'depth_midas',
        weight: 0.35, // RL OPTIMIZED: Supporting role
        guidanceStart: 0.3,
        guidanceEnd: 0.8,
        controlMode: 'My prompt is more important'
      }
    ],
    
    sampler: 'DPM++ 2M SDE Karras'
  }
]

// Helper function to build complete prompt from structure
export function buildPrompt(style: EnhancedOilPaintingStyle, passName?: string): string {
  const ps = style.promptStructure
  const parts = [
    ps.medium,
    ps.subjectPreservation,
    ps.styleKeywords,
    ps.artistInfluence || '',
    ps.lighting,
    ps.technicalDetails,
    ps.vaeCompensation
  ].filter(p => p.length > 0)
  
  // Add pass-specific modifier if provided
  if (passName) {
    const pass = Object.values(style.passes).find(p => p.name === passName)
    if (pass?.promptModifier) {
      parts.push(pass.promptModifier)
    }
  }
  
  // Add LoRA triggers if available
  if (style.loras) {
    style.loras.forEach(lora => {
      if (lora.trigger) {
        parts.push(lora.trigger)
      }
    })
  }
  
  return parts.join(', ')
}

// Helper function to build negative prompt
export function buildNegativePrompt(style: EnhancedOilPaintingStyle): string {
  const ns = style.negativePromptStructure
  return [
    ns.subjectProtection,
    ns.styleExclusions,
    ns.qualityIssues
  ].join(', ')
}

// Get style by ID
export function getEnhancedStyleById(id: string): EnhancedOilPaintingStyle | undefined {
  return enhancedOilPaintingStyles.find(style => style.id === id)
}

// Get recommended LoRAs for oil painting (to be populated after downloading)
export const recommendedLoras = [
  {
    name: 'oil_painting_style_v1',
    url: 'https://civitai.com/models/...',
    weight: 0.7,
    trigger: '<lora:oil_painting_style_v1:0.7>',
    description: 'General oil painting enhancement'
  },
  {
    name: 'impasto_texture_v2',
    url: 'https://civitai.com/models/...',
    weight: 0.5,
    trigger: '<lora:impasto_texture_v2:0.5>',
    description: 'Thick paint texture enhancement'
  },
  {
    name: 'classical_portrait_v1',
    url: 'https://civitai.com/models/...',
    weight: 0.6,
    trigger: '<lora:classical_portrait_v1:0.6>',
    description: 'Renaissance portrait style'
  }
]