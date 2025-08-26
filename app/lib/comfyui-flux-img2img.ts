/**
 * FLUX Image-to-Image workflow for oil painting conversion
 * Uses built-in VAE from FLUX model
 */

export function createFLUXImg2ImgWorkflow(
  imagePath: string,
  prompt: string,
  denoise: number = 0.75,
  steps: number = 4
) {
  const seed = Math.floor(Math.random() * 1000000)
  
  return {
    "1": {
      "inputs": {
        "unet_name": "flux1-schnell-fp8.safetensors",
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
        "image": imagePath,
        "upload": "image"
      },
      "class_type": "LoadImage",
      "_meta": {
        "title": "Load Image"
      }
    },
    "4": {
      "inputs": {
        "pixels": ["3", 0],
        "vae": ["1", 2]
      },
      "class_type": "VAEEncode",
      "_meta": {
        "title": "VAE Encode"
      }
    },
    "5": {
      "inputs": {
        "clip": ["2", 0],
        "width": 1024,
        "height": 1024,
        "crop_w": 0,
        "crop_h": 0,
        "target_width": 1024,
        "target_height": 1024,
        "text_g": prompt,
        "text_l": prompt
      },
      "class_type": "CLIPTextEncodeFlux",
      "_meta": {
        "title": "FLUX Text Encode"
      }
    },
    "6": {
      "inputs": {
        "model": ["1", 0],
        "conditioning": ["5", 0]
      },
      "class_type": "BasicGuider",
      "_meta": {
        "title": "Guider"
      }
    },
    "7": {
      "inputs": {
        "noise_seed": seed
      },
      "class_type": "RandomNoise",
      "_meta": {
        "title": "Random Noise"
      }
    },
    "8": {
      "inputs": {
        "sampler_name": "euler"
      },
      "class_type": "KSamplerSelect",
      "_meta": {
        "title": "Sampler"
      }
    },
    "9": {
      "inputs": {
        "scheduler": "simple",
        "steps": steps,
        "denoise": denoise,
        "model": ["1", 0]
      },
      "class_type": "BasicScheduler",
      "_meta": {
        "title": "Scheduler"
      }
    },
    "10": {
      "inputs": {
        "noise": ["7", 0],
        "guider": ["6", 0],
        "sampler": ["8", 0],
        "sigmas": ["9", 0],
        "latent_image": ["4", 0]
      },
      "class_type": "SamplerCustomAdvanced",
      "_meta": {
        "title": "Sample"
      }
    },
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
    "12": {
      "inputs": {
        "filename_prefix": "FLUX_oil_painting",
        "images": ["11", 0]
      },
      "class_type": "SaveImage",
      "_meta": {
        "title": "Save Image"
      }
    }
  }
}

/**
 * Create FLUX oil painting workflow with style presets
 */
export function createFLUXOilPaintingWorkflow(
  imagePath: string,
  style: 'classic' | 'impressionist' | 'vangogh' | 'modern' = 'classic',
  preservationStrength: number = 0.7
) {
  const stylePrompts = {
    classic: "oil painting, classical style, Rembrandt lighting, baroque, impasto texture, visible brushstrokes",
    impressionist: "impressionist oil painting, Monet style, soft light, thick paint, French impressionism",
    vangogh: "Van Gogh style oil painting, swirling brushstrokes, expressive, vibrant colors, thick paint",
    modern: "modern oil painting, bold brushstrokes, palette knife, contemporary art, expressive"
  }

  // Higher preservation = lower denoise
  const denoise = 1.0 - preservationStrength
  
  return createFLUXImg2ImgWorkflow(
    imagePath,
    stylePrompts[style],
    denoise,
    4 // FLUX schnell works best with 4 steps
  )
}