import { NextRequest, NextResponse } from 'next/server'
import { 
  getEnhancedStyleById, 
  buildPrompt, 
  buildNegativePrompt,
  type EnhancedOilPaintingStyle,
  type PassConfig,
  type ControlNetConfig
} from '../../lib/oilPaintingStylesEnhanced'

// Smart multi-pass processing with multi-ControlNet support
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const image = formData.get('image') as File
    const styleId = formData.get('style') as string
    const useMultiPass = formData.get('multiPass') !== 'false' // Default to true
    const useMultiControlNet = formData.get('multiControlNet') !== 'false' // Default to true
    const isAnimalSubject = formData.get('isAnimal') === 'true' // New flag for animal subjects
    const controlnetOverrides = formData.get('controlnetOverrides') ? 
      JSON.parse(formData.get('controlnetOverrides') as string) : null

    if (!image || !styleId) {
      return NextResponse.json({ error: 'Missing image or style' }, { status: 400 })
    }

    const style = getEnhancedStyleById(styleId)
    if (!style) {
      return NextResponse.json({ error: 'Invalid style' }, { status: 400 })
    }

    // Convert image to base64
    const bytes = await image.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const base64Image = buffer.toString('base64')

    // Get available ControlNet models
    const availableControlNets = await getAvailableControlNets()
    console.log('Available ControlNet models:', availableControlNets)

    // Determine which ControlNets to use based on availability
    // ControlNet models come with hash suffix, so we need to check the prefix
    let activeControlNets = style.controlnets.filter(cn => 
      availableControlNets.some(available => available.startsWith(cn.model))
    )

    // Adjust ControlNet weights for animal subjects
    if (isAnimalSubject || controlnetOverrides) {
      console.log('🐾 Adjusting settings for animal subject')
      activeControlNets = activeControlNets.map(cn => {
        const adjusted = { ...cn }
        
        // Apply animal-specific adjustments
        if (isAnimalSubject) {
          if (cn.model.includes('openpose')) {
            adjusted.weight = 0.10 // Minimal OpenPose for animals
            console.log('  - Reduced OpenPose weight to 0.10 for animal')
          } else if (cn.model.includes('canny')) {
            adjusted.weight = 0.95 // Strong edge preservation
            console.log('  - Increased Canny weight to 0.95 for animal features')
          } else if (cn.model.includes('depth')) {
            adjusted.weight = 0.40 // Moderate depth
          }
        }
        
        // Apply manual overrides if provided
        if (controlnetOverrides && controlnetOverrides[cn.model.split('_')[2]]) {
          adjusted.weight = controlnetOverrides[cn.model.split('_')[2]]
          console.log(`  - Manual override: ${cn.model} weight = ${adjusted.weight}`)
        }
        
        return adjusted
      })
    }

    if (activeControlNets.length === 0) {
      console.warn('No ControlNet models available, proceeding without ControlNet')
    }

    // Process image with multi-pass system
    let resultImage = base64Image
    const passResults: any[] = []

    if (useMultiPass && style.passes) {
      // Execute each pass in sequence
      const passes = [
        style.passes.initial,
        style.passes.refinement,
        style.passes.detail
      ].filter(Boolean) as PassConfig[]

      for (const [index, pass] of passes.entries()) {
        console.log(`\nExecuting pass ${index + 1}/${passes.length}: ${pass.name}`)
        
        const passResult = await processWithMultiControlNet(
          resultImage,
          style,
          pass,
          useMultiControlNet ? activeControlNets : activeControlNets.slice(0, 1), // Use only Canny if multi disabled
          `${pass.name} (${index + 1}/${passes.length})`,
          availableControlNets,
          isAnimalSubject
        )

        if (!passResult.image) {
          console.error(`Pass ${pass.name} failed`)
          break
        }

        resultImage = passResult.image
        passResults.push({
          pass: pass.name,
          success: true,
          controlnetsUsed: passResult.controlnetsUsed,
          parameters: passResult.parameters
        })

        // Optional: Save intermediate results for debugging
        if (process.env.NODE_ENV === 'development') {
          console.log(`Pass ${pass.name} completed with settings:`, passResult.parameters)
        }
      }
    } else {
      // Single pass fallback
      console.log('Using single-pass processing')
      const singlePass: PassConfig = {
        name: 'Single Pass',
        description: 'Single conversion pass',
        denoising_strength: 0.45,
        cfg_scale: 6.5,
        steps: 40
      }

      const passResult = await processWithMultiControlNet(
        resultImage,
        style,
        singlePass,
        activeControlNets.slice(0, 1), // Just use Canny for single pass
        'Single Pass',
        availableControlNets,
        isAnimalSubject
      )

      if (passResult.image) {
        resultImage = passResult.image
        passResults.push({
          pass: 'single',
          success: true,
          controlnetsUsed: passResult.controlnetsUsed,
          parameters: passResult.parameters
        })
      }
    }

    if (!resultImage || resultImage === base64Image) {
      return NextResponse.json({ error: 'Conversion failed' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      image: `data:image/png;base64,${resultImage}`,
      styleUsed: styleId,
      processingType: useMultiPass ? 'multi-pass' : 'single-pass',
      passResults,
      controlNetsUsed: activeControlNets.map(cn => cn.model),
      totalControlNets: activeControlNets.length
    })

  } catch (error) {
    console.error('Error in convert-enhanced:', error)
    return NextResponse.json(
      { error: 'Conversion failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// Process with multiple ControlNets
async function processWithMultiControlNet(
  inputImage: string,
  style: EnhancedOilPaintingStyle,
  pass: PassConfig,
  controlnets: ControlNetConfig[],
  passDescription: string,
  availableModels?: string[],
  isAnimalSubject?: boolean
): Promise<{ image: string | null, controlnetsUsed: string[], parameters: any }> {
  try {
    // Build the complete prompt for this pass
    let fullPrompt = buildPrompt(style, pass.name)
    let negativePrompt = buildNegativePrompt(style)
    
    // Enhance prompts for animal subjects
    if (isAnimalSubject) {
      fullPrompt = fullPrompt.replace(
        'PRESERVE subject identity completely',
        'PRESERVE exact animal identity, maintain EXACT fur color and patterns, NO species change, authentic animal anatomy'
      )
      negativePrompt += ', human face, human features, anthropomorphic, cartoon animal, different species, wrong animal, humanized features'
      console.log('🐾 Applied animal-specific prompt enhancements')
    }

    // Base payload
    const payload: any = {
      init_images: [inputImage],
      prompt: fullPrompt,
      negative_prompt: negativePrompt,
      denoising_strength: pass.denoising_strength,
      cfg_scale: pass.cfg_scale,
      sampler_name: style.sampler,
      steps: pass.steps,
      width: 512,
      height: 512,
      seed: -1,
      subseed: -1,
      subseed_strength: 0,
      seed_resize_from_h: -1,
      seed_resize_from_w: -1,
      batch_size: 1,
      n_iter: 1,
      restore_faces: false,
      tiling: false,
      do_not_save_samples: false,
      do_not_save_grid: false,
      eta: 0,
      s_min_uncond: 0,
      s_churn: 0,
      s_tmax: 0,
      s_tmin: 0,
      s_noise: 1,
      override_settings: {},
      override_settings_restore_afterwards: true,
      script_args: [],
      send_images: true,
      save_images: false,
      alwayson_scripts: {}
    }

    // Add VAE if specified
    if (style.vae) {
      payload.override_settings.sd_vae = style.vae
    }

    // Configure multi-ControlNet
    if (controlnets.length > 0) {
      const controlnetArgs = controlnets.map(cn => {
        // Apply pass-specific weight overrides if available
        const weight = pass.controlnetWeightOverrides?.[cn.model] || cn.weight
        
        // Find the full model name with hash from available models
        const fullModelName = availableModels?.find(m => m.startsWith(cn.model)) || cn.model

        return {
          image: inputImage,
          module: cn.module,
          model: fullModelName,
          weight: weight,
          resize_mode: "Crop and Resize",
          lowvram: false,
          processor_res: cn.processorRes || 512,
          threshold_a: cn.thresholdA || 100,
          threshold_b: cn.thresholdB || 200,
          guidance_start: cn.guidanceStart,
          guidance_end: cn.guidanceEnd,
          control_mode: cn.controlMode || "Balanced",
          pixel_perfect: false
        }
      })

      payload.alwayson_scripts.controlnet = {
        args: controlnetArgs
      }

      console.log(`${passDescription}: Using ${controlnets.length} ControlNets:`, 
        controlnets.map(cn => `${cn.model} (weight: ${pass.controlnetWeightOverrides?.[cn.model] || cn.weight})`).join(', ')
      )
    }

    // Add LoRA to prompt if available
    if (style.loras && style.loras.length > 0) {
      const loraPrompts = style.loras.map(lora => `<lora:${lora.name}:${lora.weight}>`).join(' ')
      payload.prompt = `${payload.prompt}, ${loraPrompts}`
      console.log(`Added LoRAs to prompt: ${loraPrompts}`)
    }

    console.log(`${passDescription}: Processing with denoising: ${pass.denoising_strength}, cfg: ${pass.cfg_scale}, steps: ${pass.steps}`)

    const response = await fetch('http://localhost:7860/sdapi/v1/img2img', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`${passDescription} failed:`, response.status, errorText)
      return { 
        image: null, 
        controlnetsUsed: [], 
        parameters: { error: errorText } 
      }
    }

    const data = await response.json()
    
    if (data.images && data.images.length > 0) {
      console.log(`${passDescription} completed successfully`)
      return { 
        image: data.images[0], 
        controlnetsUsed: controlnets.map(cn => cn.model),
        parameters: {
          denoising: pass.denoising_strength,
          cfg: pass.cfg_scale,
          steps: pass.steps,
          controlnets: controlnets.length
        }
      }
    }
    
    return { image: null, controlnetsUsed: [], parameters: {} }
  } catch (error) {
    console.error(`Error in ${passDescription}:`, error)
    return { image: null, controlnetsUsed: [], parameters: { error: String(error) } }
  }
}

// Get list of available ControlNet models
async function getAvailableControlNets(): Promise<string[]> {
  try {
    const response = await fetch('http://localhost:7860/controlnet/model_list')
    if (!response.ok) {
      console.error('Failed to get ControlNet models')
      return []
    }
    
    const data = await response.json()
    return data.model_list || []
  } catch (error) {
    console.error('Error fetching ControlNet models:', error)
    return []
  }
}