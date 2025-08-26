import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { endpoint } = await request.json()
    
    if (!endpoint) {
      return NextResponse.json(
        { error: 'Endpoint is required' },
        { status: 400 }
      )
    }
    
    // Check ComfyUI system stats
    const response = await fetch(`${endpoint}/system_stats`)
    
    if (response.ok) {
      const data = await response.json()
      
      // Extract relevant info
      const deviceInfo = data.devices?.[0] || {}
      
      return NextResponse.json({
        status: 'online',
        comfyui_version: data.system?.comfyui_version,
        python_version: data.system?.python_version,
        pytorch_version: data.system?.pytorch_version,
        vram_total: deviceInfo.vram_total || 0,
        vram_free: deviceInfo.vram_free || 0,
        device_name: deviceInfo.name || 'unknown',
        device_type: deviceInfo.type || 'unknown'
      })
    } else {
      return NextResponse.json(
        { error: 'ComfyUI not responding' },
        { status: 503 }
      )
    }
  } catch (error) {
    console.error('Error checking ComfyUI:', error)
    return NextResponse.json(
      { error: 'Failed to connect to ComfyUI' },
      { status: 500 }
    )
  }
}