/**
 * Replicate API Client for Oil Painting Conversion
 * Using FLUX.1 and other models for high-quality artistic transformations
 */

import Replicate from 'replicate'

// Model configurations for different quality levels
export const REPLICATE_MODELS = {
  // Fast and cheap - good for quick previews
  quick: {
    model: 'fofr/style-transfer',
    version: 'latest', // Will be replaced with actual version
    cost: 0.007,
    time: '8 seconds',
    description: 'Fast style transfer - good for quick previews'
  },
  
  // FLUX.1 for high quality oil painting
  standard: {
    model: 'black-forest-labs/flux-dev',
    version: 'latest',
    cost: 0.02,
    time: '20-30 seconds',
    description: 'FLUX.1 [dev] - High quality artistic transformation'
  },
  
  // FLUX.1 Schnell - faster, fully open source
  fast: {
    model: 'black-forest-labs/flux-schnell',
    version: 'latest',
    cost: 0.01,
    time: '5-10 seconds',
    description: 'FLUX.1 [schnell] - Fast, good quality'
  },
  
  // Specialized oil painting model
  premium: {
    model: 'jiupinjia/stylized-neural-painting-oil',
    version: 'latest',
    cost: 0.14,
    time: '11 minutes',
    description: 'Specialized oil painting with brush strokes'
  }
}

// Oil painting style prompts for different artistic styles
export const OIL_PAINTING_PROMPTS = {
  classic: {
    prompt: 'PRESERVE EXACT SUBJECT IDENTITY, traditional oil painting on canvas, thick oil paint brushstrokes, impasto technique, classical Renaissance style, warm golden hour lighting, visible canvas texture, painterly brushwork, museum quality oil painting, maintain exact same subject and pose, rich oil paint colors, traditional artist technique, old master painting style',
    negative: 'different subject, wrong animal, human face, portrait frames, multiple subjects, changed identity, photograph, photo, digital art, 3d render, smooth surface, flat colors, cartoon, anime, watercolor, sketch, modern, abstract, deformed, distorted, wrong anatomy, missing features, transformation, mutation, CGI, computer graphics'
  },
  
  impressionist: {
    prompt: 'PRESERVE EXACT SUBJECT IDENTITY, impressionist oil painting, thick visible brushstrokes, Monet inspired oil painting technique, broken color technique, dappled sunlight through oil paint, textured canvas surface, plein air painting style, loose painterly strokes, vibrant oil paint palette, atmospheric oil painting on canvas, maintain exact subject',
    negative: 'different subject, changed animal, human face, portrait frames, transformation, photograph, photo, sharp focus, digital, photorealistic, hard edges, smooth surface, vector art, CGI, 3d render, flat colors, deformed, distorted features, wrong proportions, mutation'
  },
  
  vangogh: {
    prompt: 'PRESERVE EXACT SUBJECT IDENTITY, Van Gogh style oil painting, extremely thick impasto oil paint, heavy textured brushstrokes, swirling thick paint application, expressive oil colors, post-impressionist oil painting technique, visible raised paint texture, palette knife oil painting, dramatic thick oil paint strokes, maintain exact subject and composition',
    negative: 'different subject, changed animal, human face, portrait frames, transformation, photograph, photo, smooth, digital, CGI, 3d render, minimalist, flat colors, thin paint, watercolor, acrylic, deformed, distorted, anatomical errors, missing details, mutation'
  },
  
  modern: {
    prompt: 'PRESERVE EXACT SUBJECT IDENTITY, contemporary oil painting conversion, keep same subject and pose, bold brushstrokes, thick texture, palette knife work, modern artistic interpretation, maintain composition and background, gallery quality, expressive color, preserve original subject identity',
    negative: 'different subject, wrong animal, human face, portrait frames, multiple subjects, changed identity, photograph, old style, classical, photorealistic, digital art, smooth gradient, deformed, wrong anatomy, distorted features, transformation, mutation'
  }
}

export class ReplicateClient {
  private client: Replicate
  private apiKey: string
  
  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.REPLICATE_API_TOKEN || ''
    
    if (!this.apiKey) {
      throw new Error('Replicate API key is required. Get one at https://replicate.com/account/api-tokens')
    }
    
    this.client = new Replicate({
      auth: this.apiKey
    })
  }
  
  /**
   * Convert image to oil painting using FLUX.1
   * @param imageInput - Can be a data URL string or a File object
   */
  async convertToOilPainting(
    imageInput: string | File,
    options: {
      quality?: 'quick' | 'standard' | 'fast' | 'premium'
      style?: keyof typeof OIL_PAINTING_PROMPTS
      strength?: number // 0.1-1.0, how much to change the image
      preservationMode?: 'low' | 'medium' | 'high' | 'extreme'
      deterministicMode?: boolean // Use fixed seed for consistent results
    } = {}
  ) {
    const quality = options.quality || 'standard'
    const style = options.style || 'classic'
    
    // Adjust strength based on preservation mode - much more conservative!
    const preservationMode = options.preservationMode || 'high'
    const defaultStrength = {
      'low': 0.35,      // More artistic freedom but still preserve subject
      'medium': 0.25,   // Balanced - good compromise
      'high': 0.20,     // Better preservation (recommended)
      'extreme': 0.15   // Maximum preservation - minimal changes
    }[preservationMode]
    
    const strength = options.strength || defaultStrength
    const deterministicMode = options.deterministicMode || false
    
    // Generate seed - deterministic mode uses same seed for consistency
    const seed = deterministicMode ? 42 : Math.floor(Math.random() * 1000000)
    
    const modelConfig = REPLICATE_MODELS[quality]
    const stylePrompts = OIL_PAINTING_PROMPTS[style]
    
    console.log(`🎨 Converting with ${quality} quality using ${modelConfig.model}`)
    console.log(`   Style: ${style}, Strength: ${strength}`)
    
    // Handle different input types
    let imageToUse: string | File = imageInput
    if (typeof imageInput === 'string') {
      // If it's a string (data URL or regular URL), use it directly
      imageToUse = imageInput
      console.log(`📷 Using image as ${imageInput.startsWith('data:') ? 'data URL' : 'URL'}`)
    } else if (imageInput instanceof File) {
      // Use File object directly - Replicate handles this well
      imageToUse = imageInput
      console.log(`📷 Using File object: ${imageInput.name}`)
    }
    
    try {
      let output
      
      if (quality === 'quick') {
        // Use SDXL Turbo for quick previews (much faster than style transfer)
        output = await this.client.run(
          "stability-ai/sdxl:7762fd07cf82c948538e41f63f77d685e02b063e37e496e96eefd46c929f9bdc",
          {
            input: {
              prompt: stylePrompts.prompt + ', masterpiece, best quality',
              image: imageToUse,
              refine: "no_refiner",
              strength: strength,
              num_inference_steps: 8,
              negative_prompt: stylePrompts.negative,
              seed: seed, // Use controlled seed
              guidance_scale: 4.5 // Much lower guidance for better preservation
            }
          }
        )
      } else if (quality === 'premium') {
        // Use specialized oil painting model
        output = await this.client.run(
          "jiupinjia/stylized-neural-painting-oil:b1e80e0a7df7ebf5dc34424e5488b7b008596c2c89c8f05a5b58030f7e5a9d84",
          {
            input: {
              image: imageToUse,
              max_strokes: 500,
              output_type: 'png'
            }
          }
        )
      } else {
        // Use SDXL for standard/fast quality (FLUX doesn't support img2img)
        const model = "stability-ai/sdxl:7762fd07cf82c948538e41f63f77d685e02b063e37e496e96eefd46c929f9bdc"
        
        // Enhanced oil painting prompts for better artistic results
        const enhancedPrompt = `${stylePrompts.prompt}, thick oil paint brushstrokes, impasto technique, visible canvas texture, artistic oil painting on canvas, museum quality artwork, traditional oil painting style, painterly effect, masterpiece, best quality, highly detailed`
        
        // Much lower guidance scale for better subject preservation
        const guidanceScale = preservationMode === 'extreme' ? 3.5 : 
                             preservationMode === 'high' ? 4.5 : 
                             preservationMode === 'medium' ? 5.5 : 6.5
        
        output = await this.client.run(
          model,
          {
            input: {
              prompt: enhancedPrompt,
              image: imageToUse,
              refine: quality === 'standard' ? "expert_ensemble_refiner" : "no_refiner",
              strength: strength, // How much to change from original
              num_inference_steps: quality === 'fast' ? 30 : 50, // More steps for oil painting texture
              negative_prompt: stylePrompts.negative + ', digital art, 3d render, photograph, photorealistic, smooth, plastic',
              guidance_scale: guidanceScale,
              prompt_strength: 0.8, // Give more weight to the original image
              apply_watermark: false,
              seed: seed, // Use controlled seed
              scheduler: "K_EULER_ANCESTRAL" // Use stable scheduler
            }
          }
        )
      }
      
      // Extract the image URL from output
      const resultUrl = Array.isArray(output) ? output[0] : output
      
      return {
        success: true,
        imageUrl: resultUrl,
        metadata: {
          model: modelConfig.model,
          quality,
          style,
          strength,
          estimatedCost: modelConfig.cost,
          processingTime: modelConfig.time
        }
      }
      
    } catch (error) {
      console.error('Replicate conversion error:', error)
      throw new Error(`Failed to convert image: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
  
  /**
   * Get reference oil painting image for style transfer
   */
  private getStyleReferenceImage(style: keyof typeof OIL_PAINTING_PROMPTS): string {
    // These would be URLs to reference oil paintings in each style
    // You'd host these images somewhere accessible
    const styleReferences = {
      classic: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0f/Rembrandt_van_Rijn_-_Self-Portrait_-_Google_Art_Project.jpg/800px-Rembrandt_van_Rijn_-_Self-Portrait_-_Google_Art_Project.jpg',
      impressionist: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5d/Claude_Monet%2C_Water_Lilies%2C_1906%2C_Ryerson.jpg/1024px-Claude_Monet%2C_Water_Lilies%2C_1906%2C_Ryerson.jpg',
      vangogh: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg/1024px-Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg',
      modern: 'https://upload.wikimedia.org/wikipedia/en/1/1c/Pablo_Picasso%2C_1910%2C_Girl_with_a_Mandolin_%28Fanny_Tellier%29%2C_oil_on_canvas%2C_100.3_x_73.6_cm%2C_Museum_of_Modern_Art_New_York..jpg'
    }
    
    return styleReferences[style] || styleReferences.classic
  }
  
  /**
   * Check if Replicate API is configured and working
   */
  async checkStatus(): Promise<{
    configured: boolean
    credits?: number
    error?: string
  }> {
    if (!this.apiKey) {
      return {
        configured: false,
        error: 'No API key configured'
      }
    }
    
    try {
      // Test the API with a simple model list call
      // Replicate doesn't expose account credits via API anymore
      const models = await this.client.models.list()
      
      return {
        configured: true,
        // Credits info not available via API
      }
    } catch (error) {
      return {
        configured: false,
        error: error instanceof Error ? error.message : 'Failed to connect to Replicate'
      }
    }
  }
}