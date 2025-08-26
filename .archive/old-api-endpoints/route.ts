/**
 * Expert Oil Painting Conversion API
 * Implements both Method 1 (Simple) and Method 2 (Advanced with ControlNet)
 * Based on SD.md expert guide
 */

import { NextRequest, NextResponse } from 'next/server'
import { 
  createSimpleOilPaintingWorkflow, 
  createAdvancedOilPaintingWorkflow,
  detectBestConfiguration,
  type ImprovedOilPaintingConfig 
} from '@/app/lib/comfyui-workflow-improved'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const image = formData.get('image') as File
    const method = formData.get('method') as 'simple' | 'advanced' || 'simple'
    const style = formData.get('style') as any || 'classic'
    const intensity = formData.get('intensity') as any || 'medium'
    const subject = formData.get('subject') as any || 'general'
    
    if (!image) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 })
    }
    
    console.log(`🎨 Expert Oil Painting Conversion: Method=${method}, Style=${style}, Intensity=${intensity}`)
    
    // Convert image to base64 for ComfyUI
    const buffer = await image.arrayBuffer()
    const base64 = Buffer.from(buffer).toString('base64')
    const imageName = `upload_${Date.now()}.png`
    
    // Upload image to ComfyUI
    const uploadFormData = new FormData()
    uploadFormData.append('image', new Blob([buffer]), imageName)
    
    const uploadResponse = await fetch('http://localhost:8188/upload/image', {
      method: 'POST',
      body: uploadFormData
    })
    
    if (!uploadResponse.ok) {
      throw new Error('Failed to upload image to ComfyUI')
    }
    
    // Auto-detect available models
    const autoConfig = await detectBestConfiguration()
    
    // Build configuration
    const config: ImprovedOilPaintingConfig = {
      method,
      style,
      intensity,
      subject,
      ...autoConfig  // Merge auto-detected models
    }
    
    // Create workflow based on method
    const workflow = method === 'advanced' 
      ? createAdvancedOilPaintingWorkflow(imageName, config)
      : createSimpleOilPaintingWorkflow(imageName, config)
    
    // Queue the workflow
    const queueResponse = await fetch('http://localhost:8188/prompt', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: workflow,
        client_id: 'oil-painting-expert'
      })
    })
    
    if (!queueResponse.ok) {
      const error = await queueResponse.text()
      console.error('ComfyUI queue error:', error)
      throw new Error('Failed to queue workflow')
    }
    
    const queueData = await queueResponse.json()
    const promptId = queueData.prompt_id
    
    // Poll for completion
    let completed = false
    let attempts = 0
    const maxAttempts = 60  // 60 seconds timeout
    
    while (!completed && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const historyResponse = await fetch(`http://localhost:8188/history/${promptId}`)
      if (historyResponse.ok) {
        const history = await historyResponse.json()
        if (history[promptId]?.outputs) {
          completed = true
          
          // Get the output image
          const outputs = history[promptId].outputs
          const imageNode = Object.values(outputs).find((output: any) => 
            output.images && output.images.length > 0
          ) as any
          
          if (imageNode) {
            const outputImage = imageNode.images[0]
            const imageUrl = `http://localhost:8188/view?filename=${outputImage.filename}&subfolder=${outputImage.subfolder || ''}&type=${outputImage.type || 'output'}`
            
            // Fetch and return the image
            const imageResponse = await fetch(imageUrl)
            const imageBuffer = await imageResponse.arrayBuffer()
            const outputBase64 = Buffer.from(imageBuffer).toString('base64')
            
            return NextResponse.json({
              success: true,
              image: `data:image/png;base64,${outputBase64}`,
              metadata: {
                method,
                style,
                intensity,
                denoising: method === 'advanced' 
                  ? { simple: 0.70, medium: 0.85, heavy: 1.0 }[intensity]
                  : { light: 0.55, medium: 0.65, heavy: 0.75 }[intensity],
                hasLoRA: !!config.lora_name,
                hasControlNet: method === 'advanced',
                recommendations: getRecommendations(config)
              }
            })
          }
        }
      }
      
      attempts++
    }
    
    throw new Error('Workflow execution timeout')
    
  } catch (error) {
    console.error('Expert oil painting conversion error:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Conversion failed',
      details: 'Please ensure ComfyUI is running on port 8188'
    }, { status: 500 })
  }
}

/**
 * GET endpoint to check available models and styles
 */
export async function GET() {
  try {
    const autoConfig = await detectBestConfiguration()
    
    return NextResponse.json({
      availableStyles: ['classic', 'impressionist', 'vangogh', 'rembrandt', 'monet'],
      availableMethods: ['simple', 'advanced'],
      availableIntensities: ['light', 'medium', 'heavy'],
      availableSubjects: ['portrait', 'landscape', 'still_life', 'general'],
      detectedModels: autoConfig,
      recommendations: {
        portrait: {
          method: 'advanced',
          style: 'rembrandt',
          intensity: 'light',
          reason: 'Preserves facial features while adding artistic style'
        },
        landscape: {
          method: 'simple',
          style: 'monet',
          intensity: 'medium',
          reason: 'Creates impressionist atmosphere without over-processing'
        },
        general: {
          method: autoConfig.method || 'simple',
          style: 'classic',
          intensity: 'medium',
          reason: 'Balanced approach for various subjects'
        }
      }
    })
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to get configuration',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

/**
 * Generate recommendations based on configuration
 */
function getRecommendations(config: ImprovedOilPaintingConfig): string[] {
  const recommendations: string[] = []
  
  if (!config.lora_name) {
    recommendations.push('Download an oil painting LoRA from Civitai for better results')
  }
  
  if (config.method === 'simple' && config.subject === 'portrait') {
    recommendations.push('Consider using Advanced method for better facial preservation')
  }
  
  if (config.intensity === 'heavy' && config.subject === 'portrait') {
    recommendations.push('High intensity may alter facial features - consider Medium intensity')
  }
  
  if (config.style === 'vangogh' && config.intensity === 'light') {
    recommendations.push('Van Gogh style works best with Heavy intensity for authentic texture')
  }
  
  return recommendations
}