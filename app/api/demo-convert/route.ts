import { NextRequest, NextResponse } from 'next/server'

// Demo API that simulates both A1111 and ComfyUI responses
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const image = formData.get('image') as File
    const styleId = formData.get('style') as string
    const backend = formData.get('backend') as string || 'comfyui'
    const compareMode = formData.get('compareMode') === 'true'

    if (!image || !styleId) {
      return NextResponse.json({ error: 'Missing image or style' }, { status: 400 })
    }

    // Convert image to base64 for demo
    const bytes = await image.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const originalBase64 = `data:image/png;base64,${buffer.toString('base64')}`

    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 2000))

    if (compareMode) {
      // Simulate both backends with slight differences
      return NextResponse.json({
        success: true,
        compareMode: true,
        results: {
          a1111: {
            success: true,
            image: createDemoResult(originalBase64, 'a1111', styleId),
            error: null,
            processingTime: 3.2
          },
          comfyui: {
            success: true,
            image: createDemoResult(originalBase64, 'comfyui', styleId),
            error: null,
            processingTime: 2.1
          }
        }
      })
    } else {
      // Single backend result
      return NextResponse.json({
        success: true,
        image: createDemoResult(originalBase64, backend, styleId),
        backend: backend,
        compareMode: false,
        processingTime: backend === 'comfyui' ? 2.1 : 3.2
      })
    }

  } catch (error) {
    console.error('Demo conversion error:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Demo conversion failed'
    }, { status: 500 })
  }
}

function createDemoResult(originalImage: string, backend: string, styleId: string): string {
  // In a real demo, you might apply actual image filters or use pre-generated results
  // For now, we'll return a modified version of the original with demo text overlay
  
  // This is a placeholder - in a real implementation you would:
  // 1. Apply CSS filters to simulate oil painting effects
  // 2. Use pre-generated demo images
  // 3. Use a lightweight image processing library
  
  return originalImage // Return original for now - could be enhanced with actual processing
}

// Helper function to create demo responses with different characteristics
function getDemoCharacteristics(backend: string, styleId: string) {
  const characteristics = {
    a1111: {
      quality: 'Stable, detailed results',
      speed: 'Moderate processing time',
      features: ['ControlNet support', 'Extensive extensions', 'Community models']
    },
    comfyui: {
      quality: 'Fast, efficient results',
      speed: 'Faster processing time',
      features: ['Node-based workflow', 'Memory efficient', 'Custom pipelines']
    }
  }

  return characteristics[backend as keyof typeof characteristics] || characteristics.comfyui
}