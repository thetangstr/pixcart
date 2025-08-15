import { NextRequest, NextResponse } from 'next/server'
import { oilPaintingStyles } from '@/app/lib/oilPaintingStyles'

// Simulated scoring function - in production this would use ML models
function evaluateImage(imageData: string, style: string): {
  subjectPreservation: number
  oilAuthenticity: number
  styleDistinctiveness: number
  consistency: number
  overall: number
} {
  // Base scores with some randomness to simulate real evaluation
  const baseScores = {
    'classic_portrait': { 
      subjectPreservation: 7.5 + Math.random() * 1.5,
      oilAuthenticity: 7.0 + Math.random() * 2,
      styleDistinctiveness: 7.5 + Math.random() * 1.5,
      consistency: 7.0 + Math.random() * 2
    },
    'thick_textured': {
      subjectPreservation: 6.5 + Math.random() * 2,
      oilAuthenticity: 8.0 + Math.random() * 1.5,
      styleDistinctiveness: 8.5 + Math.random() * 1,
      consistency: 7.5 + Math.random() * 1.5
    },
    'soft_impressionist': {
      subjectPreservation: 7.0 + Math.random() * 1.5,
      oilAuthenticity: 7.5 + Math.random() * 1.5,
      styleDistinctiveness: 7.0 + Math.random() * 2,
      consistency: 7.5 + Math.random() * 1.5
    }
  }

  const scores = baseScores[style as keyof typeof baseScores] || baseScores.classic_portrait
  
  // Calculate weighted overall score
  const overall = (
    scores.subjectPreservation * 0.30 +
    scores.oilAuthenticity * 0.30 +
    scores.styleDistinctiveness * 0.25 +
    scores.consistency * 0.15
  )

  return {
    subjectPreservation: Math.min(10, scores.subjectPreservation),
    oilAuthenticity: Math.min(10, scores.oilAuthenticity),
    styleDistinctiveness: Math.min(10, scores.styleDistinctiveness),
    consistency: Math.min(10, scores.consistency),
    overall: Math.min(10, overall)
  }
}

async function callSD(imageData: string, style: any) {
  try {
    // Remove data URL prefix if present
    const base64Image = imageData.replace(/^data:image\/\w+;base64,/, '')
    
    const payload = {
      init_images: [base64Image],
      prompt: style.positive_prompt,
      negative_prompt: style.negative_prompt,
      steps: style.steps,
      cfg_scale: style.cfg_scale,
      denoising_strength: style.denoising_strength,
      sampler_name: style.sampler,
      seed: -1,
      batch_size: 1,
      n_iter: 1,
      width: 512,
      height: 512,
      restore_faces: false
    }

    const response = await fetch('http://localhost:7860/sdapi/v1/img2img', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })

    if (response.ok) {
      const result = await response.json()
      return result.images[0]
    }
    
    return null
  } catch (error) {
    console.error('SD API error:', error)
    return null
  }
}

export async function POST(req: NextRequest) {
  try {
    const { iterationNumber, testImage } = await req.json()

    // Rotate through styles for testing
    const styleIndex = (iterationNumber - 1) % 3
    const style = oilPaintingStyles[styleIndex]
    
    // Call SD API (if image provided)
    let resultImage = null
    if (testImage) {
      resultImage = await callSD(testImage, style)
    }

    // Evaluate the result
    const scores = evaluateImage(resultImage || testImage, style.id)

    // Simulate iterative improvements by slightly tweaking parameters
    const iterationMultiplier = 1 + (iterationNumber * 0.01) // Gradual improvement
    const adjustedStyle = {
      ...style,
      cfg_scale: Math.min(10, style.cfg_scale * iterationMultiplier),
      denoising_strength: Math.min(0.7, style.denoising_strength + (iterationNumber * 0.01))
    }

    const result = {
      iteration: iterationNumber,
      timestamp: new Date().toISOString(),
      style: style.name,
      scores,
      prompt: {
        positive: style.positive_prompt,
        negative: style.negative_prompt,
        settings: {
          cfg_scale: adjustedStyle.cfg_scale,
          denoising_strength: adjustedStyle.denoising_strength,
          steps: style.steps,
          sampler: style.sampler
        }
      },
      image: resultImage ? `data:image/png;base64,${resultImage}` : undefined
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Test iteration error:', error)
    return NextResponse.json(
      { error: 'Failed to run test iteration' },
      { status: 500 }
    )
  }
}