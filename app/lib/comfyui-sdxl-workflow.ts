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
  steps: number = 30,
  cfg: number = 7.5,
  sampler: string = "dpmpp_2m"
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
        "cfg": cfg,
        "sampler_name": sampler,
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
    classic: "Masterpiece oil painting, Rembrandt style, baroque portrait, golden age dutch masters, dramatic chiaroscuro lighting, deep shadows and bright highlights, thick impasto oil paint texture, visible brushstrokes, warm earth tones, umber and sienna, rich glazing layers, museum quality, painterly realism, traditional oil on canvas, heavy paint application with palette knife texture, sophisticated classical composition",
    impressionist: "Claude Monet impressionist oil painting, loose broken brushstrokes, pure unmixed colors, plein air lighting, soft edges, atmospheric perspective, dappled light effects, visible canvas texture, spontaneous paint application, color vibration, optical color mixing, french impressionism, water lilies style, haystack series technique, garden at giverny palette, shimmering light reflections, feathery brushwork",
    vangogh: "Vincent van Gogh expressionist oil painting, thick swirling brushstrokes, intense vibrant colors, dynamic spiral patterns, heavy impasto texture, emotional intensity, starry night style, sunflower series palette, ultramarine blue and chrome yellow, aggressive paint application, visible canvas weave, post-impressionist technique, dramatic movement, turbulent energy, psychological depth through color",
    modern: "Contemporary abstract oil painting, bold geometric shapes, vibrant neon colors, palette knife texture, thick paint layers, mixed media elements, urban art influence, graffiti style energy, fluorescent pigments, high contrast, experimental techniques, dripping paint effects, collage elements, street art aesthetic, neo-expressionist approach, raw emotional power"
  }

  const negativePrompts = {
    classic: "photograph, photo, digital art, 3d render, smooth surface, flat colors, anime, cartoon, watercolor, airbrushed, photorealistic, plastic, blurry, low quality, digital painting",
    impressionist: "photograph, photo, digital art, 3d render, smooth surface, flat colors, anime, cartoon, watercolor, airbrushed, photorealistic, plastic, blurry, low quality, digital painting",
    vangogh: "photograph, photo, digital art, 3d render, smooth surface, flat colors, anime, cartoon, watercolor, airbrushed, photorealistic, plastic, blurry, low quality, digital painting",
    modern: "photograph, photo, digital art, 3d render, smooth surface, flat colors, anime, cartoon, watercolor, airbrushed, photorealistic, plastic, blurry, low quality, digital painting"
  }

  // Much stronger parameters for dramatic oil painting transformation
  const styleParams = {
    classic: { denoise: 0.65, steps: 60, cfg: 12.0, sampler: 'dpmpp_2m' },
    impressionist: { denoise: 0.70, steps: 55, cfg: 10.0, sampler: 'dpmpp_sde' },
    vangogh: { denoise: 0.75, steps: 65, cfg: 13.0, sampler: 'dpmpp_2m' },
    modern: { denoise: 0.80, steps: 50, cfg: 11.0, sampler: 'euler' }
  }
  
  const params = styleParams[style]
  // Less preservation adjustment for more dramatic transformation
  const adjustedDenoise = params.denoise - (preservationStrength * 0.15) // Minimal preservation impact
  
  return createSDXLWorkflow(
    imagePath,
    stylePrompts[style],
    negativePrompts[style],
    Math.max(adjustedDenoise, 0.5), // Keep minimum at 0.5 for strong transformation
    params.steps,
    params.cfg,
    params.sampler
  )
}