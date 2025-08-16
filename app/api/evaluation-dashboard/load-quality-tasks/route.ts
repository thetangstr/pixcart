import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs/promises'
import path from 'path'

export async function GET(request: NextRequest) {
  try {
    // Use quality tasks with 3 styles
    const tasksDir = path.join(process.cwd(), 'evaluation_dataset', 'quality_tasks')
    
    // Check if directory exists
    try {
      await fs.access(tasksDir)
    } catch {
      return NextResponse.json({ 
        tasks: [], 
        stats: { message: "Quality portraits are being processed..." }
      })
    }
    
    // Load all task files
    const taskFiles = await fs.readdir(tasksDir)
    const tasks = []
    
    for (const file of taskFiles) {
      if (file.endsWith('.json') && !file.includes('summary')) {
        const content = await fs.readFile(path.join(tasksDir, file), 'utf-8')
        const task = JSON.parse(content)
        
        // Format for dashboard
        const formattedTask = {
          id: task.id,
          category: task.category,
          original_image: task.original_image,
          styles: {
            classic: {
              image: task.conversions?.classic?.image || null,
              name: "Classic Oil Portrait",
              ai_score: null,
              human_score: null
            },
            impressionist: {
              image: task.conversions?.impressionist?.image || null,
              name: "Impressionist Style",
              ai_score: null,
              human_score: null
            },
            modern: {
              image: task.conversions?.modern?.image || null,
              name: "Modern Expressive",
              ai_score: null,
              human_score: null
            }
          },
          parameters: {
            denoising_strength: 0.30,
            cfg_scale: 3.0
          }
        }
        
        tasks.push(formattedTask)
      }
    }
    
    // Sort by ID
    tasks.sort((a, b) => a.id - b.id)
    
    // Load any existing scores
    try {
      const scoresFile = path.join(process.cwd(), 'evaluation_dataset', 'quality_evaluation_scores.jsonl')
      const scoresContent = await fs.readFile(scoresFile, 'utf-8')
      const lines = scoresContent.split('\n').filter(l => l.trim())
      
      for (const line of lines) {
        const score = JSON.parse(line)
        const task = tasks.find(t => t.id === score.taskId)
        if (task && task.styles[score.style]) {
          if (score.evaluator === 'ai') {
            task.styles[score.style].ai_score = score.scores
          } else {
            task.styles[score.style].human_score = score.scores
          }
        }
      }
    } catch (e) {
      // No scores yet
    }
    
    // Calculate statistics
    const totalTasks = tasks.length
    const totalStyles = totalTasks * 3
    let aiEvaluated = 0
    let humanEvaluated = 0
    
    tasks.forEach(task => {
      Object.values(task.styles).forEach((style: any) => {
        if (style.ai_score) aiEvaluated++
        if (style.human_score) humanEvaluated++
      })
    })
    
    const stats = {
      totalTasks,
      totalStyles,
      aiEvaluated,
      humanEvaluated,
      cats: tasks.filter(t => t.category === 'cat').length,
      dogs: tasks.filter(t => t.category === 'dog').length
    }
    
    return NextResponse.json({
      tasks,
      stats
    })
    
  } catch (error) {
    console.error('Error loading quality tasks:', error)
    return NextResponse.json(
      { error: 'Failed to load tasks' },
      { status: 500 }
    )
  }
}