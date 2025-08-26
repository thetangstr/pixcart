import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs/promises'
import path from 'path'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { taskId, style, scores } = body
    
    // Save to evaluation results file
    const resultsDir = path.join(process.cwd(), 'evaluation_dataset', 'style_evaluations')
    await fs.mkdir(resultsDir, { recursive: true })
    
    const resultsFile = path.join(resultsDir, 'style_comparison_results.jsonl')
    
    const result = {
      taskId,
      style,
      scores,
      timestamp: new Date().toISOString(),
      evaluator: 'human'
    }
    
    await fs.appendFile(resultsFile, JSON.stringify(result) + '\n')
    
    return NextResponse.json({ success: true })
    
  } catch (error) {
    console.error('Error saving evaluation:', error)
    return NextResponse.json(
      { error: 'Failed to save evaluation' },
      { status: 500 }
    )
  }
}