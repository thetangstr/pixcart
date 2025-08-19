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
  positive_prompt: string
  negative_prompt: string
  steps: number
  cfg: number
  sampler_name: string
  scheduler: string
  denoise: number
  controlnet_strength?: number
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

  createOilPaintingWorkflow(
    imageBase64: string,
    config: ComfyUIStyleConfig,
    useControlNet = true
  ): ComfyUIWorkflow {
    const workflow: ComfyUIWorkflow = {
      "3": {
        "inputs": {
          "seed": Math.floor(Math.random() * 1000000),
          "steps": config.steps,
          "cfg": config.cfg,
          "sampler_name": config.sampler_name,
          "scheduler": config.scheduler,
          "denoise": config.denoise,
          "model": ["4", 0],
          "positive": ["6", 0],
          "negative": ["7", 0],
          "latent_image": useControlNet ? ["13", 0] : ["5", 0]
        },
        "class_type": "KSampler",
        "_meta": {
          "title": "KSampler"
        }
      },
      "4": {
        "inputs": {
          "ckpt_name": config.checkpoint
        },
        "class_type": "CheckpointLoaderSimple",
        "_meta": {
          "title": "Load Checkpoint"
        }
      },
      "5": {
        "inputs": {
          "width": 512,
          "height": 512,
          "batch_size": 1
        },
        "class_type": "EmptyLatentImage",
        "_meta": {
          "title": "Empty Latent Image"
        }
      },
      "6": {
        "inputs": {
          "text": config.positive_prompt,
          "clip": ["4", 1]
        },
        "class_type": "CLIPTextEncode",
        "_meta": {
          "title": "CLIP Text Encode (Prompt)"
        }
      },
      "7": {
        "inputs": {
          "text": config.negative_prompt,
          "clip": ["4", 1]
        },
        "class_type": "CLIPTextEncode",
        "_meta": {
          "title": "CLIP Text Encode (Negative)"
        }
      },
      "8": {
        "inputs": {
          "samples": ["3", 0],
          "vae": ["4", 2]
        },
        "class_type": "VAEDecode",
        "_meta": {
          "title": "VAE Decode"
        }
      },
      "9": {
        "inputs": {
          "filename_prefix": "oil_painting",
          "images": ["8", 0]
        },
        "class_type": "SaveImage",
        "_meta": {
          "title": "Save Image"
        }
      },
      "10": {
        "inputs": {
          "image": imageBase64
        },
        "class_type": "LoadImage",
        "_meta": {
          "title": "Load Image"
        }
      }
    }

    // Add ControlNet if enabled
    if (useControlNet && config.controlnet_strength) {
      workflow["11"] = {
        "inputs": {
          "control_net_name": "control_canny.safetensors"
        },
        "class_type": "ControlNetLoader",
        "_meta": {
          "title": "Load ControlNet Model"
        }
      }

      workflow["12"] = {
        "inputs": {
          "image": ["10", 0],
          "low_threshold": 100,
          "high_threshold": 200
        },
        "class_type": "Canny",
        "_meta": {
          "title": "Canny"
        }
      }

      workflow["13"] = {
        "inputs": {
          "strength": config.controlnet_strength,
          "conditioning": ["6", 0],
          "control_net": ["11", 0],
          "image": ["12", 0]
        },
        "class_type": "ControlNetApply",
        "_meta": {
          "title": "Apply ControlNet"
        }
      }

      // Update KSampler to use ControlNet
      workflow["3"].inputs.positive = ["13", 0]
    }

    return workflow
  }

  async queuePrompt(workflow: ComfyUIWorkflow): Promise<string> {
    const response = await fetch(`${this.baseUrl}/prompt`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: workflow,
        client_id: 'oil-painting-app'
      })
    })

    if (!response.ok) {
      throw new Error(`Failed to queue prompt: ${response.statusText}`)
    }

    const result: ComfyUIQueueResponse = await response.json()
    
    if (result.node_errors && Object.keys(result.node_errors).length > 0) {
      throw new Error(`Workflow errors: ${JSON.stringify(result.node_errors)}`)
    }

    return result.prompt_id
  }

  async waitForCompletion(promptId: string, timeoutMs = 300000): Promise<string> {
    const startTime = Date.now()
    
    while (Date.now() - startTime < timeoutMs) {
      try {
        const response = await fetch(`${this.baseUrl}/history/${promptId}`)
        const history: ComfyUIHistoryResponse = await response.json()
        
        const execution = history[promptId]
        if (execution && execution.status.completed) {
          // Find the output image
          for (const nodeId in execution.outputs) {
            const output = execution.outputs[nodeId]
            if (output.images && output.images.length > 0) {
              const image = output.images[0]
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

    // Create workflow
    const workflow = this.createOilPaintingWorkflow(imageBase64, config, true)
    
    // Queue the prompt
    const promptId = await this.queuePrompt(workflow)
    
    // Wait for completion and get result
    return await this.waitForCompletion(promptId)
  }
}

export const comfyUIClient = new ComfyUIClient()