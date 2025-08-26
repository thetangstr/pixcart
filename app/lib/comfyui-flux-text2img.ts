/**
 * Simple FLUX text-to-image workflow (no image input)
 * This is for testing FLUX model functionality
 */

export function createFLUXText2ImgWorkflow(
  prompt: string,
  width: number = 1024,
  height: number = 1024,
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
        "width": width,
        "height": height,
        "batch_size": 1
      },
      "class_type": "EmptySD3LatentImage",
      "_meta": {
        "title": "Empty Latent"
      }
    },
    "4": {
      "inputs": {
        "clip": ["2", 0],
        "width": width,
        "height": height,
        "crop_w": 0,
        "crop_h": 0,
        "target_width": width,
        "target_height": height,
        "text_g": prompt,
        "text_l": prompt
      },
      "class_type": "CLIPTextEncodeFlux",
      "_meta": {
        "title": "FLUX Text Encode"
      }
    },
    "5": {
      "inputs": {
        "model": ["1", 0],
        "conditioning": ["4", 0]
      },
      "class_type": "BasicGuider",
      "_meta": {
        "title": "Guider"
      }
    },
    "6": {
      "inputs": {
        "noise_seed": seed
      },
      "class_type": "RandomNoise",
      "_meta": {
        "title": "Random Noise"
      }
    },
    "7": {
      "inputs": {
        "sampler_name": "euler"
      },
      "class_type": "KSamplerSelect",
      "_meta": {
        "title": "Sampler"
      }
    },
    "8": {
      "inputs": {
        "scheduler": "simple",
        "steps": steps,
        "denoise": 1.0,
        "model": ["1", 0]
      },
      "class_type": "BasicScheduler",
      "_meta": {
        "title": "Scheduler"
      }
    },
    "9": {
      "inputs": {
        "noise": ["6", 0],
        "guider": ["5", 0],
        "sampler": ["7", 0],
        "sigmas": ["8", 0],
        "latent_image": ["3", 0]
      },
      "class_type": "SamplerCustomAdvanced",
      "_meta": {
        "title": "Sample"
      }
    },
    "10": {
      "inputs": {
        "samples": ["9", 0],
        "vae": ["1", 2]
      },
      "class_type": "VAEDecode",
      "_meta": {
        "title": "VAE Decode"
      }
    },
    "11": {
      "inputs": {
        "filename_prefix": "FLUX_generated",
        "images": ["10", 0]
      },
      "class_type": "SaveImage",
      "_meta": {
        "title": "Save Image"
      }
    }
  }
}