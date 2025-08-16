import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs/promises'
import path from 'path'

export async function GET(
  request: NextRequest,
  { params }: { params: { taskId: string, type: string } }
) {
  try {
    const { taskId, type } = params
    const taskFile = path.join(
      process.cwd(), 
      'evaluation_dataset', 
      'tasks', 
      `task_${taskId.padStart(3, '0')}.json`
    )
    
    // Read task file
    const content = await fs.readFile(taskFile, 'utf-8')
    const task = JSON.parse(content)
    
    // Get the appropriate image
    const imageData = type === 'original' 
      ? task.original_image 
      : task.converted_image
    
    if (!imageData) {
      return new NextResponse('Image not found', { status: 404 })
    }
    
    // Extract base64 data
    const base64Data = imageData.split(',')[1] || imageData
    const buffer = Buffer.from(base64Data, 'base64')
    
    // Return image with proper headers
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'public, max-age=3600'
      }
    })
    
  } catch (error) {
    console.error('Error serving image:', error)
    return new NextResponse('Image not found', { status: 404 })
  }
}