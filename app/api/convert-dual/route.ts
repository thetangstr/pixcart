import { NextRequest, NextResponse } from 'next/server'
import { getStyleById } from '../../lib/oilPaintingStyles'
import { getComfyUIStyleById } from '../../lib/comfyui-styles'
import { comfyUIClient } from '../../lib/comfyui-client'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const image = formData.get('image') as File
    const styleId = formData.get('style') as string
    const backend = formData.get('backend') as string || 'a1111'
    const compareMode = formData.get('compareMode') === 'true'

    if (!image || !styleId) {
      return NextResponse.json({ error: 'Missing image or style' }, { status: 400 })
    }

    if (!['a1111', 'comfyui'].includes(backend)) {
      return NextResponse.json({ error: 'Invalid backend' }, { status: 400 })
    }

    // Convert image to base64
    const bytes = await image.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const base64Image = buffer.toString('base64')

    if (compareMode) {
      // Process with both backends for comparison
      const [a1111Result, comfyResult] = await Promise.allSettled([
        processWithA1111(base64Image, styleId),
        processWithComfyUI(base64Image, styleId)
      ])

      return NextResponse.json({
        success: true,
        compareMode: true,
        results: {
          a1111: {
            success: a1111Result.status === 'fulfilled',
            image: a1111Result.status === 'fulfilled' ? a1111Result.value : null,
            error: a1111Result.status === 'rejected' ? a1111Result.reason.message : null
          },
          comfyui: {
            success: comfyResult.status === 'fulfilled',
            image: comfyResult.status === 'fulfilled' ? comfyResult.value : null,
            error: comfyResult.status === 'rejected' ? comfyResult.reason.message : null
          }
        }
      })
    } else {
      // Process with selected backend only
      let resultImage: string
      
      if (backend === 'comfyui') {
        resultImage = await processWithComfyUI(base64Image, styleId)
      } else {
        resultImage = await processWithA1111(base64Image, styleId)
      }

      return NextResponse.json({
        success: true,
        image: resultImage,
        backend: backend,
        compareMode: false
      })
    }

  } catch (error) {
    console.error('Dual conversion error:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Conversion failed'
    }, { status: 500 })
  }
}

async function processWithA1111(base64Image: string, styleId: string): Promise<string> {
  const style = getStyleById(styleId)
  if (!style) {
    throw new Error(`A1111 style not found: ${styleId}`)
  }

  // Check if A1111 is available
  const a1111Url = process.env.A1111_BASE_URL || 'http://localhost:7860'
  
  // Check if ControlNet is available
  let hasControlNet = false
  try {
    const cnResponse = await fetch(`${a1111Url}/controlnet/model_list`, {
      signal: AbortSignal.timeout(5000)
    })
    if (cnResponse.ok) {
      const cnData = await cnResponse.json()
      hasControlNet = cnData.model_list && cnData.model_list.length > 0
    }
  } catch (e) {
    console.log('A1111 ControlNet not available')
  }

  const payload = {
    init_images: [`data:image/png;base64,${base64Image}`],
    prompt: style.prompt,
    negative_prompt: style.negative_prompt,
    steps: style.steps,
    cfg_scale: style.cfg_scale,
    denoising_strength: style.denoising_strength,
    width: 512,
    height: 512,
    sampler_name: style.sampler_name || 'Euler a',
    alwayson_scripts: hasControlNet ? {
      controlnet: {
        args: [{
          enabled: true,
          module: 'canny',
          model: 'control_canny',
          weight: 0.7,
          guidance_start: 0.0,
          guidance_end: 1.0,
          control_mode: 0,
          resize_mode: 1,
          lowvram: false,
          processor_res: 512,
          threshold_a: 100,
          threshold_b: 200,
          save_detected_map: false,
          input_image: `data:image/png;base64,${base64Image}`
        }]
      }
    } : {}
  }

  const response = await fetch(`${a1111Url}/sdapi/v1/img2img`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload)
  })

  if (!response.ok) {
    throw new Error(`A1111 API error: ${response.status} ${response.statusText}`)
  }

  const result = await response.json()
  
  if (!result.images || result.images.length === 0) {
    throw new Error('A1111 returned no images')
  }

  return `data:image/png;base64,${result.images[0]}`
}

async function processWithComfyUI(base64Image: string, styleId: string): Promise<string> {
  const config = getComfyUIStyleById(styleId)
  if (!config) {
    throw new Error(`ComfyUI style not found: ${styleId}`)
  }

  return await comfyUIClient.convertImage(base64Image, config)
}