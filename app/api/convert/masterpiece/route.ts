import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

// Masterpiece prompt template for user conversions
const MASTERPIECE_STYLES = {
  classic: {
    name: "Classic Rembrandt",
    prompt: `(oil painting:1.5), (thick impasto:1.3), (visible brushstrokes:1.4), (canvas texture:1.2), masterpiece oil painting, professional portrait of beloved pet companion. Capture their essential personality as noble, dignified, and wise.
Lighting: Dramatic chiaroscuro lighting from a window on the left, casting deep shadows and golden highlights. The light creates a divine glow around the subject
Setting & Palette: Set against a dark mahogany background with subtle warm undertones. Limited palette of burnt umber, raw sienna, ivory black, and golden ochre. The overall atmosphere is timeless and contemplative
Artistic Style: Painted in the style of Rembrandt van Rijn. Feature precise, controlled brushwork with visible canvas texture, thick oil paint application. Layers of translucent glazes create depth. Rich impasto highlights catch the light`,
    negative: "photograph, digital art, 3d render, anime, cartoon, smooth, plastic"
  },
  impressionist: {
    name: "Impressionist Light", 
    prompt: `(oil painting:1.5), (thick impasto:1.3), (visible brushstrokes:1.4), (canvas texture:1.2), masterpiece oil painting, professional portrait of beloved pet companion. Capture their essential personality as graceful, serene, and contemplative.
Lighting: Soft, diffused natural light from above, as if filtered through garden leaves. Dappled shadows dance across the subject, creating movement and life
Setting & Palette: Set against a sun-drenched garden background with soft blues, lavenders, and pale greens. Limited palette of cerulean, violet, cadmium yellow, and viridian. The atmosphere is dreamy and ethereal
Artistic Style: Painted in the style of Claude Monet and John Singer Sargent. Feature broken color technique with visible, energetic brushstrokes, thick oil paint texture. Short, quick marks of pure color that blend optically`,
    negative: "photograph, digital art, 3d render, anime, cartoon, smooth, dark"
  },
  modern: {
    name: "Modern Expression",
    prompt: `(oil painting:1.5), (thick impasto:1.3), (visible brushstrokes:1.4), (canvas texture:1.2), masterpiece oil painting, professional portrait of beloved pet companion. Capture their essential personality as bold, spirited, and joyful.
Lighting: Bold, dramatic lighting from multiple sources creating strong color contrasts. Vibrant highlights against deep, colorful shadows
Setting & Palette: Set against an energetic background of swirling colors - deep blues, vibrant oranges, and emerald greens. Bold palette with pure, unmixed colors. The atmosphere is passionate and emotionally charged
Artistic Style: Painted in the style of Vincent van Gogh. Feature expressive, rhythmic brushwork with extremely thick impasto application, visible paint texture, rough canvas. Swirling, energetic strokes that convey emotion`,
    negative: "photograph, digital art, 3d render, anime, cartoon, smooth, muted"
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const style = formData.get('style') as string || 'classic'
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Convert file to base64
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const base64 = buffer.toString('base64')
    
    // Get masterpiece style
    const selectedStyle = MASTERPIECE_STYLES[style as keyof typeof MASTERPIECE_STYLES] || MASTERPIECE_STYLES.classic
    
    // Call SD API with masterpiece parameters
    const response = await fetch('http://localhost:7860/sdapi/v1/img2img', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        init_images: [`data:${file.type};base64,${base64}`],
        prompt: selectedStyle.prompt,
        negative_prompt: selectedStyle.negative,
        denoising_strength: 0.65,
        cfg_scale: 7.0,
        steps: 40,
        sampler_name: "DPM++ 2M SDE Karras",
        width: 512,
        height: 512,
        seed: -1,
        clip_skip: 2,
        controlnet_units: [{
          input_image: `data:${file.type};base64,${base64}`,
          module: "canny",
          model: "control_v11p_sd15_canny",
          weight: 0.45,
          guidance_start: 0,
          guidance_end: 1
        }]
      })
    })
    
    if (!response.ok) {
      throw new Error('Conversion failed')
    }
    
    const result = await response.json()
    const convertedImage = result.images[0]
    
    // Save to gallery
    const galleryDir = path.join(process.cwd(), 'public', 'gallery')
    await fs.mkdir(galleryDir, { recursive: true })
    
    const timestamp = Date.now()
    const originalPath = path.join(galleryDir, `${timestamp}_original.jpg`)
    const convertedPath = path.join(galleryDir, `${timestamp}_${style}.jpg`)
    
    await fs.writeFile(originalPath, buffer)
    await fs.writeFile(convertedPath, Buffer.from(convertedImage, 'base64'))
    
    // Create gallery entry
    const galleryEntry = {
      id: timestamp,
      style: selectedStyle.name,
      original: `/gallery/${timestamp}_original.jpg`,
      converted: `/gallery/${timestamp}_${style}.jpg`,
      timestamp: new Date().toISOString()
    }
    
    // Add to gallery index
    const galleryIndexPath = path.join(galleryDir, 'index.json')
    let galleryIndex = []
    try {
      const indexContent = await fs.readFile(galleryIndexPath, 'utf-8')
      galleryIndex = JSON.parse(indexContent)
    } catch {
      // File doesn't exist yet
    }
    
    galleryIndex.unshift(galleryEntry) // Add to beginning
    galleryIndex = galleryIndex.slice(0, 20) // Keep only last 20
    
    await fs.writeFile(galleryIndexPath, JSON.stringify(galleryIndex, null, 2))
    
    return NextResponse.json({
      success: true,
      image: convertedImage,
      style: selectedStyle.name,
      galleryEntry
    })
    
  } catch (error) {
    console.error('Conversion error:', error)
    return NextResponse.json(
      { error: 'Failed to convert image' },
      { status: 500 }
    )
  }
}