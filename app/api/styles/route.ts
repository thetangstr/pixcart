import { NextResponse } from 'next/server'
import { comfyUIClient } from '@/app/lib/comfyui-client'
import { getAllComfyUIStyles, getAvailableStyles } from '@/app/lib/comfyui-styles'
import { sdxlComfyUIStyles } from '@/app/lib/comfyui-styles-sdxl'
import { oilPaintingStyles, createOptimizedStyleConfig } from '@/app/lib/comfyui-oil-painting-utils'

/**
 * GET /api/styles
 * Returns available oil painting styles based on what models are available in ComfyUI
 */
export async function GET() {
  try {
    // Check ComfyUI connection
    const isConnected = await comfyUIClient.checkConnection()
    if (!isConnected) {
      return NextResponse.json(
        { error: 'ComfyUI is not available' },
        { status: 503 }
      )
    }

    // Get available models from ComfyUI
    const models = await comfyUIClient.getModels()
    
    // Get all configured styles
    const allStyles = getAllComfyUIStyles()
    
    // Filter to only styles that can work with available models
    const availableConfiguredStyles = getAvailableStyles(models)
    
    // Generate optimized styles based on available resources
    const optimizedStyles = Object.entries(oilPaintingStyles).map(([id, style]) => {
      // Use first available checkpoint
      const checkpoint = models.checkpoints[0] || 'sd_xl_base_1.0_0.9vae.safetensors'
      
      // Create optimized config for each style
      const config = createOptimizedStyleConfig(
        id as keyof typeof oilPaintingStyles,
        checkpoint,
        models.loras,
        models.controlnets,
        'portrait'  // Default to portrait
      )
      
      return {
        id,
        name: style.name,
        description: style.description,
        config,
        recommended: true,
        denoisingRange: style.denoisingRange,
        intensity: style.intensity
      }
    })
    
    // Combine SDXL styles with their availability status
    const sdxlStylesWithStatus = Object.entries(sdxlComfyUIStyles).map(([id, config]) => {
      const hasCheckpoint = models.checkpoints.includes(config.checkpoint)
      const hasLoRA = !config.lora_name || models.loras.includes(config.lora_name)
      const hasControlNet = !config.controlnet_model || models.controlnets.includes(config.controlnet_model)
      
      return {
        id,
        name: id.replace(/_/g, ' ').replace(/sdxl/g, 'SDXL').replace(/\b\w/g, l => l.toUpperCase()),
        config,
        available: hasCheckpoint,
        missingModels: {
          checkpoint: hasCheckpoint ? null : config.checkpoint,
          lora: hasLoRA ? null : config.lora_name,
          controlnet: hasControlNet ? null : config.controlnet_model
        }
      }
    })
    
    return NextResponse.json({
      models: {
        checkpoints: models.checkpoints.length,
        loras: models.loras.length,
        controlnets: models.controlnets.length,
        availableModels: models
      },
      styles: {
        optimized: optimizedStyles,
        configured: availableConfiguredStyles.map(({ id, config }) => ({
          id,
          name: id.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          config
        })),
        sdxl: sdxlStylesWithStatus,
        totalAvailable: optimizedStyles.length + availableConfiguredStyles.length
      },
      recommendations: {
        portraits: ['classical', 'portrait_master', 'baroque'],
        landscapes: ['romantic', 'impressionist'],
        expressive: ['expressionist', 'abstract_expressionist'],
        defaultStyle: optimizedStyles[0]?.id || 'classical'
      }
    })
  } catch (error) {
    console.error('Error fetching styles:', error)
    return NextResponse.json(
      { error: 'Failed to fetch styles' },
      { status: 500 }
    )
  }
}