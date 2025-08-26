interface ComfyUIWorkflow {
  [key: string]: {
    inputs: Record<string, any>
    class_type: string
    _meta?: {
      title: string
    }
  }
}

interface ComfyUIQueueResponse {
  prompt_id: string
  number: number
  node_errors: Record<string, any>
}

interface ComfyUIHistoryResponse {
  [prompt_id: string]: {
    prompt: any[]
    outputs: {
      [node_id: string]: {
        images?: Array<{
          filename: string
          subfolder: string
          type: string
        }>
      }
    }
    status: {
      status_str: string
      completed: boolean
      messages: any[]
    }
  }
}

export interface ComfyUIStyleConfig {
  checkpoint: string
  lora_name?: string
  lora_strength?: number
  lora_clip_strength?: number  // Separate CLIP strength for LoRA
  positive_prompt: string
  negative_prompt: string
  steps: number
  cfg: number
  sampler_name: string
  scheduler: string
  denoise: number
  controlnet_strength?: number
  controlnet_model?: string
  preprocessor?: string
  // Advanced oil painting parameters
  use_second_lora?: boolean
  second_lora_name?: string
  second_lora_strength?: number
  vae_model?: string  // Optional custom VAE for better colors
  upscale_model?: string  // Optional upscaler for final output
  style_intensity?: number  // 0-1 scale for style application
}

export class ComfyUIClient {
  private baseUrl: string
  private wsUrl: string

  constructor(baseUrl = 'http://localhost:8188') {
    this.baseUrl = baseUrl
    this.wsUrl = baseUrl.replace('http', 'ws')
  }

  async checkConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/system_stats`)
      return response.ok
    } catch (error) {
      console.error('ComfyUI connection failed:', error)
      return false
    }
  }

  async getModels(): Promise<{ checkpoints: string[], loras: string[], controlnets: string[] }> {
    try {
      const response = await fetch(`${this.baseUrl}/object_info`)
      const objectInfo = await response.json()
      
      return {
        checkpoints: objectInfo.CheckpointLoaderSimple?.input?.required?.ckpt_name?.[0] || [],
        loras: objectInfo.LoraLoader?.input?.required?.lora_name?.[0] || [],
        controlnets: objectInfo.ControlNetLoader?.input?.required?.control_net_name?.[0] || []
      }
    } catch (error) {
      console.error('Failed to get ComfyUI models:', error)
      return { checkpoints: [], loras: [], controlnets: [] }
    }
  }

  async uploadImage(imageBase64: string): Promise<string> {
    // Convert base64 to blob
    const base64Data = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64
    const binaryString = Buffer.from(base64Data, 'base64')
    
    // Create form data
    const formData = new FormData()
    const blob = new Blob([binaryString], { type: 'image/png' })
    const filename = `upload_${Date.now()}.png`
    formData.append('image', blob, filename)
    
    const response = await fetch(`${this.baseUrl}/upload/image`, {
      method: 'POST',
      body: formData
    })
    
    if (!response.ok) {
      throw new Error(`Failed to upload image: ${response.statusText}`)
    }
    
    const result = await response.json()
    return result.name || filename
  }

  createOilPaintingWorkflow(
    imageName: string,
    config: ComfyUIStyleConfig,
    useControlNet = false
  ): ComfyUIWorkflow {
    console.log('createOilPaintingWorkflow called with useControlNet:', useControlNet)
    const seed = Math.floor(Math.random() * 1000000)
    
    // Enhanced prompts with oil painting keywords based on the guide
    const enhancedPositive = this.enhancePromptForOilPainting(config.positive_prompt, config.style_intensity || 1.0)
    const enhancedNegative = this.enhanceNegativePrompt(config.negative_prompt)
    // Initialize model and clip nodes
    let currentModelNode: [string, number] = ["1", 0]
    let currentClipNode: [string, number] = ["1", 1]
    
    const workflow: ComfyUIWorkflow = {
      // Load Checkpoint
      "1": {
        "inputs": {
          "ckpt_name": config.checkpoint
        },
        "class_type": "CheckpointLoaderSimple",
        "_meta": {
          "title": "Load Checkpoint"
        }
      },
      
      // Load Image
      "3": {
        "inputs": {
          "image": imageName
        },
        "class_type": "LoadImage",
        "_meta": {
          "title": "Load Image"
        }
      },
      
      // VAE Encode (for img2img)
      "9": {
        "inputs": {
          "pixels": ["3", 0],
          "vae": ["1", 2]
        },
        "class_type": "VAEEncode",
        "_meta": {
          "title": "VAE Encode"
        }
      },
      
      // KSampler - will be updated with proper model reference later
      "10": {
        "inputs": {
          "seed": seed,
          "steps": config.steps,
          "cfg": config.cfg,
          "sampler_name": config.sampler_name,
          "scheduler": config.scheduler,
          "denoise": config.denoise,
          "model": ["1", 0],  // Will be updated after LoRA loading
          "positive": useControlNet ? ["8", 0] : ["4", 0],
          "negative": ["5", 0],
          "latent_image": ["9", 0]
        },
        "class_type": "KSampler",
        "_meta": {
          "title": "KSampler"
        }
      },
      
      // VAE Decode
      "11": {
        "inputs": {
          "samples": ["10", 0],
          "vae": ["1", 2]
        },
        "class_type": "VAEDecode",
        "_meta": {
          "title": "VAE Decode"
        }
      },
      
      // Save Image
      "12": {
        "inputs": {
          "filename_prefix": "ComfyUI_oil_painting",
          "images": ["11", 0]
        },
        "class_type": "SaveImage",
        "_meta": {
          "title": "Save Image"
        }
      }
    }
    
    // Add LoRA if specified (Method 1 from expert guide)
    if (config.lora_name && config.lora_strength) {
      workflow["2"] = {
        "inputs": {
          "lora_name": config.lora_name,
          "strength_model": config.lora_strength,
          "strength_clip": config.lora_clip_strength || config.lora_strength,
          "model": currentModelNode,
          "clip": currentClipNode
        },
        "class_type": "LoraLoader",
        "_meta": {
          "title": "Load Oil Painting LoRA"
        }
      }
      
      currentModelNode = ["2", 0]
      currentClipNode = ["2", 1]
      
      // Chain second LoRA if specified (for combining styles)
      if (config.use_second_lora && config.second_lora_name) {
        workflow["14"] = {
          "inputs": {
            "lora_name": config.second_lora_name,
            "strength_model": config.second_lora_strength || 0.5,
            "strength_clip": config.second_lora_strength || 0.5,
            "model": currentModelNode,
            "clip": currentClipNode
          },
          "class_type": "LoraLoader",
          "_meta": {
            "title": "Load Second LoRA (Style Enhancement)"
          }
        }
        currentModelNode = ["14", 0]
        currentClipNode = ["14", 1]
      }
    }
    
    // CLIP Text Encoding with enhanced prompts
    workflow["4"] = {
      "inputs": {
        "text": enhancedPositive,
        "clip": currentClipNode
      },
      "class_type": "CLIPTextEncode",
      "_meta": {
        "title": "CLIP Text Encode (Positive)"
      }
    }
    
    workflow["5"] = {
      "inputs": {
        "text": enhancedNegative,
        "clip": currentClipNode
      },
      "class_type": "CLIPTextEncode",
      "_meta": {
        "title": "CLIP Text Encode (Negative)"
      }
    }
    
    // Update KSampler to use current model node
    workflow["10"]["inputs"]["model"] = currentModelNode

    // Add ControlNet if enabled (Method 2 from expert guide - Advanced with ControlNet)
    if (useControlNet && config.controlnet_strength && config.controlnet_model) {
      console.log('Adding ControlNet with model:', config.controlnet_model)
      // Load ControlNet Model
      workflow["6"] = {
        "inputs": {
          "control_net_name": config.controlnet_model
        },
        "class_type": "ControlNetLoader",
        "_meta": {
          "title": "Load ControlNet Model"
        }
      }
      
      // Preprocessor selection based on style and guide recommendations
      const preprocessorType = config.preprocessor || "Canny"
      
      if (preprocessorType === "CannyEdgePreprocessor" || preprocessorType === "Canny") {
        // Canny - Best for preserving sharp lines and details (portraits, architecture)
        // As per expert guide: Excellent for architecture, portraits, clear subjects
        workflow["7"] = {
          "inputs": {
            "low_threshold": 0.4,  // Normalized value (was 100/255)
            "high_threshold": 0.8,  // Normalized value (was 200/255)
            "image": ["3", 0]
          },
          "class_type": "Canny",
          "_meta": {
            "title": "Canny Edge Preprocessor"
          }
        }
      } else if (preprocessorType === "DepthAnythingV2Preprocessor" || preprocessorType === "DepthPreprocessor") {
        // Depth - Best for preserving 3D shape and form (landscapes, soft painterly feel)
        workflow["7"] = {
          "inputs": {
            "ckpt_name": "depth_anything_v2_vitl.pth",
            "resolution": 512,
            "image": ["3", 0]
          },
          "class_type": "DepthAnythingV2Preprocessor",
          "_meta": {
            "title": "Depth Preprocessor"
          }
        }
      } else if (preprocessorType === "LineArtPreprocessor") {
        // LineArt - Good for stylized oil paintings
        workflow["7"] = {
          "inputs": {
            "coarse": "disable",
            "resolution": 512,
            "image": ["3", 0]
          },
          "class_type": "LineArtPreprocessor",
          "_meta": {
            "title": "LineArt Preprocessor"
          }
        }
      } else {
        // Try AIO Preprocessor as fallback
        workflow["7"] = {
          "inputs": {
            "preprocessor": preprocessorType,
            "resolution": 512,
            "image": ["3", 0]
          },
          "class_type": "AIO_Preprocessor",
          "_meta": {
            "title": "AIO Preprocessor"
          }
        }
      }
      
      // Apply ControlNet
      workflow["8"] = {
        "inputs": {
          "strength": config.controlnet_strength,
          "conditioning": ["4", 0],
          "control_net": ["6", 0],
          "image": ["7", 0]
        },
        "class_type": "ControlNetApply",
        "_meta": {
          "title": "Apply ControlNet"
        }
      }
      
      // Add preview for preprocessed image
      workflow["13"] = {
        "inputs": {
          "images": ["7", 0]
        },
        "class_type": "PreviewImage",
        "_meta": {
          "title": "Preview Image"
        }
      }
    }

    // Add optional upscaling for high-quality output
    if (config.upscale_model) {
      workflow["15"] = {
        "inputs": {
          "model_name": config.upscale_model
        },
        "class_type": "UpscaleModelLoader",
        "_meta": {
          "title": "Load Upscale Model"
        }
      }
      
      workflow["16"] = {
        "inputs": {
          "upscale_model": ["15", 0],
          "image": ["11", 0]
        },
        "class_type": "ImageUpscaleWithModel",
        "_meta": {
          "title": "Upscale Image"
        }
      }
      
      // Update save to use upscaled image
      workflow["12"]["inputs"]["images"] = ["16", 0]
    }
    
    return workflow
  }
  
  /**
   * Enhance prompt with oil painting keywords based on the expert guide
   * Guide recommends: impasto, palette knife, textured brushstrokes, thick paint
   */
  private enhancePromptForOilPainting(basePrompt: string, intensity: number): string {
    const oilKeywords = [
      'oil painting',
      'oil on canvas',
      'visible brushstrokes',
      'painterly texture',
      'artistic masterpiece',
      'museum quality'
    ]
    
    const techniqueKeywords = [
      'impasto',
      'palette knife',
      'textured brushstrokes',
      'thick paint',
      'heavy paint application',
      'alla prima',
      'wet-on-wet'
    ]
    
    // Artists recommended by the expert guide
    const artistKeywords = [
      'by Vincent Van Gogh',
      'by Claude Monet',
      'by Rembrandt',
      'by John Singer Sargent',
      'by Caravaggio',
      'by J.M.W. Turner'
    ]
    
    // Styles recommended by the expert guide
    const styleKeywords = [
      'impressionism',
      'expressionism',
      'baroque',
      'post-impressionist',
      'romanticism',
      'classical realism'
    ]
    
    // Build enhanced prompt based on intensity and expert guide recommendations
    let enhancedPrompt = basePrompt
    
    // Always include basic oil painting keywords (essential as per guide)
    if (!basePrompt.toLowerCase().includes('oil painting')) {
      enhancedPrompt = `(masterpiece:1.2), best quality, oil painting, ${enhancedPrompt}`
    }
    
    // Add technique keywords for higher intensity (guide emphasizes these)
    if (intensity > 0.5 && !basePrompt.toLowerCase().includes('impasto')) {
      // Add multiple techniques for stronger effect
      const technique1 = techniqueKeywords[0] // impasto is most important
      const technique2 = techniqueKeywords[Math.floor(Math.random() * (techniqueKeywords.length - 1)) + 1]
      enhancedPrompt += `, ${technique1}, ${technique2}`
    }
    
    // Add artist reference for high intensity
    if (intensity > 0.7 && !basePrompt.toLowerCase().includes(' by ')) {
      const artist = artistKeywords[Math.floor(Math.random() * artistKeywords.length)]
      enhancedPrompt += `, ${artist}`
    }
    
    // Add style keyword if not present
    if (intensity > 0.6) {
      const hasStyle = styleKeywords.some(style => 
        basePrompt.toLowerCase().includes(style.toLowerCase())
      )
      if (!hasStyle) {
        const style = styleKeywords[Math.floor(Math.random() * styleKeywords.length)]
        enhancedPrompt += `, ${style}`
      }
    }
    
    // Add quality markers and medium description (important for oil painting effect)
    if (!basePrompt.includes('masterpiece')) {
      enhancedPrompt += ', masterpiece, museum quality, fine art'
    }
    
    // Add canvas texture description for realism
    if (!basePrompt.includes('canvas')) {
      enhancedPrompt += ', visible canvas texture'
    }
    
    return enhancedPrompt
  }
  
  /**
   * Enhance negative prompt to avoid photographic qualities
   * Based on expert guide: avoid photo, photographic, realism, digital art
   */
  private enhanceNegativePrompt(baseNegative: string): string {
    const photoKeywords = [
      'photograph',
      'photo',
      'photographic',
      'photorealistic',
      'hyperrealistic',
      'sharp focus',
      'digital photography'
    ]
    
    const digitalKeywords = [
      'digital art',
      '3d render',
      'cgi',
      'computer graphics',
      'vector art',
      'flat design'
    ]
    
    let enhancedNegative = baseNegative
    
    // Add photo avoidance if not present
    const hasPhotoNegative = photoKeywords.some(keyword => 
      baseNegative.toLowerCase().includes(keyword)
    )
    if (!hasPhotoNegative) {
      enhancedNegative = `photograph, photorealistic, ${enhancedNegative}`
    }
    
    // Add digital art avoidance
    const hasDigitalNegative = digitalKeywords.some(keyword => 
      baseNegative.toLowerCase().includes(keyword)
    )
    if (!hasDigitalNegative) {
      enhancedNegative += ', digital art, 3d render'
    }
    
    // Always avoid smooth surfaces for oil painting (critical for texture)
    if (!baseNegative.includes('smooth')) {
      enhancedNegative += ', smooth surface, flat colors, plastic, glossy'
    }
    
    // Add specific quality issues to avoid
    if (!baseNegative.includes('blurry')) {
      enhancedNegative += ', blurry, ugly, deformed'
    }
    
    return enhancedNegative
  }

  async queuePrompt(workflow: ComfyUIWorkflow): Promise<string> {
    const payload = {
      prompt: workflow,
      client_id: 'oil-painting-app'
    }
    
    console.log('Sending workflow to ComfyUI:', JSON.stringify(payload, null, 2))
    
    const response = await fetch(`${this.baseUrl}/prompt`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('ComfyUI queue error response:', errorText)
      throw new Error(`Failed to queue prompt: ${response.statusText}`)
    }

    const result: ComfyUIQueueResponse = await response.json()
    
    if (result.node_errors && Object.keys(result.node_errors).length > 0) {
      throw new Error(`Workflow errors: ${JSON.stringify(result.node_errors)}`)
    }

    return result.prompt_id
  }

  async waitForCompletion(promptId: string, timeoutMs = 480000): Promise<string> {
    const startTime = Date.now()
    
    while (Date.now() - startTime < timeoutMs) {
      try {
        const response = await fetch(`${this.baseUrl}/history/${promptId}`)
        const history: ComfyUIHistoryResponse = await response.json()
        
        const execution = history[promptId]
        if (execution && execution.status.completed) {
          // Look for SaveImage node first (node 12), then fall back to any image
          // This ensures we get the final processed image, not preview/debug images
          const saveImageNode = execution.outputs["12"]
          if (saveImageNode?.images?.length > 0) {
            const image = saveImageNode.images[0]
            console.log(`Found SaveImage output: ${image.filename}`)
            return await this.getImage(image.filename, image.subfolder, image.type)
          }
          
          // Fallback: Find any output image
          for (const nodeId in execution.outputs) {
            const output = execution.outputs[nodeId]
            // Skip preview nodes (usually node 13)
            if (nodeId === "13") continue
            
            if (output.images && output.images.length > 0) {
              const image = output.images[0]
              console.log(`Found output from node ${nodeId}: ${image.filename}`)
              return await this.getImage(image.filename, image.subfolder, image.type)
            }
          }
          throw new Error('No output image found in completed execution')
        }
        
        // Wait before checking again
        await new Promise(resolve => setTimeout(resolve, 1000))
      } catch (error) {
        console.error('Error checking execution status:', error)
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
    }
    
    throw new Error('Timeout waiting for ComfyUI execution')
  }

  async getImage(filename: string, subfolder = '', type = 'output'): Promise<string> {
    const params = new URLSearchParams({
      filename,
      type
    })
    
    if (subfolder) {
      params.set('subfolder', subfolder)
    }
    
    const response = await fetch(`${this.baseUrl}/view?${params}`)
    if (!response.ok) {
      throw new Error(`Failed to get image: ${response.statusText}`)
    }
    
    const arrayBuffer = await response.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString('base64')
    return `data:image/png;base64,${base64}`
  }

  async convertImage(imageBase64: string, config: ComfyUIStyleConfig): Promise<string> {
    // Check connection first
    const isConnected = await this.checkConnection()
    if (!isConnected) {
      throw new Error('ComfyUI is not available')
    }

    // Check if this is a FLUX or SDXL model request
    const isFluxModel = config.checkpoint && config.checkpoint.toLowerCase().includes('flux')
    const isSDXLModel = config.checkpoint && (
      config.checkpoint.toLowerCase().includes('sdxl') || 
      config.checkpoint.toLowerCase().includes('sd_xl')
    )
    
    if (isFluxModel || isSDXLModel) {
      // FLUX and SDXL not available - use regular SD 1.5 workflow with enhanced prompts
      console.log('FLUX/SDXL requested but not available - using enhanced SD 1.5 workflow')
      config.checkpoint = 'v1-5-pruned-emaonly.safetensors'
      // Continue with normal workflow below
    }

    // Upload the image first
    const uploadedImageName = await this.uploadImage(imageBase64)
    console.log(`Image uploaded as: ${uploadedImageName}`)

    // Validate models and fallback if needed
    const models = await this.getModels()
    const validatedConfig = await this.validateAndFallbackConfig(config, models)
    
    // Create workflow with validated config
    // TEMPORARILY DISABLE ControlNet to fix oil painting conversion
    const useControlNet = false // Disabled until we fix the workflow output issue
    
    console.log('Creating workflow with config (ControlNet disabled for now):', {
      checkpoint: validatedConfig.checkpoint,
      controlnet_model: validatedConfig.controlnet_model,
      useControlNet
    })
    
    const workflow = this.createOilPaintingWorkflow(uploadedImageName, validatedConfig, useControlNet)
    
    // Queue the prompt
    const promptId = await this.queuePrompt(workflow)
    
    // Wait for completion and get result with generous timeout for model loading
    return await this.waitForCompletion(promptId, 480000) // 8 minutes timeout
  }

  private async validateAndFallbackConfig(
    config: ComfyUIStyleConfig, 
    models: { checkpoints: string[], loras: string[], controlnets: string[] }
  ): Promise<ComfyUIStyleConfig> {
    const fallbackConfig = { ...config }
    let validationWarnings: string[] = []
    
    // Check checkpoint availability
    if (!models.checkpoints.includes(config.checkpoint)) {
      if (models.checkpoints.length > 0) {
        const originalCheckpoint = config.checkpoint
        fallbackConfig.checkpoint = models.checkpoints[0]
        validationWarnings.push(`Checkpoint ${originalCheckpoint} not found, using ${models.checkpoints[0]}`)
        
        // If switching to SDXL, adjust parameters for better results
        if (models.checkpoints[0].includes('xl')) {
          fallbackConfig.steps = Math.max(25, config.steps)
          fallbackConfig.cfg = Math.min(7.5, config.cfg)
          
          // Enhance oil painting prompts for SDXL
          if (!fallbackConfig.positive_prompt.includes('oil painting')) {
            fallbackConfig.positive_prompt = `oil painting style, ${fallbackConfig.positive_prompt}`
          }
          if (!fallbackConfig.positive_prompt.includes('brushstrokes')) {
            fallbackConfig.positive_prompt += ', visible brushstrokes, painterly texture'
          }
          
          validationWarnings.push(`Adjusted parameters for SDXL: steps=${fallbackConfig.steps}, cfg=${fallbackConfig.cfg}`)
        }
        
        // If switching from SDXL to SD 1.5, adjust parameters
        if (originalCheckpoint.includes('xl') && !models.checkpoints[0].includes('xl')) {
          fallbackConfig.steps = Math.max(20, Math.min(config.steps, 50))
          fallbackConfig.cfg = Math.max(6.0, Math.min(config.cfg, 12.0))
          validationWarnings.push(`Adjusted parameters for SD 1.5: steps=${fallbackConfig.steps}, cfg=${fallbackConfig.cfg}`)
        }
      } else {
        throw new Error('No checkpoints available in ComfyUI')
      }
    }
    
    // Import oil painting utilities for intelligent model detection
    const { findOilPaintingLoRA, selectControlNetModel, oilPaintingStyles } = await import('./comfyui-oil-painting-utils')
    
    // Check LoRA availability and suggest alternatives
    if (config.lora_name && !models.loras.includes(config.lora_name)) {
      validationWarnings.push(`LoRA ${config.lora_name} not found, searching for alternatives`)
      
      // Use intelligent LoRA detection from utils
      const alternativeLoRA = findOilPaintingLoRA(models.loras)
      
      if (alternativeLoRA) {
        fallbackConfig.lora_name = alternativeLoRA
        fallbackConfig.lora_strength = config.lora_strength || 0.8
        fallbackConfig.lora_clip_strength = config.lora_clip_strength || config.lora_strength || 0.8
        validationWarnings.push(`Using alternative LoRA: ${alternativeLoRA}`)
      } else {
        fallbackConfig.lora_name = undefined
        fallbackConfig.lora_strength = undefined
        fallbackConfig.lora_clip_strength = undefined
        // Enhance prompt to compensate for missing LoRA
        fallbackConfig.positive_prompt = this.enhancePromptForOilPainting(
          fallbackConfig.positive_prompt, 
          config.style_intensity || 0.8
        )
        validationWarnings.push(`No oil painting LoRAs found, enhanced prompt to compensate`)
      }
    } else if (!config.lora_name && models.loras.length > 0) {
      // Auto-detect oil painting LoRA if not specified
      const detectedLoRA = findOilPaintingLoRA(models.loras)
      if (detectedLoRA) {
        fallbackConfig.lora_name = detectedLoRA
        fallbackConfig.lora_strength = 0.8
        fallbackConfig.lora_clip_strength = 0.8
        validationWarnings.push(`Auto-detected oil painting LoRA: ${detectedLoRA}`)
      }
    }
    
    // Check ControlNet availability with better fallbacks
    if (config.controlnet_model && !models.controlnets.includes(config.controlnet_model)) {
      const originalControlNet = config.controlnet_model
      
      // Priority order for ControlNet alternatives
      const controlNetPriorities = [
        // SD 1.5 models
        'control_v11p_sd15_canny.pth',
        'control_v11f1p_sd15_depth.pth', 
        'control_v11p_sd15_depth.pth',
        'control_v11p_sd15_openpose.pth',
        // LoRA-based models (what we actually have)
        'control-lora-canny-rank256.safetensors',
        'control-lora-depth-rank256.safetensors',
        // Any canny or depth model
        ...models.controlnets.filter(cn => cn.includes('canny')),
        ...models.controlnets.filter(cn => cn.includes('depth')),
        // Any other ControlNet as last resort
        ...models.controlnets
      ]
      
      const compatibleControlNet = controlNetPriorities.find(cn => models.controlnets.includes(cn))
      
      if (compatibleControlNet) {
        fallbackConfig.controlnet_model = compatibleControlNet
        validationWarnings.push(`ControlNet ${originalControlNet} not found, using ${compatibleControlNet}`)
        
        // Adjust preprocessor and strength for different ControlNet types
        if (compatibleControlNet.includes('canny')) {
          fallbackConfig.preprocessor = 'CannyEdgePreprocessor'
          // LoRA-based ControlNets may need different strength
          if (compatibleControlNet.includes('lora')) {
            fallbackConfig.controlnet_strength = Math.min((config.controlnet_strength || 0.7) * 1.2, 1.0)
            validationWarnings.push(`Adjusted strength for LoRA-based ControlNet: ${fallbackConfig.controlnet_strength}`)
          }
        } else if (compatibleControlNet.includes('depth')) {
          fallbackConfig.preprocessor = 'DepthAnythingV2Preprocessor'
          if (compatibleControlNet.includes('lora')) {
            fallbackConfig.controlnet_strength = Math.min((config.controlnet_strength || 0.7) * 1.1, 0.9)
            validationWarnings.push(`Adjusted strength for LoRA-based depth ControlNet: ${fallbackConfig.controlnet_strength}`)
          }
        } else if (compatibleControlNet.includes('openpose')) {
          fallbackConfig.preprocessor = 'OpenposePreprocessor'
          fallbackConfig.controlnet_strength = Math.max((config.controlnet_strength || 0.7) * 0.8, 0.5)
        }
      } else {
        validationWarnings.push(`No compatible ControlNet found, proceeding without ControlNet`)
        fallbackConfig.controlnet_model = undefined
        fallbackConfig.controlnet_strength = undefined
        fallbackConfig.preprocessor = undefined
        
        // Increase denoising slightly when no ControlNet to allow more variation
        fallbackConfig.denoise = Math.min((config.denoise || 0.7) * 1.1, 0.85)
        validationWarnings.push(`Increased denoising to ${fallbackConfig.denoise} to compensate for missing ControlNet`)
      }
    }
    
    // Log all validation changes
    if (validationWarnings.length > 0) {
      console.log('ComfyUI Model Validation Results:', validationWarnings.join('; '))
    }
    
    return fallbackConfig
  }

  async convertImageWithSDXL(imageBase64: string, config: ComfyUIStyleConfig): Promise<string> {
    // Import SDXL workflow
    const { createSDXLOilPaintingWorkflow } = await import('./comfyui-sdxl-workflow')
    
    // Upload the image first
    const uploadedImageName = await this.uploadImage(imageBase64)
    console.log(`SDXL: Image uploaded as: ${uploadedImageName}`)
    
    // Map style from config to SDXL style
    let sdxlStyle: 'classic' | 'impressionist' | 'vangogh' | 'modern' = 'classic'
    const prompt = (config.prompt || config.positive_prompt || '').toLowerCase()
    
    if (prompt.includes('monet') || prompt.includes('impressionist')) {
      sdxlStyle = 'impressionist'
    } else if (prompt.includes('van gogh') || prompt.includes('vangogh')) {
      sdxlStyle = 'vangogh'
    } else if (prompt.includes('modern') || prompt.includes('contemporary')) {
      sdxlStyle = 'modern'
    }
    
    // Calculate preservation strength based on denoise value
    // Lower denoise = higher preservation
    const preservationStrength = 1.0 - (config.denoise || 0.5)
    
    // Create SDXL workflow
    const workflow = createSDXLOilPaintingWorkflow(
      uploadedImageName,
      sdxlStyle,
      preservationStrength
    )
    
    console.log('SDXL workflow created for style:', sdxlStyle, 'preservation:', preservationStrength)
    
    // Queue the workflow
    const promptId = await this.queuePrompt(workflow as any)
    console.log(`SDXL workflow queued with ID: ${promptId}`)
    
    // Wait for completion
    const resultImage = await this.waitForCompletion(promptId, 480000) // 8 minutes timeout for SDXL (models may be slow to load)
    
    return resultImage
  }

  async convertImageWithFlux(imageBase64: string, config: ComfyUIStyleConfig): Promise<string> {
    // Import new FLUX img2img workflow
    const { createFLUXOilPaintingWorkflow } = await import('./comfyui-flux-img2img')
    
    // Upload the image first
    const uploadedImageName = await this.uploadImage(imageBase64)
    console.log(`FLUX: Image uploaded as: ${uploadedImageName}`)
    
    // Map style from config to FLUX style
    let fluxStyle: 'classic' | 'impressionist' | 'vangogh' | 'modern' = 'classic'
    const prompt = config.positive_prompt.toLowerCase()
    
    if (prompt.includes('monet') || prompt.includes('impressionist')) {
      fluxStyle = 'impressionist'
    } else if (prompt.includes('van gogh') || prompt.includes('vangogh')) {
      fluxStyle = 'vangogh'
    } else if (prompt.includes('modern') || prompt.includes('contemporary')) {
      fluxStyle = 'modern'
    }
    
    // Calculate preservation strength based on denoise value
    // Lower denoise = higher preservation
    const preservationStrength = 1.0 - (config.denoise || 0.5)
    
    // Create FLUX workflow
    const workflow = createFLUXOilPaintingWorkflow(
      uploadedImageName,
      fluxStyle,
      preservationStrength
    )
    
    console.log('FLUX workflow created for style:', fluxStyle, 'preservation:', preservationStrength)
    
    // Queue the workflow
    const promptId = await this.queuePrompt(workflow as any)
    console.log(`FLUX workflow queued with ID: ${promptId}`)
    
    // Wait for completion (FLUX may take longer)
    const resultImage = await this.waitForCompletion(promptId, 600000) // 10 minutes timeout for FLUX (larger model, needs more time)
    
    return resultImage
  }
}

export const comfyUIClient = new ComfyUIClient()