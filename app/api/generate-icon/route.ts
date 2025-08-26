import { NextRequest, NextResponse } from 'next/server'

const A1111_BASE_URL = process.env.A1111_BASE_URL || 'http://localhost:7860'

interface Txt2ImgRequest {
  prompt: string
  negative_prompt: string
  width: number
  height: number
  steps: number
  cfg_scale: number
  sampler_name: string
  seed: number
}

export async function POST(request: NextRequest) {
  try {
    const { style } = await request.json()
    
    let prompt = ''
    let seed = -1
    
    // Define icon prompts for each style
    switch(style) {
      case 'classic_portrait':
        prompt = '((Renaissance oil painting style icon)), elegant portrait silhouette, ((golden brown tones)), classical art museum style, ((visible brushstrokes)), refined oil paint texture, old master technique, ((simple iconic design)), warm earthy colors, chiaroscuro lighting effect, square format icon'
        seed = 42
        break
      case 'thick_textured':
        prompt = '((Van Gogh style icon)), ((bold yellow sunflower)), ((thick impasto paint texture)), vibrant blue swirling background, ((heavy 3D brushstrokes)), expressive oil painting, ((dramatic paint ridges)), post-impressionist style icon, high contrast, dynamic energy'
        seed = 123
        break
      case 'soft_impressionist':
        prompt = '((Monet style icon)), ((soft water lily)), pastel pink and lavender colors, ((gentle brushstrokes)), impressionist oil painting, dreamy soft focus, ((dappled light effect)), romantic atmosphere, delicate paint texture, ethereal quality'
        seed = 789
        break
      default:
        return NextResponse.json({ error: 'Invalid style' }, { status: 400 })
    }
    
    const txt2imgPayload: Txt2ImgRequest = {
      prompt: prompt + ', high quality, masterpiece, icon, simple, clear, recognizable',
      negative_prompt: 'text, words, letters, complex, busy, cluttered, photorealistic, photograph, 3d render, low quality, blurry',
      width: 256,
      height: 256,
      steps: 20,
      cfg_scale: 7,
      sampler_name: 'DPM++ 2M Karras',
      seed: seed
    }
    
    const response = await fetch(`${A1111_BASE_URL}/sdapi/v1/txt2img`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(txt2imgPayload),
    })
    
    if (!response.ok) {
      throw new Error('Failed to generate icon')
    }
    
    const result = await response.json()
    
    return NextResponse.json({
      image: result.images[0],
      style: style
    })
    
  } catch (error) {
    console.error('Icon generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate icon' },
      { status: 500 }
    )
  }
}