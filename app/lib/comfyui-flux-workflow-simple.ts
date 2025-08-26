/**
 * Simplified FLUX Workflow for ComfyUI
 * Based on standard FLUX setup
 */

export function createSimpleFLUXWorkflow(
  imagePath: string,
  prompt: string,
  steps: number = 20,
  guidance: number = 3.5
) {
  const seed = Math.floor(Math.random() * 1000000)
  
  return {
    "1": {
      "inputs": {
        "ckpt_name": "flux1-schnell-fp8.safetensors"
      },
      "class_type": "CheckpointLoaderSimple",
      "_meta": {
        "title": "Load FLUX Checkpoint"
      }
    },
    "2": {
      "inputs": {
        "text": prompt,
        "clip": ["1", 1]
      },
      "class_type": "CLIPTextEncode",
      "_meta": {
        "title": "CLIP Text Encode"
      }
    },
    "3": {
      "inputs": {
        "text": "blurry, bad quality, ugly",
        "clip": ["1", 1]
      },
      "class_type": "CLIPTextEncode",
      "_meta": {
        "title": "Negative Prompt"
      }
    },
    "4": {
      "inputs": {
        "image": imagePath,
        "upload": "image"
      },
      "class_type": "LoadImage",
      "_meta": {
        "title": "Load Image"
      }
    },
    "5": {
      "inputs": {
        "pixels": ["4", 0],
        "vae": ["1", 2]
      },
      "class_type": "VAEEncode",
      "_meta": {
        "title": "VAE Encode"
      }
    },
    "6": {
      "inputs": {
        "seed": seed,
        "steps": steps,
        "cfg": guidance,
        "sampler_name": "euler",
        "scheduler": "normal",
        "denoise": 1.0,
        "model": ["1", 0],
        "positive": ["2", 0],
        "negative": ["3", 0],
        "latent_image": ["5", 0]
      },
      "class_type": "KSampler",
      "_meta": {
        "title": "KSampler"
      }
    },
    "7": {
      "inputs": {
        "samples": ["6", 0],
        "vae": ["1", 2]
      },
      "class_type": "VAEDecode",
      "_meta": {
        "title": "VAE Decode"
      }
    },
    "8": {
      "inputs": {
        "filename_prefix": "FLUX_oil",
        "images": ["7", 0]
      },
      "class_type": "SaveImage",
      "_meta": {
        "title": "Save Image"
      }
    }
  }
}