import fs from 'fs/promises'
import path from 'path'
import sharp from 'sharp'

const COMFYUI_URL = 'http://localhost:8188'

// Style icon configurations
const styleIcons = [
  {
    id: 'classic',
    name: 'classic-portrait',
    prompt: 'elegant portrait of a golden retriever dog, professional studio lighting, neutral background, photorealistic, high quality',
    negative: 'painting, drawing, cartoon, anime, blurry, text, watermark',
    style: 'classic oil painting, thick brushstrokes, traditional portrait style'
  },
  {
    id: 'vangogh',
    name: 'vangogh-style',
    prompt: 'field of sunflowers under swirling sky, vibrant colors, dramatic landscape',
    negative: 'portrait, people, animals, text, watermark, modern, photo',
    style: 'van gogh style oil painting, swirling brushstrokes, post-impressionist, vibrant yellows and blues'
  },
  {
    id: 'monet',
    name: 'monet-style',
    prompt: 'serene water lily pond with soft reflections, peaceful garden scene',
    negative: 'portrait, people, animals, text, watermark, sharp details',
    style: 'monet impressionist oil painting, soft brushstrokes, pastel colors, dreamy atmosphere'
  },
  {
    id: 'modern',
    name: 'modern-abstract',
    prompt: 'colorful abstract shapes and patterns, bold geometric design',
    negative: 'realistic, portrait, photographic, text, watermark',
    style: 'modern abstract oil painting, bold colors, geometric shapes, contemporary art'
  }
]

async function generateStyleIcon(config: typeof styleIcons[0]) {
  const workflow = {
    "3": {
      "class_type": "KSampler",
      "inputs": {
        "cfg": 9,
        "denoise": 0.85,
        "latent_image": ["5", 0],
        "model": ["4", 0],
        "negative": ["7", 0],
        "positive": ["6", 0],
        "sampler_name": "euler",
        "scheduler": "karras",
        "seed": Math.floor(Math.random() * 1000000),
        "steps": 30
      }
    },
    "4": {
      "class_type": "CheckpointLoaderSimple",
      "inputs": {
        "ckpt_name": "sdxl_base_1.0.safetensors"
      }
    },
    "5": {
      "class_type": "EmptyLatentImage",
      "inputs": {
        "batch_size": 1,
        "height": 512,
        "width": 512
      }
    },
    "6": {
      "class_type": "CLIPTextEncode",
      "inputs": {
        "clip": ["4", 1],
        "text": `${config.prompt}, ${config.style}`
      }
    },
    "7": {
      "class_type": "CLIPTextEncode",
      "inputs": {
        "clip": ["4", 1],
        "text": config.negative
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
        "filename_prefix": `style_icon_${config.name}`,
        "images": ["8", 0]
      }
    }
  }

  try {
    const response = await fetch(`${COMFYUI_URL}/api/prompt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: workflow })
    })
    
    const data = await response.json()
    console.log(`✅ Generated icon for ${config.name}`)
    return data.prompt_id
  } catch (error) {
    console.error(`❌ Failed to generate ${config.name}:`, error)
    return null
  }
}

async function processIconForWeb(inputPath: string, outputPath: string) {
  try {
    await sharp(inputPath)
      .resize(200, 200, {
        fit: 'cover',
        position: 'center'
      })
      .jpeg({ quality: 85 })
      .toFile(outputPath)
    
    console.log(`📦 Processed icon: ${outputPath}`)
  } catch (error) {
    console.error('Failed to process icon:', error)
  }
}

async function wait(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function main() {
  console.log('🎨 Generating style icons...')
  
  // Create output directory
  const iconsDir = path.join(process.cwd(), 'public', 'style-icons')
  await fs.mkdir(iconsDir, { recursive: true })
  
  // Generate each style icon
  for (const icon of styleIcons) {
    console.log(`\n🖼️ Generating ${icon.name}...`)
    
    const promptId = await generateStyleIcon(icon)
    
    if (promptId) {
      // Wait for generation
      await wait(8000)
      
      // Find and process the generated image
      const comfyOutputDir = '/Volumes/home/Projects_Hosted/pixcart_v2/ComfyUI/output'
      try {
        const files = await fs.readdir(comfyOutputDir)
        const generatedFile = files
          .filter(f => f.includes(`style_icon_${icon.name}`))
          .sort()
          .pop()
        
        if (generatedFile) {
          const sourcePath = path.join(comfyOutputDir, generatedFile)
          const outputPath = path.join(iconsDir, `${icon.id}.jpg`)
          
          await processIconForWeb(sourcePath, outputPath)
        }
      } catch (error) {
        console.error(`Failed to process ${icon.name}:`, error)
      }
    }
    
    // Delay between generations
    await wait(2000)
  }
  
  console.log('\n✨ Style icons generation complete!')
  console.log('📁 Icons saved to: public/style-icons/')
  
  // Generate placeholder icons as fallback
  console.log('\n📝 Creating placeholder icons for immediate use...')
  
  // For now, we'll use solid color placeholders
  const placeholderColors = {
    classic: '#8B4513', // Brown
    vangogh: '#FFD700', // Gold
    monet: '#87CEEB',   // Sky blue
    modern: '#FF6B6B'   // Coral
  }
  
  for (const [style, color] of Object.entries(placeholderColors)) {
    const svg = `
      <svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
        <rect width="200" height="200" fill="${color}"/>
        <rect x="20" y="20" width="160" height="160" fill="${color}" opacity="0.8"/>
        <circle cx="100" cy="100" r="60" fill="white" opacity="0.2"/>
      </svg>
    `
    
    const outputPath = path.join(iconsDir, `${style}-placeholder.svg`)
    await fs.writeFile(outputPath, svg)
  }
  
  console.log('✅ Placeholder icons created')
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error)
}

export { styleIcons, generateStyleIcon }