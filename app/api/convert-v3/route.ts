import { NextRequest, NextResponse } from 'next/server'
import { getStyleById } from '../../lib/oilPaintingStyles'

// Two-stage processing for better quality
interface ProcessingStage {
  denoising_strength: number
  cfg_scale: number
  steps: number
  controlnet_weight: number
  prompt_modifier?: string
}

const TWO_STAGE_CONFIG: Record<string, { stage1: ProcessingStage; stage2: ProcessingStage }> = {
  classic_portrait: {
    stage1: {
      denoising_strength: 0.40,
      cfg_scale: 8.0,
      steps: 30,
      controlnet_weight: 0.80,
      prompt_modifier: 'subtle oil painting effect, preserve subject completely'
    },
    stage2: {
      denoising_strength: 0.25,
      cfg_scale: 7.0,
      steps: 20,
      controlnet_weight: 0.60,
      prompt_modifier: 'enhance oil painting texture, maintain identity'
    }
  },
  thick_textured: {
    stage1: {
      denoising_strength: 0.42,
      cfg_scale: 7.5,
      steps: 35,
      controlnet_weight: 0.75,
      prompt_modifier: 'initial Van Gogh style, keep subject intact'
    },
    stage2: {
      denoising_strength: 0.28,
      cfg_scale: 6.5,
      steps: 25,
      controlnet_weight: 0.55,
      prompt_modifier: 'enhance thick paint texture, preserve features'
    }
  },
  soft_impressionist: {
    stage1: {
      denoising_strength: 0.38,
      cfg_scale: 7.0,
      steps: 30,
      controlnet_weight: 0.75,
      prompt_modifier: 'soft impressionist touch, subject unchanged'
    },
    stage2: {
      denoising_strength: 0.22,
      cfg_scale: 6.0,
      steps: 20,
      controlnet_weight: 0.50,
      prompt_modifier: 'refine impressionist effects, maintain recognition'
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const image = formData.get('image') as File
    const styleId = formData.get('style') as string
    const useTwoStage = formData.get('twoStage') !== 'false' // Default to true

    if (!image || !styleId) {
      return NextResponse.json({ error: 'Missing image or style' }, { status: 400 })
    }

    const style = getStyleById(styleId)
    if (!style) {
      return NextResponse.json({ error: 'Invalid style' }, { status: 400 })
    }

    // Convert image to base64
    const bytes = await image.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const base64Image = buffer.toString('base64')

    // Check if ControlNet is available
    let hasControlNet = false
    try {
      const cnResponse = await fetch('http://localhost:7860/controlnet/model_list')
      if (cnResponse.ok) {
        const cnData = await cnResponse.json()
        hasControlNet = cnData.model_list && cnData.model_list.length > 0
      }
    } catch (e) {
      console.log('ControlNet not available')
    }

    // Process image (either single or two-stage)
    let resultImage = base64Image
    
    if (useTwoStage && TWO_STAGE_CONFIG[styleId]) {
      console.log(`Using two-stage processing for ${styleId}`)
      const config = TWO_STAGE_CONFIG[styleId]
      
      // Stage 1: Initial conversion with strong preservation
      resultImage = await processStage(
        base64Image,
        style,
        config.stage1,
        hasControlNet,
        'stage1'
      )
      
      // Stage 2: Enhance oil painting effects on stage 1 output
      if (resultImage) {
        resultImage = await processStage(
          resultImage,
          style,
          config.stage2,
          hasControlNet,
          'stage2'
        )
      }
    } else {
      // Single stage processing (fallback)
      const singleStageConfig: ProcessingStage = {
        denoising_strength: style.denoising_strength,
        cfg_scale: style.cfg_scale,
        steps: style.steps,
        controlnet_weight: hasControlNet ? 0.70 : 0
      }
      
      resultImage = await processStage(
        base64Image,
        style,
        singleStageConfig,
        hasControlNet,
        'single'
      )
    }

    if (!resultImage) {
      return NextResponse.json({ error: 'Conversion failed' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      image: `data:image/png;base64,${resultImage}`,
      styleUsed: styleId,
      processingType: useTwoStage ? 'two-stage' : 'single-stage'
    })

  } catch (error) {
    console.error('Error in convert-v3:', error)
    return NextResponse.json(
      { error: 'Conversion failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

async function processStage(
  inputImage: string,
  style: any,
  config: ProcessingStage,
  hasControlNet: boolean,
  stageName: string
): Promise<string | null> {
  try {
    // Build the prompt with stage-specific modifier
    const fullPrompt = config.prompt_modifier 
      ? `${style.positive_prompt}, ${config.prompt_modifier}`
      : style.positive_prompt

    const payload: any = {
      init_images: [inputImage],
      prompt: fullPrompt,
      negative_prompt: style.negative_prompt,
      denoising_strength: config.denoising_strength,
      cfg_scale: config.cfg_scale,
      sampler_name: style.sampler,
      steps: config.steps,
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

    // Add ControlNet if available
    if (hasControlNet && config.controlnet_weight > 0) {
      payload.alwayson_scripts.controlnet = {
        args: [
          {
            image: inputImage,
            module: "canny",
            model: "control_v11p_sd15_canny",
            weight: config.controlnet_weight,
            resize_mode: "Crop and Resize",
            lowvram: false,
            processor_res: 512,
            threshold_a: 100,
            threshold_b: 200,
            guidance_start: 0.0,
            guidance_end: 1.0,
            control_mode: "Balanced",
            pixel_perfect: false
          }
        ]
      }
    }

    console.log(`Processing ${stageName} with denoising: ${config.denoising_strength}, cfg: ${config.cfg_scale}`)

    const response = await fetch('http://localhost:7860/sdapi/v1/img2img', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      console.error(`Stage ${stageName} failed:`, response.status)
      return null
    }

    const data = await response.json()
    
    if (data.images && data.images.length > 0) {
      console.log(`Stage ${stageName} completed successfully`)
      return data.images[0]
    }
    
    return null
  } catch (error) {
    console.error(`Error in stage ${stageName}:`, error)
    return null
  }
}