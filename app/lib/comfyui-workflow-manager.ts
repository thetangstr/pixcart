/**
 * ComfyUI Oil Painting Workflow Manager
 * Implements expert guide recommendations for oil painting conversion
 * 
 * Method 1: Simple Img2Img with LoRA (fast, good results)
 * Method 2: Advanced with ControlNet (superior control)
 */

import { ComfyUIClient, ComfyUIStyleConfig } from './comfyui-client'
import { 
  oilPaintingStyles,
  createOptimizedStyleConfig,
  adjustConfigForSubject,
  findOilPaintingLoRA
} from './comfyui-oil-painting-utils'

export interface WorkflowOptions {
  method: 'simple' | 'advanced'
  preserveDetails: boolean
  styleIntensity: number  // 0-1 scale
  customPrompt?: string
  subjectType?: 'portrait' | 'landscape' | 'still_life' | 'abstract'
}

export interface SubjectAnalysis {
  hasfaces: boolean
  isPortrait: boolean
  isLandscape: boolean
  hasFinDetails: boolean
  colorComplexity: 'low' | 'medium' | 'high'
}

export class ComfyUIWorkflowManager {
  private client: ComfyUIClient

  constructor(baseUrl = 'http://localhost:8188') {
    this.client = new ComfyUIClient(baseUrl)
  }

  /**
   * Main conversion method that selects optimal workflow based on expert guide
   */
  async convertToOilPainting(
    imageBase64: string,
    options: WorkflowOptions,
    subjectAnalysis?: SubjectAnalysis
  ): Promise<string> {
    // Check connection
    const isConnected = await this.client.checkConnection()
    if (!isConnected) {
      throw new Error('ComfyUI is not available')
    }

    // Get available models
    const models = await this.client.getModels()
    
    // Select best checkpoint for oil painting
    const checkpoint = this.selectBestCheckpoint(models.checkpoints)
    
    // Create optimized configuration
    let config = this.createWorkflowConfig(
      checkpoint,
      models,
      options
    )
    
    // Adjust for subject if analysis provided
    if (subjectAnalysis) {
      config = adjustConfigForSubject(config, subjectAnalysis)
    }
    
    // Process with selected method
    if (options.method === 'advanced' && models.controlnets.length > 0) {
      return await this.processWithControlNet(imageBase64, config, models)
    } else {
      return await this.processSimple(imageBase64, config, models)
    }
  }

  /**
   * Method 1 from expert guide: Simple Img2Img with LoRA
   * Fast and effective for most cases
   */
  private async processSimple(
    imageBase64: string,
    config: ComfyUIStyleConfig,
    models: { checkpoints: string[], loras: string[], controlnets: string[] }
  ): Promise<string> {
    console.log('Processing with Method 1: Simple Img2Img with LoRA')
    
    // Ensure we have oil painting LoRA if available
    if (!config.lora_name && models.loras.length > 0) {
      const oilLoRA = findOilPaintingLoRA(models.loras)
      if (oilLoRA) {
        config.lora_name = oilLoRA
        config.lora_strength = 0.8  // Expert guide recommendation
        config.lora_clip_strength = 0.8
        console.log(`Auto-detected oil painting LoRA: ${oilLoRA}`)
      }
    }
    
    // Adjust denoising for simple method (guide recommends 0.55-0.8)
    if (!config.controlnet_model) {
      // Without ControlNet, use conservative denoising
      config.denoise = Math.min(config.denoise || 0.75, 0.75)
      console.log(`Adjusted denoising for Method 1: ${config.denoise}`)
    }
    
    // Process image
    return await this.client.convertImage(imageBase64, config)
  }

  /**
   * Method 2 from expert guide: Advanced Img2Img with ControlNet
   * Superior compositional control
   */
  private async processWithControlNet(
    imageBase64: string,
    config: ComfyUIStyleConfig,
    models: { checkpoints: string[], loras: string[], controlnets: string[] }
  ): Promise<string> {
    console.log('Processing with Method 2: Advanced with ControlNet')
    
    // Select best ControlNet model based on style
    if (!config.controlnet_model && models.controlnets.length > 0) {
      config = this.selectControlNetForStyle(config, models.controlnets)
    }
    
    // With ControlNet, we can use higher denoising (guide recommends up to 1.0)
    if (config.controlnet_model) {
      const minDenoise = config.denoise || 0.8
      config.denoise = Math.max(minDenoise, 0.8)
      console.log(`Adjusted denoising for Method 2 with ControlNet: ${config.denoise}`)
    }
    
    // Process image with ControlNet
    return await this.client.convertImage(imageBase64, config)
  }

  /**
   * Create workflow configuration based on options and available models
   */
  private createWorkflowConfig(
    checkpoint: string,
    models: { checkpoints: string[], loras: string[], controlnets: string[] },
    options: WorkflowOptions
  ): ComfyUIStyleConfig {
    // Determine style based on intensity
    let styleName: keyof typeof oilPaintingStyles
    if (options.styleIntensity < 0.3) {
      styleName = 'portrait_master'
    } else if (options.styleIntensity < 0.5) {
      styleName = 'classical'
    } else if (options.styleIntensity < 0.7) {
      styleName = 'impressionist'
    } else if (options.styleIntensity < 0.9) {
      styleName = 'expressionist'
    } else {
      styleName = 'abstract_expressionist'
    }
    
    // Create optimized config
    const config = createOptimizedStyleConfig(
      styleName,
      checkpoint,
      models.loras,
      models.controlnets,
      options.subjectType || 'portrait'
    )
    
    // Apply custom prompt if provided
    if (options.customPrompt) {
      config.positive_prompt = `${config.positive_prompt}, ${options.customPrompt}`
    }
    
    // Adjust for detail preservation
    if (options.preserveDetails) {
      config.denoise = Math.max(0.45, (config.denoise || 0.7) * 0.8)
      config.steps = Math.min(45, (config.steps || 30) + 10)
      console.log(`Adjusted for detail preservation: denoise=${config.denoise}, steps=${config.steps}`)
    }
    
    return config
  }

  /**
   * Select best checkpoint for oil painting
   * Prioritizes art-focused models over photorealistic ones
   */
  private selectBestCheckpoint(checkpoints: string[]): string {
    // Priority order for oil painting
    const priorities = [
      'dreamshaper',  // Excellent for artistic styles
      'deliberate',   // Good for painterly effects
      'anything',     // Versatile artistic model
      'protogen',     // Good for various styles
      'revanimated',  // Artistic focus
      'sd_xl_base',   // SDXL if available
      'v1-5-pruned'   // Standard SD as fallback
    ]
    
    for (const priority of priorities) {
      const match = checkpoints.find(cp => 
        cp.toLowerCase().includes(priority.toLowerCase())
      )
      if (match) {
        console.log(`Selected checkpoint: ${match}`)
        return match
      }
    }
    
    // Fallback to first available
    console.log(`Using default checkpoint: ${checkpoints[0]}`)
    return checkpoints[0]
  }

  /**
   * Select appropriate ControlNet based on style and guide recommendations
   */
  private selectControlNetForStyle(
    config: ComfyUIStyleConfig,
    controlnets: string[]
  ): ComfyUIStyleConfig {
    const updatedConfig = { ...config }
    
    // Expert guide recommendations:
    // - Canny: Best for sharp lines, portraits, architecture
    // - Depth: Best for 3D shape, landscapes, soft painterly feel
    
    const isPortrait = config.positive_prompt.toLowerCase().includes('portrait')
    const isLandscape = config.positive_prompt.toLowerCase().includes('landscape')
    const isExpressive = config.style_intensity && config.style_intensity > 0.7
    
    if (isPortrait || !isExpressive) {
      // Use Canny for portraits and detailed work
      const cannyModel = controlnets.find(cn => cn.toLowerCase().includes('canny'))
      if (cannyModel) {
        updatedConfig.controlnet_model = cannyModel
        updatedConfig.preprocessor = 'CannyEdgePreprocessor'
        updatedConfig.controlnet_strength = 0.75  // Higher for portraits
        console.log(`Selected Canny ControlNet for portrait/detail: ${cannyModel}`)
      }
    } else if (isLandscape || isExpressive) {
      // Use Depth for landscapes and expressive styles
      const depthModel = controlnets.find(cn => cn.toLowerCase().includes('depth'))
      if (depthModel) {
        updatedConfig.controlnet_model = depthModel
        updatedConfig.preprocessor = 'DepthAnythingV2Preprocessor'
        updatedConfig.controlnet_strength = 0.6  // Lower for artistic freedom
        console.log(`Selected Depth ControlNet for landscape/expression: ${depthModel}`)
      }
    }
    
    // Fallback to any available ControlNet
    if (!updatedConfig.controlnet_model && controlnets.length > 0) {
      updatedConfig.controlnet_model = controlnets[0]
      updatedConfig.preprocessor = controlnets[0].includes('canny') ? 
        'CannyEdgePreprocessor' : 'DepthAnythingV2Preprocessor'
      updatedConfig.controlnet_strength = 0.65
      console.log(`Using fallback ControlNet: ${controlnets[0]}`)
    }
    
    return updatedConfig
  }

  /**
   * Analyze image to determine optimal settings
   * This is a placeholder - in production, you'd use image analysis
   */
  analyzeSubject(imageBase64: string): SubjectAnalysis {
    // In a real implementation, this would analyze the image
    // For now, return default analysis
    return {
      hasfaces: false,
      isPortrait: false,
      isLandscape: true,
      hasFinDetails: false,
      colorComplexity: 'medium'
    }
  }

  /**
   * Get available styles that work with current ComfyUI setup
   */
  async getAvailableStyles(): Promise<Array<{
    id: string
    name: string
    description: string
    recommended: boolean
  }>> {
    const models = await this.client.getModels()
    const hasOilLoRA = models.loras.some(lora => 
      findOilPaintingLoRA([lora]) !== undefined
    )
    const hasControlNet = models.controlnets.length > 0
    
    return Object.entries(oilPaintingStyles).map(([id, style]) => ({
      id,
      name: style.name,
      description: style.description,
      recommended: (
        (style.preferredControlNet === 'none' || hasControlNet) &&
        (style.intensity < 0.7 || hasOilLoRA)
      )
    }))
  }
}

// Export singleton instance
export const workflowManager = new ComfyUIWorkflowManager()