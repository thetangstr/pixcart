import { NextRequest, NextResponse } from 'next/server'
import { getStyleById, getDefaultStyle } from '../../lib/oilPaintingStyles'

const A1111_BASE_URL = process.env.A1111_BASE_URL || 'http://localhost:7860'

interface ControlNetUnit {
  input_image: string
  module: string
  model: string
  weight?: number
  guidance_start?: number
  guidance_end?: number
  [key: string]: any // Allow additional properties
}

interface Img2ImgRequest {
  init_images: string[]
  prompt: string
  negative_prompt?: string
  width?: number
  height?: number
  steps?: number
  cfg_scale?: number
  denoising_strength?: number
  sampler_name?: string
  seed?: number
  alwayson_scripts?: {
    controlnet?: {
      args: ControlNetUnit[]
    }
  }
}

async function imageToBase64(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  return buffer.toString('base64')
}

async function checkControlNet(): Promise<boolean> {
  try {
    const response = await fetch(`${A1111_BASE_URL}/controlnet/version`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    })
    return response.ok
  } catch {
    return false
  }
}

async function getControlNetModels(): Promise<string[]> {
  try {
    const response = await fetch(`${A1111_BASE_URL}/controlnet/model_list`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    })
    if (response.ok) {
      const data = await response.json()
      return data.model_list || []
    }
  } catch {}
  return []
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const imageFile = formData.get('image') as File
    const styleId = formData.get('style') as string | null

    if (!imageFile) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 })
    }

    const style = styleId ? getStyleById(styleId) : getDefaultStyle()
    if (!style) {
      return NextResponse.json({ error: 'Invalid style' }, { status: 400 })
    }

    console.log(`Converting with style: ${style.name}`)

    const base64Image = await imageToBase64(imageFile)
    
    // Check for ControlNet availability
    const hasControlNet = await checkControlNet()
    const controlNetModels = hasControlNet ? await getControlNetModels() : []
    const hasCannyModel = controlNetModels.some(m => m.includes('canny'))
    
    console.log(`ControlNet available: ${hasControlNet}, Canny model: ${hasCannyModel}`)

    // Build the img2img payload
    const payload: Img2ImgRequest = {
      init_images: [base64Image],
      prompt: style.positive_prompt,
      negative_prompt: style.negative_prompt,
      width: 768,
      height: 768,
      steps: style.steps,
      cfg_scale: style.cfg_scale,
      denoising_strength: style.denoising_strength,
      sampler_name: style.sampler,
      seed: -1,
    }

    // Add ControlNet if available
    if (hasControlNet && hasCannyModel) {
      console.log('Using ControlNet for structure preservation')
      
      // Find the exact Canny model name (includes hash)
      const cannyModel = controlNetModels.find(m => m.includes('canny')) || 'control_v11p_sd15_canny [d14c016b]'
      
      // Different weights for different styles
      let controlWeight = 0.7 // Default for Classic Portrait - balanced
      if (style.id === 'classic_portrait') {
        controlWeight = 0.65 // Lower to allow more painterly effects
      } else if (style.id === 'thick_textured') {
        controlWeight = 0.6 // Even lower for maximum artistic freedom
      } else if (style.id === 'soft_impressionist') {
        controlWeight = 0.65 // Balanced for dreamy effects
      }
      
      payload.alwayson_scripts = {
        controlnet: {
          args: [{
            input_image: base64Image,
            module: 'canny',
            model: cannyModel,
            weight: controlWeight,
            guidance_start: 0.0,
            guidance_end: 1.0,
          }]
        }
      }
    } else {
      console.warn('ControlNet not available - results may vary!')
      // Without ControlNet, reduce denoising to preserve subject
      payload.denoising_strength = Math.min(0.45, style.denoising_strength)
    }

    // Make the API call
    const response = await fetch(`${A1111_BASE_URL}/sdapi/v1/img2img`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('A1111 API error:', errorText)
      return NextResponse.json(
        { error: 'Conversion failed', details: errorText },
        { status: 500 }
      )
    }

    const result = await response.json()
    
    if (!result.images || result.images.length === 0) {
      return NextResponse.json(
        { error: 'No images returned' },
        { status: 500 }
      )
    }

    // Convert base64 to blob
    const binaryString = atob(result.images[0])
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }

    return new NextResponse(bytes, {
      status: 200,
      headers: {
        'Content-Type': 'image/jpeg',
        'Content-Disposition': `attachment; filename="oil-painting-${Date.now()}.jpg"`,
        'X-ControlNet-Used': hasControlNet ? 'true' : 'false',
      },
    })

  } catch (error) {
    console.error('Conversion error:', error)
    return NextResponse.json(
      { error: 'Conversion failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}