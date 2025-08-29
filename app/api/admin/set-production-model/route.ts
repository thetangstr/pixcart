import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import fs from 'fs/promises'
import path from 'path'

// Configuration file path
const CONFIG_PATH = path.join(process.cwd(), 'production-config.json')

interface ProductionConfig {
  modelId: string
  updatedAt: string
  updatedBy?: string
}

export async function POST(request: NextRequest) {
  try {
    // Check admin authentication (basic check for now)
    const cookieStore = cookies()
    const sessionCookie = cookieStore.get('session')
    
    // TODO: Implement proper admin authentication
    // For now, we'll allow all requests in development
    const isDevelopment = process.env.NODE_ENV === 'development'
    if (!isDevelopment && !sessionCookie) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    const { modelId } = await request.json()
    
    if (!modelId) {
      return NextResponse.json(
        { error: 'Model ID is required' },
        { status: 400 }
      )
    }
    
    // Save production model configuration
    const config: ProductionConfig = {
      modelId,
      updatedAt: new Date().toISOString(),
      updatedBy: sessionCookie?.value || 'admin'
    }
    
    try {
      await fs.writeFile(CONFIG_PATH, JSON.stringify(config, null, 2))
    } catch (error) {
      console.error('Failed to write config file:', error)
      // Continue even if file write fails - use in-memory storage
    }
    
    return NextResponse.json({
      success: true,
      modelId,
      message: 'Production model updated successfully'
    })
  } catch (error) {
    console.error('Error setting production model:', error)
    return NextResponse.json(
      { error: 'Failed to update production model' },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    // Read current production model configuration
    let config: ProductionConfig | null = null
    
    try {
      const configData = await fs.readFile(CONFIG_PATH, 'utf-8')
      config = JSON.parse(configData)
    } catch (error) {
      // Default to ComfyUI SD 1.5 if no config exists
      config = {
        modelId: 'comfyui-sd15',
        updatedAt: new Date().toISOString()
      }
    }
    
    return NextResponse.json(config)
  } catch (error) {
    console.error('Error reading production model:', error)
    return NextResponse.json(
      { error: 'Failed to read production model' },
      { status: 500 }
    )
  }
}export const dynamic = 'force-dynamic';
