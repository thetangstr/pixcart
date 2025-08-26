import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs/promises'
import path from 'path'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { image } = body
    
    if (!image) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 })
    }
    
    // Extract base64 data
    const base64Data = image.includes(',') ? image.split(',')[1] : image
    const buffer = Buffer.from(base64Data, 'base64')
    
    // Generate filename
    const filename = `upload_${Date.now()}.png`
    
    // ComfyUI input directory
    const comfyuiInput = '/Volumes/home/Projects_Hosted/pixcart_v2/ComfyUI/input'
    const filePath = path.join(comfyuiInput, filename)
    
    // Ensure directory exists
    await fs.mkdir(comfyuiInput, { recursive: true })
    
    // Write file directly to ComfyUI input folder
    await fs.writeFile(filePath, buffer)
    
    console.log(`Image saved to ComfyUI input: ${filename}`)
    
    return NextResponse.json({
      success: true,
      filename,
      path: filePath
    })
    
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Upload failed'
    }, { status: 500 })
  }
}