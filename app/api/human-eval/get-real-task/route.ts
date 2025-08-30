import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs/promises'
import path from 'path'

export const dynamic = 'force-dynamic';

// Get real task from filesystem
export async function GET(request: NextRequest) {
  try {
    const tasksDir = path.join(process.cwd(), 'evaluation_dataset', 'tasks')
    
    // Check if directory exists
    try {
      await fs.access(tasksDir)
    } catch {
      // No tasks yet, return placeholder
      return NextResponse.json({
        task: null,
        stats: {
          evaluated: 0,
          pending: 0,
          avgPreservation: 0,
          avgStyle: 0,
          avgOverall: 0
        }
      })
    }
    
    // Read all task files
    const files = await fs.readdir(tasksDir)
    const taskFiles = files.filter(f => f.endsWith('.json'))
    
    let pending = 0
    let evaluated = 0
    let totalPreservation = 0
    let totalStyle = 0
    let totalOverall = 0
    let nextTask = null
    
    // Find first unevaluated task
    for (const file of taskFiles) {
      const content = await fs.readFile(path.join(tasksDir, file), 'utf-8')
      const task = JSON.parse(content)
      
      if (task.evaluated) {
        evaluated++
        if (task.scores) {
          totalPreservation += task.scores.preservation || 0
          totalStyle += task.scores.style || 0
          totalOverall += task.scores.overall || 0
        }
      } else {
        pending++
        if (!nextTask) {
          nextTask = task
        }
      }
    }
    
    const stats = {
      evaluated,
      pending,
      avgPreservation: evaluated > 0 ? totalPreservation / evaluated : 0,
      avgStyle: evaluated > 0 ? totalStyle / evaluated : 0,
      avgOverall: evaluated > 0 ? totalOverall / evaluated : 0
    }
    
    return NextResponse.json({
      task: nextTask,
      stats
    })
    
  } catch (error) {
    console.error('Error getting task:', error)
    return NextResponse.json(
      { error: 'Failed to get task' },
      { status: 500 }
    )
  }
}

// Save evaluation scores
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { taskId, preservation, style, overall, comments } = body
    
    const tasksDir = path.join(process.cwd(), 'evaluation_dataset', 'tasks')
    const taskFile = path.join(tasksDir, `task_${String(taskId).padStart(3, '0')}.json`)
    
    // Read existing task
    const content = await fs.readFile(taskFile, 'utf-8')
    const task = JSON.parse(content)
    
    // Update with scores
    task.evaluated = true
    task.scores = {
      preservation,
      style,
      overall,
      comments,
      timestamp: new Date().toISOString()
    }
    
    // Save back
    await fs.writeFile(taskFile, JSON.stringify(task, null, 2))
    
    // Log to evaluation results
    const resultsFile = path.join(process.cwd(), 'evaluation_dataset', 'evaluation_results.jsonl')
    const result = {
      taskId,
      category: task.category,
      preservation,
      style,
      overall,
      comments,
      parameters: task.parameters,
      timestamp: new Date().toISOString()
    }
    
    await fs.appendFile(resultsFile, JSON.stringify(result) + '\n')
    
    return NextResponse.json({
      success: true,
      message: 'Evaluation saved'
    })
    
  } catch (error) {
    console.error('Error saving evaluation:', error)
    return NextResponse.json(
      { error: 'Failed to save evaluation' },
      { status: 500 }
    )
  }
}