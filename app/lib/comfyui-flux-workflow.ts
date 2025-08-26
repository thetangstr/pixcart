/**
 * FLUX Workflow for ComfyUI
 * Specialized workflow for FLUX models
 */

export interface FLUXConfig {
  model: string
  prompt: string
  negative_prompt?: string
  width?: number
  height?: number
  steps?: number
  guidance?: number
  seed?: number
}

export function createFLUXWorkflow(
  imagePath: string,
  config: FLUXConfig
) {
  const workflow = {
    "1": {
      "inputs": {
        "unet_name": config.model,
        "weight_dtype": "fp8_e4m3fn"
      },
      "class_type": "UNETLoader",
      "_meta": {
        "title": "Load FLUX Model"
      }
    },
    "2": {
      "inputs": {
        "clip_name1": "clip_l.safetensors",
        "clip_name2": "t5xxl_fp8_e4m3fn.safetensors",
        "type": "flux"
      },
      "class_type": "DualCLIPLoader",
      "_meta": {
        "title": "Load CLIP"
      }
    },
    "3": {
      "inputs": {
        "vae_name": "ae.safetensors"
      },
      "class_type": "VAELoader",
      "_meta": {
        "title": "Load VAE"
      }
    },
    "4": {
      "inputs": {
        "image": imagePath,
        "upload": "image"
      },
      "class_type": "LoadImage",
      "_meta": {
        "title": "Load Input Image"
      }
    },
    "5": {
      "inputs": {
        "pixels": ["4", 0],
        "vae": ["3", 0]
      },
      "class_type": "VAEEncode",
      "_meta": {
        "title": "VAE Encode"
      }
    },
    "6": {
      "inputs": {
        "guidance": config.guidance || 3.5,
        "conditioning": ["8", 0]
      },
      "class_type": "FluxGuidance",
      "_meta": {
        "title": "FLUX Guidance"
      }
    },
    "8": {
      "inputs": {
        "clip": ["2", 0],
        "text": config.prompt,
        "guidance": config.guidance || 3.5
      },
      "class_type": "CLIPTextEncode",
      "_meta": {
        "title": "CLIP Text Encode (Positive)"
      }
    },
    "10": {
      "inputs": {
        "noise": ["11", 0],
        "guider": ["12", 0],
        "sampler": ["13", 0],
        "sigmas": ["14", 0],
        "latent_image": ["5", 0]
      },
      "class_type": "SamplerCustomAdvanced",
      "_meta": {
        "title": "Sample"
      }
    },
    "11": {
      "inputs": {
        "noise_seed": config.seed || Math.floor(Math.random() * 1000000)
      },
      "class_type": "RandomNoise",
      "_meta": {
        "title": "Random Noise"
      }
    },
    "12": {
      "inputs": {
        "model": ["1", 0],
        "conditioning": ["6", 0]
      },
      "class_type": "BasicGuider",
      "_meta": {
        "title": "Basic Guider"
      }
    },
    "13": {
      "inputs": {
        "sampler_name": "euler"
      },
      "class_type": "KSamplerSelect",
      "_meta": {
        "title": "Sampler"
      }
    },
    "14": {
      "inputs": {
        "scheduler": "simple",
        "steps": config.steps || 4,
        "denoise": 1.0,
        "model": ["1", 0]
      },
      "class_type": "BasicScheduler",
      "_meta": {
        "title": "Scheduler"
      }
    },
    "15": {
      "inputs": {
        "samples": ["10", 0],
        "vae": ["3", 0]
      },
      "class_type": "VAEDecode",
      "_meta": {
        "title": "VAE Decode"
      }
    },
    "16": {
      "inputs": {
        "filename_prefix": "FLUX_oil_painting",
        "images": ["15", 0]
      },
      "class_type": "SaveImage",
      "_meta": {
        "title": "Save Image"
      }
    }
  }

  return workflow
}

/**
 * Create FLUX workflow for oil painting style
 */
export function createFLUXOilPaintingWorkflow(
  imagePath: string,
  style: 'classic' | 'impressionist' | 'vangogh' | 'modern' = 'classic',
  preservationStrength: number = 0.7
) {
  const stylePrompts = {
    classic: "transform into classical oil painting, Rembrandt style, dramatic chiaroscuro lighting, baroque masterpiece, rich impasto texture, museum quality, visible brushstrokes on canvas",
    impressionist: "transform into impressionist oil painting, Claude Monet style, broken color technique, soft atmospheric light, plein air painting, thick paint application, French impressionism",
    vangogh: "transform into oil painting by Vincent Van Gogh, heavy impasto technique, swirling dynamic brushstrokes, expressive post-impressionist style, vibrant colors, thick paint texture",
    modern: "transform into contemporary oil painting, bold brushstrokes, thick palette knife texture, modern artistic interpretation, expressive color, dynamic composition"
  }

  const negativePrompts = {
    classic: "photograph, digital art, smooth surface, flat colors",
    impressionist: "photograph, sharp edges, photorealistic, smooth",
    vangogh: "photograph, thin paint, minimalist, flat",
    modern: "photograph, classical, old style, smooth"
  }

  // For FLUX, we need to adjust guidance based on preservation
  // Lower guidance = more preservation, higher = more stylization
  const guidance = 3.5 + (1 - preservationStrength) * 4 // Range: 3.5-7.5

  return createFLUXWorkflow(imagePath, {
    model: "flux1-schnell-fp8.safetensors", // Use schnell fp8 version (we have this one)
    prompt: stylePrompts[style],
    negative_prompt: negativePrompts[style],
    guidance: guidance,
    steps: 4, // FLUX schnell is optimized for 4 steps
    seed: Math.floor(Math.random() * 1000000)
  })
}