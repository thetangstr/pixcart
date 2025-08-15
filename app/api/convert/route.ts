import { NextRequest, NextResponse } from 'next/server'
import { getStyleById, getDefaultStyle } from '../../lib/oilPaintingStyles'

// A1111 API configuration
// Use environment variable for production, fallback to localhost for development
const A1111_BASE_URL = process.env.A1111_BASE_URL || 'http://localhost:7860'

interface Txt2ImgRequest {
  prompt: string
  negative_prompt?: string
  width?: number
  height?: number
  steps?: number
  cfg_scale?: number
  sampler_name?: string
  seed?: number
  batch_size?: number
  n_iter?: number
  restore_faces?: boolean
  tiling?: boolean
  do_not_save_samples?: boolean
  do_not_save_grid?: boolean
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
  batch_size?: number
  n_iter?: number
  restore_faces?: boolean
  tiling?: boolean
  do_not_save_samples?: boolean
  do_not_save_grid?: boolean
}

// Convert image to base64
async function imageToBase64(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  return buffer.toString('base64')
}

// Check if A1111 is available
async function checkA1111Status(): Promise<boolean> {
  try {
    const response = await fetch(`${A1111_BASE_URL}/sdapi/v1/options`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    })
    return response.ok
  } catch (error) {
    console.error('A1111 connection error:', error)
    return false
  }
}

// Convert image using A1111 img2img API with style-specific parameters
async function convertWithA1111(base64Image: string, styleId?: string, customParams?: any): Promise<string> {
  // Get the selected style or use default
  const style = styleId ? getStyleById(styleId) : getDefaultStyle()
  if (!style) {
    throw new Error(`Invalid style ID: ${styleId}`)
  }

  console.log(`Using style: ${style.name} (${style.id})`)

  // Use custom parameters if provided, otherwise use style defaults
  const cfg_scale = customParams?.cfg_scale ? parseFloat(customParams.cfg_scale) : style.cfg_scale
  const denoising_strength = customParams?.denoising_strength ? parseFloat(customParams.denoising_strength) : style.denoising_strength
  const steps = customParams?.steps ? parseInt(customParams.steps) : style.steps

  const img2imgPayload: Img2ImgRequest = {
    init_images: [base64Image],
    prompt: style.positive_prompt,
    negative_prompt: style.negative_prompt,
    width: 768,
    height: 768,
    steps: steps,
    cfg_scale: cfg_scale,
    denoising_strength: denoising_strength,
    sampler_name: style.sampler,
    seed: -1,
    batch_size: 1,
    n_iter: 1,
    restore_faces: true,
    tiling: false,
    do_not_save_samples: true,
    do_not_save_grid: true,
  }

  console.log(`Conversion parameters: steps=${steps}, cfg=${cfg_scale}, denoising=${denoising_strength}`)

  const response = await fetch(`${A1111_BASE_URL}/sdapi/v1/img2img`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(img2imgPayload),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`A1111 API error: ${response.status} - ${errorText}`)
  }

  const result = await response.json()
  
  if (!result.images || result.images.length === 0) {
    throw new Error('No images returned from A1111 API')
  }

  return result.images[0] // Return base64 encoded result
}

export async function POST(request: NextRequest) {
  try {
    // Parse form data
    const formData = await request.formData()
    const imageFile = formData.get('image') as File
    const styleId = formData.get('style') as string | null
    const customParams = {
      cfg_scale: formData.get('cfg_scale') as string | null,
      denoising_strength: formData.get('denoising_strength') as string | null,
      steps: formData.get('steps') as string | null
    }

    if (!imageFile) {
      return NextResponse.json(
        { error: 'No image file provided' },
        { status: 400 }
      )
    }

    // Validate file type
    if (!imageFile.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'Invalid file type. Please upload an image.' },
        { status: 400 }
      )
    }

    // Validate file size (max 10MB)
    if (imageFile.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File size too large. Maximum 10MB allowed.' },
        { status: 400 }
      )
    }

    console.log('Processing image:', imageFile.name, 'Size:', imageFile.size, 'Style:', styleId || 'default')

    // Check if A1111 is available
    const isA1111Available = await checkA1111Status()
    console.log('A1111 available:', isA1111Available)

    let resultImageBase64: string

    if (isA1111Available) {
      try {
        // Convert image to base64 for A1111
        const base64Image = await imageToBase64(imageFile)
        console.log('Converting with A1111...')
        
        // Convert using A1111 with style parameters
        resultImageBase64 = await convertWithA1111(base64Image, styleId || undefined, customParams)
        console.log('A1111 conversion successful with style:', styleId || 'default')
      } catch (a1111Error) {
        console.error('A1111 conversion failed:', a1111Error)
        return NextResponse.json({
          error: 'Conversion failed',
          message: 'The AI conversion service encountered an error. Please try again.',
          details: a1111Error instanceof Error ? a1111Error.message : 'Unknown error'
        }, { status: 503 })
      }
    } else {
      console.log('A1111 not available')
      return NextResponse.json({
        error: 'Service unavailable',
        message: 'The AI conversion service is not running. Please ensure Automatic1111 is started with API enabled.',
        troubleshooting: 'Run: ./webui.sh --api --listen --cors-allow-origins="http://localhost:3000"'
      }, { status: 503 })
    }

    // Convert base64 back to blob for response
    const binaryString = atob(resultImageBase64)
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }

    // Return the converted image
    return new NextResponse(bytes, {
      status: 200,
      headers: {
        'Content-Type': 'image/jpeg',
        'Content-Disposition': `attachment; filename="oil-painting-${Date.now()}.jpg"`,
        'Cache-Control': 'no-cache',
      },
    })

  } catch (error) {
    console.error('Conversion error:', error)
    return NextResponse.json(
      { 
        error: 'Image conversion failed', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}