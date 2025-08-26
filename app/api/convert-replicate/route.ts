/**
 * Replicate-powered Oil Painting Conversion API
 * Uses FLUX.1 and other models for high-quality conversions
 */

import { NextRequest, NextResponse } from 'next/server'
import { ReplicateClient, OIL_PAINTING_PROMPTS, REPLICATE_MODELS } from '@/app/lib/replicate-client'
import { usageTracker } from '@/app/lib/replicate-usage-tracker'

// Initialize Replicate client
let replicateClient: ReplicateClient | null = null

function getReplicateClient() {
  if (!replicateClient) {
    try {
      replicateClient = new ReplicateClient()
    } catch (error) {
      console.error('Failed to initialize Replicate client:', error)
    }
  }
  return replicateClient
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const image = formData.get('image') as File
    const quality = formData.get('quality') as 'quick' | 'standard' | 'fast' | 'premium' || 'standard'
    const style = formData.get('style') as keyof typeof OIL_PAINTING_PROMPTS || 'classic'
    const preservationMode = formData.get('preservationMode') as 'low' | 'medium' | 'high' | 'extreme' || 'high'
    const strength = formData.get('strength') as string || undefined
    
    if (!image) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 })
    }
    
    console.log(`🎨 Replicate Oil Painting Conversion`)
    console.log(`   Quality: ${quality}, Style: ${style}, Preservation: ${preservationMode}`)
    
    // Check if Replicate is configured
    const client = getReplicateClient()
    if (!client) {
      // Fallback to ComfyUI if Replicate is not configured
      console.log('⚠️  Replicate not configured, falling back to ComfyUI')
      return NextResponse.json({
        error: 'Replicate API not configured',
        fallback: 'comfyui',
        message: 'Add REPLICATE_API_TOKEN to .env.local'
      }, { status: 503 })
    }
    
    // Validate image
    if (image.size > 10 * 1024 * 1024) { // 10MB limit
      return NextResponse.json({ error: 'Image too large (max 10MB)' }, { status: 400 })
    }
    
    if (!image.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Invalid file type' }, { status: 400 })
    }
    
    console.log(`📷 Processing image: ${image.name}, Type: ${image.type}, Size: ${(image.size / 1024).toFixed(1)}KB`)
    
    // Convert problematic formats (AVIF, WebP) to base64 data URLs for better compatibility
    let processedImage = image
    if (image.type === 'image/avif' || image.type === 'image/webp') {
      console.log(`🔄 Converting ${image.type} to base64 data URL for compatibility`)
      try {
        const buffer = await image.arrayBuffer()
        const base64 = Buffer.from(buffer).toString('base64')
        const dataUrl = `data:${image.type};base64,${base64}`
        
        // Convert to a standard format that Replicate can handle
        // Instead of File object, use data URL string
        processedImage = dataUrl as any // Type assertion since we're changing the type
        console.log(`✅ Converted ${image.type} to data URL (${(base64.length / 1024).toFixed(1)}KB base64)`)
      } catch (error) {
        console.error('Format conversion failed:', error)
        return NextResponse.json({ 
          error: `Failed to convert ${image.type}`, 
          suggestion: 'Please try converting your image to JPG or PNG format and uploading again'
        }, { status: 400 })
      }
    }
    
    try {
      // Use Replicate to convert the image - pass File object or data URL string
      const startTime = Date.now()
      const result = await client.convertToOilPainting(processedImage, {
        quality,
        style,
        preservationMode,
        ...(strength && { strength: parseFloat(strength) })
      })
      
      if (!result.success || !result.imageUrl) {
        throw new Error('Conversion failed - no output image')
      }
      
      // Track successful usage
      const processingTime = ((Date.now() - startTime) / 1000).toFixed(1) + 's'
      const modelConfig = REPLICATE_MODELS[quality]
      await usageTracker.trackUsage(
        result.metadata?.model || modelConfig.model,
        quality,
        style,
        modelConfig.cost,
        processingTime,
        true
      )
      
      // Fetch the result image and convert to base64
      const imageResponse = await fetch(result.imageUrl)
      if (!imageResponse.ok) {
        throw new Error('Failed to fetch converted image')
      }
      
      const imageBuffer = await imageResponse.arrayBuffer()
      const outputBase64 = Buffer.from(imageBuffer).toString('base64')
      
      return NextResponse.json({
        success: true,
        image: `data:image/png;base64,${outputBase64}`,
        metadata: result.metadata,
        provider: 'replicate'
      })
      
    } catch (conversionError) {
      console.error('Replicate conversion error:', conversionError)
      
      // Track failed usage
      const modelConfig = REPLICATE_MODELS[quality]
      await usageTracker.trackUsage(
        modelConfig.model,
        quality,
        style,
        0, // No cost for failed calls
        '0s',
        false,
        conversionError instanceof Error ? conversionError.message : 'Unknown error'
      )
      
      // Check if it's a format issue - try fallback to ComfyUI
      const errorMessage = conversionError instanceof Error ? conversionError.message : 'Unknown error'
      if (errorMessage.includes('cannot identify image file') || 
          errorMessage.includes('format') || 
          image.type === 'image/avif' || 
          image.type === 'image/webp') {
        
        console.log('🔄 Replicate failed, attempting fallback to ComfyUI...')
        
        try {
          // Fallback to ComfyUI
          const fallbackFormData = new FormData()
          
          // Convert File to the format ComfyUI expects
          const buffer = await processedImage.arrayBuffer()
          const blob = new Blob([buffer], { type: processedImage.type })
          fallbackFormData.append('image', blob, processedImage.name)
          fallbackFormData.append('backend', 'comfyui')
          fallbackFormData.append('style', style === 'vangogh' ? 'van_gogh' : 
                                         style === 'impressionist' ? 'impressionist' : 'classic')
          
          const fallbackResponse = await fetch('http://localhost:5174/api/convert-dual', {
            method: 'POST',
            body: fallbackFormData,
          })
          
          if (fallbackResponse.ok) {
            const fallbackResult = await fallbackResponse.json()
            console.log('✅ ComfyUI fallback succeeded!')
            
            return NextResponse.json({
              success: true,
              image: fallbackResult.image,
              metadata: {
                provider: 'comfyui-fallback',
                originalError: errorMessage,
                message: 'Used ComfyUI fallback due to format compatibility'
              }
            })
          }
        } catch (fallbackError) {
          console.error('ComfyUI fallback also failed:', fallbackError)
        }
      }
      
      // Return error with helpful information
      return NextResponse.json({
        error: 'Conversion failed',
        details: errorMessage,
        suggestion: errorMessage.includes('cannot identify image file') 
          ? 'Try converting your image to JPG or PNG format'
          : 'Check your Replicate API key and credits'
      }, { status: 500 })
    }
    
  } catch (error) {
    console.error('API route error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

/**
 * GET endpoint to check Replicate status and available options
 */
export async function GET() {
  const client = getReplicateClient()
  
  if (!client) {
    return NextResponse.json({
      configured: false,
      message: 'Replicate not configured. Add REPLICATE_API_TOKEN to .env.local',
      instructions: {
        step1: 'Go to https://replicate.com/account/api-tokens',
        step2: 'Create an API token',
        step3: 'Add to .env.local: REPLICATE_API_TOKEN=your_token_here',
        step4: 'Restart the development server'
      }
    })
  }
  
  const status = await client.checkStatus()
  
  return NextResponse.json({
    ...status,
    availableQualities: ['quick', 'standard', 'fast', 'premium'],
    availableStyles: Object.keys(OIL_PAINTING_PROMPTS),
    pricing: {
      quick: '$0.007 per image (8 seconds)',
      standard: '$0.02 per image (20-30 seconds)',
      fast: '$0.01 per image (5-10 seconds)',
      premium: '$0.14 per image (11 minutes)'
    },
    recommendations: {
      testing: 'Use "quick" for testing',
      production: 'Use "standard" for best quality/price ratio',
      highValue: 'Use "premium" for special customers'
    }
  })
}