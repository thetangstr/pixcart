import fs from 'fs/promises'
import path from 'path'

const COMFYUI_URL = 'http://localhost:8188'

// Image generation prompts for showcase
const showcasePrompts = [
  {
    name: 'golden-retriever',
    prompt: 'professional photo of a golden retriever dog sitting in a sunny garden, happy expression, beautiful lighting, high quality, detailed fur, photorealistic',
    negative: 'painting, drawing, illustration, cartoon, anime, blurry, low quality',
    category: 'pet'
  },
  {
    name: 'elderly-woman',
    prompt: 'portrait photo of a kind elderly woman with silver hair, gentle smile, natural lighting, professional photography, high detail',
    negative: 'painting, drawing, young, cartoon, anime, blurry',
    category: 'portrait'
  },
  {
    name: 'mountain-landscape',
    prompt: 'beautiful mountain landscape with lake, sunset lighting, dramatic clouds, professional landscape photography, high resolution',
    negative: 'painting, drawing, people, animals, cartoon, anime',
    category: 'landscape'
  },
  {
    name: 'tabby-cat',
    prompt: 'close-up photo of an orange tabby cat with green eyes, sitting on windowsill, soft natural lighting, detailed whiskers and fur',
    negative: 'painting, drawing, cartoon, anime, multiple cats, blurry',
    category: 'pet'
  },
  {
    name: 'child-portrait',
    prompt: 'happy child playing in autumn leaves, candid photo, warm colors, professional photography, natural expression',
    negative: 'painting, drawing, sad, cartoon, anime, adult',
    category: 'portrait'
  }
]

async function generateWithComfyUI(prompt: string, negative: string, filename: string) {
  const workflow = {
    "3": {
      "class_type": "KSampler",
      "inputs": {
        "cfg": 7,
        "denoise": 1,
        "latent_image": ["5", 0],
        "model": ["4", 0],
        "negative": ["7", 0],
        "positive": ["6", 0],
        "sampler_name": "euler",
        "scheduler": "normal",
        "seed": Math.floor(Math.random() * 1000000),
        "steps": 20
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
        "height": 1024,
        "width": 1024
      }
    },
    "6": {
      "class_type": "CLIPTextEncode",
      "inputs": {
        "clip": ["4", 1],
        "text": prompt
      }
    },
    "7": {
      "class_type": "CLIPTextEncode",
      "inputs": {
        "clip": ["4", 1],
        "text": negative
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
        "filename_prefix": filename,
        "images": ["8", 0]
      }
    }
  }

  try {
    // Submit workflow
    const response = await fetch(`${COMFYUI_URL}/api/prompt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: workflow })
    })
    
    const data = await response.json()
    console.log(`✅ Generated: ${filename}`)
    return data.prompt_id
  } catch (error) {
    console.error(`❌ Failed to generate ${filename}:`, error)
    return null
  }
}

async function convertToOilPainting(imagePath: string, outputName: string) {
  try {
    // Read the generated image
    const imageBuffer = await fs.readFile(imagePath)
    const base64Image = imageBuffer.toString('base64')
    
    // Call our production oil painting API
    const response = await fetch('http://localhost:5174/api/convert-production-optimized', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image: `data:image/png;base64,${base64Image}`,
        style: 'classic'
      })
    })
    
    if (!response.ok) {
      throw new Error(`API returned ${response.status}`)
    }
    
    const result = await response.json()
    
    // Save the oil painting
    const outputPath = path.join(
      process.cwd(),
      'public',
      'showcase',
      `${outputName}-oil.jpg`
    )
    
    // Extract base64 data
    const oilPaintingData = result.image.replace(/^data:image\/\w+;base64,/, '')
    await fs.writeFile(outputPath, Buffer.from(oilPaintingData, 'base64'))
    
    console.log(`🎨 Converted to oil painting: ${outputName}`)
    return outputPath
  } catch (error) {
    console.error(`❌ Failed to convert ${outputName}:`, error)
    return null
  }
}

async function wait(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function main() {
  console.log('🚀 Starting showcase image generation...')
  
  // Create showcase directory
  const showcaseDir = path.join(process.cwd(), 'public', 'showcase')
  await fs.mkdir(showcaseDir, { recursive: true })
  
  // Generate images
  for (const promptData of showcasePrompts) {
    console.log(`\n📸 Generating: ${promptData.name}`)
    
    // Generate with txt2img
    const promptId = await generateWithComfyUI(
      promptData.prompt,
      promptData.negative,
      promptData.name
    )
    
    if (promptId) {
      // Wait for generation to complete
      await wait(10000) // Wait 10 seconds for generation
      
      // Find the generated image in ComfyUI output
      const comfyOutputDir = '/Volumes/home/Projects_Hosted/pixcart_v2/ComfyUI/output'
      const files = await fs.readdir(comfyOutputDir)
      const generatedFile = files
        .filter(f => f.includes(promptData.name))
        .sort()
        .pop() // Get the most recent
      
      if (generatedFile) {
        const sourcePath = path.join(comfyOutputDir, generatedFile)
        
        // Copy original to showcase
        const originalPath = path.join(showcaseDir, `${promptData.name}-original.jpg`)
        await fs.copyFile(sourcePath, originalPath)
        console.log(`📁 Saved original: ${promptData.name}`)
        
        // Convert to oil painting
        await convertToOilPainting(sourcePath, promptData.name)
        
        // Wait between conversions to not overload
        await wait(5000)
      }
    }
  }
  
  console.log('\n✨ Showcase generation complete!')
  console.log('📁 Images saved to: public/showcase/')
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error)
}

export { showcasePrompts, generateWithComfyUI, convertToOilPainting }