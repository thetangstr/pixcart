import { NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

export async function POST(request: Request) {
  try {
    const { taskId, style, scores, feedback } = await request.json()
    
    // Create scores directory if it doesn't exist
    const scoresDir = path.join(process.cwd(), 'evaluation_dataset', 'scores')
    await fs.mkdir(scoresDir, { recursive: true })
    
    // Load existing scores for this task or create new
    const scoresFile = path.join(scoresDir, `task_${taskId}_scores.json`)
    let existingScores = {}
    
    try {
      const content = await fs.readFile(scoresFile, 'utf-8')
      existingScores = JSON.parse(content)
    } catch {
      // File doesn't exist yet
    }
    
    // Update scores for this style
    existingScores = {
      ...existingScores,
      [style]: {
        ...scores,
        feedback: feedback || ''
      },
      lastUpdated: new Date().toISOString()
    }
    
    // Save updated scores
    await fs.writeFile(scoresFile, JSON.stringify(existingScores, null, 2))
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error saving score:', error)
    return NextResponse.json({ error: 'Failed to save score' }, { status: 500 })
  }
}