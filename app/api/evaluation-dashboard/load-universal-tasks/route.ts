import { NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

export async function GET() {
  try {
    const tasksDir = path.join(process.cwd(), 'evaluation_dataset', 'universal_tasks')
    
    // Check if directory exists
    try {
      await fs.access(tasksDir)
    } catch {
      return NextResponse.json({ tasks: [], stats: {} })
    }
    
    // Read all task files
    const files = await fs.readdir(tasksDir)
    const taskFiles = files.filter(f => f.endsWith('.json'))
    
    const tasks = []
    for (const file of taskFiles) {
      const content = await fs.readFile(path.join(tasksDir, file), 'utf-8')
      const taskData = JSON.parse(content)
      
      // Transform to dashboard format with 3 styles
      const task = {
        id: taskData.id,
        category: taskData.category,
        original_image: taskData.original_image,
        styles: {
          classic: {
            name: "Classic Oil Portrait",
            image: taskData.conversions?.classic?.image || null,
            ai_score: null,
            human_score: null
          },
          impressionist: {
            name: "Impressionist Style",
            image: taskData.conversions?.impressionist?.image || null,
            ai_score: null,
            human_score: null
          },
          modern: {
            name: "Modern Expressive",
            image: taskData.conversions?.modern?.image || null,
            ai_score: null,
            human_score: null
          }
        },
        parameters: taskData.parameters || {
          denoising_strength: 0.35,
          cfg_scale: 5.0
        }
      }
      
      tasks.push(task)
    }
    
    // Sort by ID
    tasks.sort((a, b) => a.id - b.id)
    
    // Calculate stats
    const stats = {
      totalTasks: tasks.length,
      totalStyles: tasks.length * 3,
      humanEvaluated: 0,
      aiEvaluated: 0,
      message: "Using UNIVERSAL parameters with prompt variations"
    }
    
    // Count evaluated styles
    tasks.forEach(task => {
      Object.values(task.styles).forEach(style => {
        if (style.human_score) stats.humanEvaluated++
        if (style.ai_score) stats.aiEvaluated++
      })
    })
    
    return NextResponse.json({ tasks, stats })
  } catch (error) {
    console.error('Error loading universal tasks:', error)
    return NextResponse.json({ tasks: [], stats: {}, error: 'Failed to load tasks' })
  }
}