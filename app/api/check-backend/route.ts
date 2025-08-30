import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const type = searchParams.get('type')

  if (!type || !['a1111', 'comfyui'].includes(type)) {
    return NextResponse.json({ error: 'Invalid backend type' }, { status: 400 })
  }

  try {
    let url: string
    let expectedResponse: any

    if (type === 'a1111') {
      url = process.env.A1111_BASE_URL || 'http://localhost:7860'
      // Check A1111 API
      const response = await fetch(`${url}/sdapi/v1/progress`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000) // 5 second timeout
      })
      
      if (!response.ok) {
        throw new Error(`A1111 API not available: ${response.status}`)
      }
      
      expectedResponse = await response.json()
    } else if (type === 'comfyui') {
      url = process.env.COMFYUI_BASE_URL || 'http://localhost:8188'
      // Check ComfyUI API
      const response = await fetch(`${url}/system_stats`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000) // 5 second timeout
      })
      
      if (!response.ok) {
        throw new Error(`ComfyUI API not available: ${response.status}`)
      }
      
      expectedResponse = await response.json()
    }

    return NextResponse.json({ 
      available: true, 
      backend: type, 
      url,
      info: expectedResponse 
    })

  } catch (error) {
    console.error(`Backend ${type} check failed:`, error)
    return NextResponse.json({ 
      available: false, 
      backend: type, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 503 })
  }
}