import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs/promises'
import path from 'path'

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { taskId, scores } = body
    
    // Save to evaluation results file
    const resultsFile = path.join(process.cwd(), 'evaluation_dataset', 'human_evaluation_results.jsonl')
    
    const result = {
      taskId,
      ...scores,
      timestamp: new Date().toISOString(),
      evaluator: 'human'
    }
    
    await fs.appendFile(resultsFile, JSON.stringify(result) + '\n')
    
    // Also update the task file if it exists
    try {
      const taskFile = path.join(process.cwd(), 'evaluation_dataset', 'real_tasks', `task_${String(taskId).padStart(3, '0')}.json`)
      const content = await fs.readFile(taskFile, 'utf-8')
      const task = JSON.parse(content)
      
      task.human_scores = scores
      task.evaluated = true
      
      await fs.writeFile(taskFile, JSON.stringify(task, null, 2))
    } catch (e) {
      // Task file update is optional
      console.log('Could not update task file:', e)
    }
    
    return NextResponse.json({ success: true })
    
  } catch (error) {
    console.error('Error saving human score:', error)
    return NextResponse.json(
      { error: 'Failed to save score' },
      { status: 500 }
    )
  }
}