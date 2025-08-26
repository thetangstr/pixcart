import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { model } = await request.json()
    
    // Check if Replicate API key is configured
    const apiKey = process.env.REPLICATE_API_TOKEN
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Replicate API not configured' },
        { status: 503 }
      )
    }
    
    // Try to get model info from Replicate
    const response = await fetch(`https://api.replicate.com/v1/models/${model}`, {
      headers: {
        'Authorization': `Token ${apiKey}`,
        'Content-Type': 'application/json'
      }
    })
    
    if (response.ok) {
      const data = await response.json()
      return NextResponse.json({
        status: 'online',
        version: data.latest_version?.id || 'unknown',
        description: data.description,
        name: data.name
      })
    } else if (response.status === 404) {
      return NextResponse.json(
        { error: 'Model not found' },
        { status: 404 }
      )
    } else {
      return NextResponse.json(
        { error: 'Failed to check model status' },
        { status: response.status }
      )
    }
  } catch (error) {
    console.error('Error checking Replicate model:', error)
    return NextResponse.json(
      { error: 'Failed to connect to Replicate' },
      { status: 500 }
    )
  }
}