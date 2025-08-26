/**
 * Universal Model Inference API
 * Allows other apps to use our ComfyUI models without re-downloading
 * 
 * Usage from another app:
 * POST http://localhost:5174/api/models/inference
 * {
 *   "model": "sd15" | "sdxl",
 *   "prompt": "oil painting of a dog",
 *   "negative_prompt": "photo, digital",
 *   "image": "base64_string" (optional for img2img),
 *   "seed": 42 (optional),
 *   "steps": 20,
 *   "cfg_scale": 7
 * }
 */

import { NextRequest, NextResponse } from 'next/server'

// ComfyUI workflow template for text2img
const TEXT2IMG_WORKFLOW = {
  "3": {
    "class_type": "KSampler",
    "inputs": {
      "seed": 42,
      "steps": 20,
      "cfg": 7,
      "sampler_name": "euler",
      "scheduler": "normal",
      "denoise": 1,
      "model": ["4", 0],
      "positive": ["6", 0],
      "negative": ["7", 0],
      "latent_image": ["5", 0]
    }
  },
  "4": {
    "class_type": "CheckpointLoaderSimple",
    "inputs": {
      "ckpt_name": "v1-5-pruned-emaonly.safetensors"
    }
  },
  "5": {
    "class_type": "EmptyLatentImage",
    "inputs": {
      "width": 512,
      "height": 512,
      "batch_size": 1
    }
  },
  "6": {
    "class_type": "CLIPTextEncode",
    "inputs": {
      "text": "oil painting",
      "clip": ["4", 1]
    }
  },
  "7": {
    "class_type": "CLIPTextEncode",
    "inputs": {
      "text": "photo, digital",
      "clip": ["4", 1]
    }
  },
  "8": {
    "class_type": "VAEDecode",
    "inputs": {
      "samples": ["3", 0],
      "vae": ["4", 2]
    }
  },
  "9": {
    "class_type": "SaveImage",
    "inputs": {
      "filename_prefix": "api_output",
      "images": ["8", 0]
    }
  }
}

// Model mappings
const MODEL_MAPPINGS: Record<string, { checkpoint: string, enhanced?: boolean }> = {
  'sd15': { checkpoint: 'v1-5-pruned-emaonly.safetensors' },
  'sd15-enhanced': { checkpoint: 'v1-5-pruned-emaonly.safetensors', enhanced: true },
  'sdxl': { checkpoint: 'sd_xl_base_1.0_0.9vae.safetensors' },
  'sd1.5': { checkpoint: 'v1-5-pruned-emaonly.safetensors' },
  'stable-diffusion-1.5': { checkpoint: 'v1-5-pruned-emaonly.safetensors' },
  'stable-diffusion-xl': { checkpoint: 'sd_xl_base_1.0_0.9vae.safetensors' }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate required fields
    if (!body.model || !body.prompt) {
      return NextResponse.json(
        { error: 'Model and prompt are required' },
        { status: 400 }
      )
    }
    
    // Map model name to configuration
    const modelConfig = MODEL_MAPPINGS[body.model.toLowerCase()]
    if (!modelConfig) {
      return NextResponse.json(
        { 
          error: 'Invalid model. Available models: sd15, sd15-enhanced, sdxl',
          available_models: Object.keys(MODEL_MAPPINGS)
        },
        { status: 400 }
      )
    }
    
    const checkpoint = modelConfig.checkpoint
    const isEnhanced = modelConfig.enhanced || false
    
    // Prepare workflow
    const workflow = JSON.parse(JSON.stringify(TEXT2IMG_WORKFLOW))
    
    // Update model
    workflow["4"].inputs.ckpt_name = checkpoint
    
    // Update prompts
    workflow["6"].inputs.text = body.prompt
    workflow["7"].inputs.text = body.negative_prompt || ""
    
    // Update sampler settings (limit steps for faster generation)
    if (body.seed !== undefined) workflow["3"].inputs.seed = body.seed
    if (body.steps !== undefined) {
      // Limit steps to 30 max for reasonable generation time
      workflow["3"].inputs.steps = Math.min(body.steps, 30)
    }
    if (body.cfg_scale !== undefined) workflow["3"].inputs.cfg = body.cfg_scale
    
    // Get ComfyUI URL early for image upload
    const comfyuiUrl = process.env.COMFYUI_BASE_URL || 'http://localhost:8188'
    
    // Adjust dimensions for SDXL (use smaller size for faster generation)
    if (checkpoint.includes('xl')) {
      // Use 768x768 for faster SDXL generation during testing
      workflow["5"].inputs.width = body.width || 768
      workflow["5"].inputs.height = body.height || 768
    } else {
      workflow["5"].inputs.width = body.width || 512
      workflow["5"].inputs.height = body.height || 512
    }
    
    // If image provided, switch to img2img
    let uploadedImageName = null
    if (body.image && body.image !== 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==') {
      // Save image directly to ComfyUI input folder
      try {
        console.log('Saving image to ComfyUI input folder for img2img')
        
        // Use our local upload endpoint
        const uploadResponse = await fetch('http://localhost:5174/api/upload-to-comfy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: body.image })
        })
        
        if (uploadResponse.ok) {
          const uploadResult = await uploadResponse.json()
          uploadedImageName = uploadResult.filename
          console.log('Image saved successfully:', uploadedImageName)
          
          // Add LoadImage node with uploaded image
          workflow["10"] = {
            "class_type": "LoadImage",
            "inputs": {
              "image": uploadedImageName,
              "upload": "image"
            }
          }
          
          // Add VAE Encode to convert image to latent
          workflow["11"] = {
            "class_type": "VAEEncode",
            "inputs": {
              "pixels": ["10", 0],
              "vae": ["4", 2]
            }
          }
          
          // Update KSampler to use encoded image
          workflow["3"].inputs.latent_image = ["11", 0]
          workflow["3"].inputs.denoise = body.strength || 0.75
          
          // Remove EmptyLatentImage since we're using the uploaded image
          delete workflow["5"]
        } else {
          console.error('Failed to upload image to ComfyUI')
        }
      } catch (error) {
        console.error('Error uploading image:', error)
      }
    }
    
    // Queue the workflow in ComfyUI
    
    // Generate client ID
    const clientId = `api-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    
    // Queue prompt
    const queueResponse = await fetch(`${comfyuiUrl}/prompt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: workflow,
        client_id: clientId
      })
    })
    
    if (!queueResponse.ok) {
      throw new Error('Failed to queue workflow')
    }
    
    const queueData = await queueResponse.json()
    const promptId = queueData.prompt_id
    
    // Poll for completion (simplified - in production use WebSocket)
    let attempts = 0
    const maxAttempts = 180 // 180 seconds timeout for slower models
    
    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Log progress every 10 seconds
      if (attempts % 10 === 0 && attempts > 0) {
        console.log(`Inference API: Waiting for ${body.model} - ${attempts}s elapsed`)
      }
      
      // Check history
      const historyResponse = await fetch(`${comfyuiUrl}/history/${promptId}`)
      if (historyResponse.ok) {
        const history = await historyResponse.json()
        if (history[promptId]?.outputs) {
          // Get the output image
          const outputs = history[promptId].outputs
          const imageNode = outputs["9"]
          
          if (imageNode?.images?.[0]) {
            const imageName = imageNode.images[0].filename
            
            // Fetch the image and convert to base64 to avoid CORS issues
            try {
              const imageResponse = await fetch(
                `${comfyuiUrl}/view?filename=${imageName}&type=output`
              )
              
              if (imageResponse.ok) {
                const imageBuffer = await imageResponse.arrayBuffer()
                const base64 = Buffer.from(imageBuffer).toString('base64')
                
                return NextResponse.json({
                  success: true,
                  prompt_id: promptId,
                  image: `data:image/png;base64,${base64}`,
                  filename: imageName,
                  model: body.model,
                  processing_time: attempts
                })
              }
            } catch (error) {
              console.error('Failed to fetch image from ComfyUI:', error)
            }
            
            // Fallback to URL if fetch fails
            return NextResponse.json({
              success: true,
              prompt_id: promptId,
              image_url: `${comfyuiUrl}/view?filename=${imageName}`,
              filename: imageName,
              model: body.model,
              processing_time: attempts
            })
          }
        }
      }
      
      attempts++
    }
    
    return NextResponse.json(
      { error: 'Processing timeout' },
      { status: 504 }
    )
    
  } catch (error) {
    console.error('Inference error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Inference failed' },
      { status: 500 }
    )
  }
}

// GET endpoint to check available models
export async function GET() {
  const comfyuiUrl = process.env.COMFYUI_BASE_URL || 'http://localhost:8188'
  
  try {
    // Check ComfyUI status
    const response = await fetch(`${comfyuiUrl}/system_stats`)
    const isOnline = response.ok
    
    return NextResponse.json({
      status: isOnline ? 'online' : 'offline',
      endpoint: `http://localhost:5174/api/models/inference`,
      available_models: [
        {
          id: 'sd15',
          name: 'Stable Diffusion 1.5',
          checkpoint: 'v1-5-pruned-emaonly.safetensors',
          default_size: '512x512'
        },
        {
          id: 'sdxl',
          name: 'Stable Diffusion XL',
          checkpoint: 'sd_xl_base_1.0_0.9vae.safetensors',
          default_size: '1024x1024'
        }
      ],
      usage_example: {
        method: 'POST',
        url: 'http://localhost:5174/api/models/inference',
        headers: { 'Content-Type': 'application/json' },
        body: {
          model: 'sd15',
          prompt: 'oil painting of a sunset',
          negative_prompt: 'photo, digital',
          steps: 20,
          cfg_scale: 7,
          seed: 42
        }
      }
    })
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      error: 'ComfyUI not accessible'
    }, { status: 503 })
  }
}