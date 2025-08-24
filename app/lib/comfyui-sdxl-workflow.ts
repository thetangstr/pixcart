/**
 * SDXL workflow for ComfyUI
 * Uses the SDXL models available locally
 * SDXL model is now downloaded and ready to use!
 */

export function createSDXLWorkflow(
  imagePath: string,
  prompt: string,
  negativePrompt: string = "photograph, photo, realistic",
  denoise: number = 0.5,
  steps: number = 30
) {
  const seed = Math.floor(Math.random() * 1000000)
  
  return {
    "1": {
      "inputs": {
        "ckpt_name": "sd_xl_base_1.0_0.9vae.safetensors"  // Now available!
      },
      "class_type": "CheckpointLoaderSimple",
      "_meta": {
        "title": "Load SDXL Checkpoint"
      }
    },
    "2": {
      "inputs": {
        "text": prompt,
        "clip": ["1", 1]
      },
      "class_type": "CLIPTextEncode",
      "_meta": {
        "title": "Positive Prompt"
      }
    },
    "3": {
      "inputs": {
        "text": negativePrompt,
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
        "cfg": 7.5,
        "sampler_name": "dpmpp_2m",
        "scheduler": "karras",
        "denoise": denoise,
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
        "filename_prefix": "SDXL_oil_painting",
        "images": ["7", 0]
      },
      "class_type": "SaveImage",
      "_meta": {
        "title": "Save Image"
      }
    }
  }
}

/**
 * Create SDXL oil painting workflow with style presets
 */
export function createSDXLOilPaintingWorkflow(
  imagePath: string,
  style: 'classic' | 'impressionist' | 'vangogh' | 'modern' = 'classic',
  preservationStrength: number = 0.7
) {
  const stylePrompts = {
    classic: "masterpiece, best quality, oil painting on canvas, classical painting style, Rembrandt lighting, baroque art, dramatic chiaroscuro, thick impasto texture, visible brushstrokes, museum quality artwork",
    impressionist: "masterpiece, impressionist oil painting, Claude Monet style, soft atmospheric light, broken color technique, plein air painting, thick paint application, French impressionism, visible brushwork",
    vangogh: "masterpiece, oil painting by Vincent Van Gogh, expressive brushstrokes, swirling paint texture, post-impressionist style, vibrant colors, heavy impasto technique, dynamic composition",
    modern: "masterpiece, contemporary oil painting, bold abstract brushstrokes, palette knife texture, modern art style, expressive color, dynamic composition, thick paint layers"
  }

  const negativePrompts = {
    classic: "photograph, photo, digital art, 3d render, smooth surface, flat colors, anime, cartoon",
    impressionist: "photograph, sharp edges, photorealistic, smooth, digital, hyperrealistic",
    vangogh: "photograph, thin paint, minimalist, flat, digital art, smooth texture",
    modern: "photograph, classical, old style, smooth, photorealistic, digital art"
  }

  // Higher preservation = lower denoise
  const denoise = 0.3 + (1.0 - preservationStrength) * 0.4 // Range: 0.3-0.7
  
  return createSDXLWorkflow(
    imagePath,
    stylePrompts[style],
    negativePrompts[style],
    denoise,
    30 // SDXL needs more steps
  )
}