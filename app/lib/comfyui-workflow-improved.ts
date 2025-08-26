/**
 * Improved ComfyUI Oil Painting Workflows
 * Based on expert guide from SD.md
 * Implements both Method 1 (Simple with LoRA) and Method 2 (Advanced with ControlNet)
 */

export interface ImprovedOilPaintingConfig {
  method: 'simple' | 'advanced'
  style: 'classic' | 'impressionist' | 'vangogh' | 'rembrandt' | 'monet'
  intensity: 'light' | 'medium' | 'heavy'  // Controls denoising strength
  subject: 'portrait' | 'landscape' | 'still_life' | 'general'
  checkpoint?: string
  lora_name?: string
  controlnet_model?: string
  seed?: number
}

/**
 * Expert-guided denoising values based on SD.md
 * Lower values (0.55-0.65) for portraits
 * Medium values (0.65-0.75) for impressionism
 * Higher values (0.75-0.85) for Van Gogh style
 * With ControlNet: can go up to 1.0
 */
const DENOISING_VALUES = {
  simple: {
    light: 0.55,    // Minimal change, preserve most detail
    medium: 0.65,   // Balanced oil painting effect
    heavy: 0.75     // Strong oil painting transformation
  },
  advanced: {
    light: 0.70,    // With ControlNet we can go higher
    medium: 0.85,   // ControlNet preserves composition
    heavy: 1.0      // Complete transformation with structure preserved
  }
}

/**
 * Oil painting prompt templates with expert keywords from SD.md
 */
const PROMPT_TEMPLATES = {
  classic: {
    positive: "(masterpiece:1.2), best quality, oil painting, by Rembrandt, baroque style, dramatic chiaroscuro lighting, thick impasto technique, palette knife, textured brushstrokes, oil on canvas, glazing layers, classical composition, museum quality artwork",
    negative: "(worst quality, low quality:1.4), photograph, photo, photographic, photorealistic, digital art, 3d render, smooth surface, flat colors, anime, cartoon, sharp edges, modern, oversaturated"
  },
  impressionist: {
    positive: "(masterpiece:1.2), best quality, impressionist oil painting, by Claude Monet, broken color technique, visible brushstrokes, plein air painting, soft edges, atmospheric perspective, dappled light, French impressionism, thick paint application, canvas texture visible",
    negative: "(worst quality, low quality:1.4), photograph, realism, sharp focus, digital art, smooth blending, photorealistic, 3d render, vector art, flat illustration"
  },
  vangogh: {
    positive: "(masterpiece:1.2), best quality, oil painting by Vincent Van Gogh, expressive brushwork, swirling strokes, thick impasto, vibrant colors, post-impressionism, emotional intensity, palette knife technique, heavy paint texture, dramatic movement",
    negative: "(worst quality, low quality:1.4), photograph, photorealistic, smooth, digital, minimalist, flat colors, thin paint, watercolor, pencil sketch"
  },
  rembrandt: {
    positive: "(masterpiece:1.2), best quality, oil painting portrait by Rembrandt van Rijn, Dutch Golden Age, dramatic lighting, deep shadows, warm tones, masterful brushwork, glazing technique, rich textures, baroque style, chiaroscuro",
    negative: "(worst quality, low quality:1.4), photograph, modern art, digital painting, anime, cartoon, flat lighting, oversaturated colors"
  },
  monet: {
    positive: "(masterpiece:1.2), best quality, oil painting by Claude Monet, water lilies, impressionism, soft brushstrokes, natural light, outdoor painting, broken color, atmospheric effects, French impressionist masterpiece, visible canvas texture",
    negative: "(worst quality, low quality:1.4), photograph, sharp details, digital art, hyperrealistic, smooth gradients, vector graphics"
  }
}

/**
 * Create Method 1: Simple Img2Img with LoRA workflow
 * Based on SD.md expert guide
 */
export function createSimpleOilPaintingWorkflow(
  imagePath: string,
  config: ImprovedOilPaintingConfig
): any {
  const denoise = DENOISING_VALUES.simple[config.intensity]
  const prompts = PROMPT_TEMPLATES[config.style] || PROMPT_TEMPLATES.classic
  const seed = config.seed || Math.floor(Math.random() * 1000000)
  
  const workflow: any = {
    // Load Checkpoint
    "1": {
      "inputs": {
        "ckpt_name": config.checkpoint || "sd_xl_base_1.0_0.9vae.safetensors"
      },
      "class_type": "CheckpointLoaderSimple",
      "_meta": {
        "title": "Load Checkpoint"
      }
    },
    
    // Load Image
    "3": {
      "inputs": {
        "image": imagePath,
        "upload": "image"
      },
      "class_type": "LoadImage",
      "_meta": {
        "title": "Load Image"
      }
    },
    
    // Positive Prompt
    "4": {
      "inputs": {
        "text": prompts.positive,
        "clip": ["1", 1]
      },
      "class_type": "CLIPTextEncode",
      "_meta": {
        "title": "CLIP Text Encode (Positive)"
      }
    },
    
    // Negative Prompt
    "5": {
      "inputs": {
        "text": prompts.negative,
        "clip": ["1", 1]
      },
      "class_type": "CLIPTextEncode",
      "_meta": {
        "title": "CLIP Text Encode (Negative)"
      }
    },
    
    // VAE Encode (Image to Latent)
    "6": {
      "inputs": {
        "pixels": ["3", 0],
        "vae": ["1", 2]
      },
      "class_type": "VAEEncode",
      "_meta": {
        "title": "VAE Encode"
      }
    },
    
    // KSampler - Core generation with expert denoising values
    "7": {
      "inputs": {
        "seed": seed,
        "steps": 35,  // Expert guide recommends 30-40 steps
        "cfg": 7.5,   // Balanced CFG for artistic style
        "sampler_name": "dpmpp_2m_sde",
        "scheduler": "karras",
        "denoise": denoise,  // Expert-guided denoising value
        "model": ["1", 0],
        "positive": ["4", 0],
        "negative": ["5", 0],
        "latent_image": ["6", 0]
      },
      "class_type": "KSampler",
      "_meta": {
        "title": "KSampler"
      }
    },
    
    // VAE Decode
    "8": {
      "inputs": {
        "samples": ["7", 0],
        "vae": ["1", 2]
      },
      "class_type": "VAEDecode",
      "_meta": {
        "title": "VAE Decode"
      }
    },
    
    // Save Image
    "9": {
      "inputs": {
        "filename_prefix": "oil_painting_simple",
        "images": ["8", 0]
      },
      "class_type": "SaveImage",
      "_meta": {
        "title": "Save Image"
      }
    }
  }
  
  // Add LoRA if available (Method 1 from guide)
  if (config.lora_name) {
    workflow["2"] = {
      "inputs": {
        "lora_name": config.lora_name,
        "strength_model": 0.8,  // Expert guide recommends 0.8
        "strength_clip": 0.8,
        "model": ["1", 0],
        "clip": ["1", 1]
      },
      "class_type": "LoraLoader",
      "_meta": {
        "title": "Load Oil Painting LoRA"
      }
    }
    
    // Update connections to use LoRA outputs
    workflow["4"]["inputs"]["clip"] = ["2", 1]  // Positive uses LoRA CLIP
    workflow["5"]["inputs"]["clip"] = ["2", 1]  // Negative uses LoRA CLIP
    workflow["7"]["inputs"]["model"] = ["2", 0]  // KSampler uses LoRA model
  }
  
  return workflow
}

/**
 * Create Method 2: Advanced Img2Img with ControlNet workflow
 * Based on SD.md expert guide - Superior compositional control
 */
export function createAdvancedOilPaintingWorkflow(
  imagePath: string,
  config: ImprovedOilPaintingConfig
): any {
  const denoise = DENOISING_VALUES.advanced[config.intensity]
  const prompts = PROMPT_TEMPLATES[config.style] || PROMPT_TEMPLATES.classic
  const seed = config.seed || Math.floor(Math.random() * 1000000)
  
  // Choose ControlNet based on subject (expert guide recommendations)
  const controlnetModel = config.controlnet_model || 
    (config.subject === 'portrait' ? 'control-lora-canny-rank256.safetensors' : 'control-lora-depth-rank256.safetensors')
  const preprocessorType = controlnetModel.includes('canny') ? 'Canny' : 'DepthAnythingV2Preprocessor'
  
  const workflow: any = {
    // Load Checkpoint
    "1": {
      "inputs": {
        "ckpt_name": config.checkpoint || "sd_xl_base_1.0_0.9vae.safetensors"
      },
      "class_type": "CheckpointLoaderSimple",
      "_meta": {
        "title": "Load Checkpoint"
      }
    },
    
    // Load Image
    "3": {
      "inputs": {
        "image": imagePath,
        "upload": "image"
      },
      "class_type": "LoadImage",
      "_meta": {
        "title": "Load Image"
      }
    },
    
    // Positive Prompt with enhanced oil painting keywords
    "4": {
      "inputs": {
        "text": prompts.positive + ", highly detailed, professional artwork",
        "clip": ["1", 1]
      },
      "class_type": "CLIPTextEncode",
      "_meta": {
        "title": "CLIP Text Encode (Positive)"
      }
    },
    
    // Negative Prompt
    "5": {
      "inputs": {
        "text": prompts.negative,
        "clip": ["1", 1]
      },
      "class_type": "CLIPTextEncode",
      "_meta": {
        "title": "CLIP Text Encode (Negative)"
      }
    },
    
    // Load ControlNet Model
    "6": {
      "inputs": {
        "control_net_name": controlnetModel
      },
      "class_type": "ControlNetLoader",
      "_meta": {
        "title": "Load ControlNet Model"
      }
    },
    
    // Preprocessor (Canny or Depth based on subject)
    "7": preprocessorType === 'Canny' ? {
      "inputs": {
        "low_threshold": 0.4,
        "high_threshold": 0.8,
        "image": ["3", 0]
      },
      "class_type": "Canny",
      "_meta": {
        "title": "Canny Edge Preprocessor"
      }
    } : {
      "inputs": {
        "ckpt_name": "depth_anything_v2_vitl.pth",
        "resolution": 512,
        "image": ["3", 0]
      },
      "class_type": "DepthAnythingV2Preprocessor",
      "_meta": {
        "title": "Depth Preprocessor"
      }
    },
    
    // Apply ControlNet - Key for Method 2
    "8": {
      "inputs": {
        "strength": 1.0,  // Expert guide recommends 1.0 for start
        "conditioning": ["4", 0],
        "control_net": ["6", 0],
        "image": ["7", 0]
      },
      "class_type": "ControlNetApply",
      "_meta": {
        "title": "Apply ControlNet"
      }
    },
    
    // VAE Encode
    "9": {
      "inputs": {
        "pixels": ["3", 0],
        "vae": ["1", 2]
      },
      "class_type": "VAEEncode",
      "_meta": {
        "title": "VAE Encode"
      }
    },
    
    // KSampler with higher denoising (ControlNet preserves structure)
    "10": {
      "inputs": {
        "seed": seed,
        "steps": 40,  // Slightly more steps for quality
        "cfg": 7.0,
        "sampler_name": "dpmpp_2m_sde",
        "scheduler": "karras",
        "denoise": denoise,  // Can go higher with ControlNet
        "model": ["1", 0],
        "positive": ["8", 0],  // Uses ControlNet conditioning
        "negative": ["5", 0],
        "latent_image": ["9", 0]
      },
      "class_type": "KSampler",
      "_meta": {
        "title": "KSampler"
      }
    },
    
    // VAE Decode
    "11": {
      "inputs": {
        "samples": ["10", 0],
        "vae": ["1", 2]
      },
      "class_type": "VAEDecode",
      "_meta": {
        "title": "VAE Decode"
      }
    },
    
    // Save Image
    "12": {
      "inputs": {
        "filename_prefix": "oil_painting_advanced",
        "images": ["11", 0]
      },
      "class_type": "SaveImage",
      "_meta": {
        "title": "Save Image"
      }
    },
    
    // Preview ControlNet Map
    "13": {
      "inputs": {
        "images": ["7", 0]
      },
      "class_type": "PreviewImage",
      "_meta": {
        "title": "Preview Control Map"
      }
    }
  }
  
  // Add LoRA if available (can chain with ControlNet)
  if (config.lora_name) {
    workflow["2"] = {
      "inputs": {
        "lora_name": config.lora_name,
        "strength_model": 0.6,  // Lower strength with ControlNet
        "strength_clip": 0.6,
        "model": ["1", 0],
        "clip": ["1", 1]
      },
      "class_type": "LoraLoader",
      "_meta": {
        "title": "Load Oil Painting LoRA"
      }
    }
    
    // Update connections
    workflow["4"]["inputs"]["clip"] = ["2", 1]
    workflow["5"]["inputs"]["clip"] = ["2", 1]
    workflow["10"]["inputs"]["model"] = ["2", 0]
  }
  
  return workflow
}

/**
 * Auto-detect best configuration based on available models
 */
export async function detectBestConfiguration(): Promise<Partial<ImprovedOilPaintingConfig>> {
  try {
    const response = await fetch('http://localhost:8188/models')
    const models = await response.json()
    
    // Look for oil painting LoRAs
    const oilPaintingLoRAs = models.filter((m: string) => 
      m.toLowerCase().includes('oil') || 
      m.toLowerCase().includes('painting') ||
      m.toLowerCase().includes('impasto')
    )
    
    // Look for ControlNet models
    const controlnetModels = models.filter((m: string) => 
      m.toLowerCase().includes('control')
    )
    
    return {
      lora_name: oilPaintingLoRAs[0],
      controlnet_model: controlnetModels[0],
      method: controlnetModels.length > 0 ? 'advanced' : 'simple'
    }
  } catch (error) {
    console.error('Failed to detect models:', error)
    return {
      method: 'simple'
    }
  }
}