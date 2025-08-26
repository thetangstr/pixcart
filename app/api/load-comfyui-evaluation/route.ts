import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

export async function GET(request: NextRequest) {
  try {
    // Look for ComfyUI evaluation dataset
    const evaluationFile = path.join(process.cwd(), 'comfyui_evaluation_results', 'comfyui_evaluation_dataset.json')
    
    try {
      const data = await fs.readFile(evaluationFile, 'utf-8')
      const evaluationData = JSON.parse(data)
      
      return NextResponse.json({
        success: true,
        tasks: evaluationData.tasks,
        experiment_info: evaluationData.experiment_info
      })
    } catch (fileError) {
      // File doesn't exist, return empty dataset
      return NextResponse.json({
        success: false,
        error: 'ComfyUI evaluation dataset not found. Run the batch processing script first.',
        tasks: []
      }, { status: 404 })
    }
    
  } catch (error) {
    console.error('Error loading ComfyUI evaluation dataset:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to load evaluation dataset'
    }, { status: 500 })
  }
}