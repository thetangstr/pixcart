import { NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

export async function GET() {
  try {
    // Try multiple task directories in order of preference
    const taskDirs = [
      'evaluation_dataset/masterpiece_tasks',    // Professional masterpiece style
      'evaluation_dataset/all_tasks',            // All 50 portraits
      'evaluation_dataset/distinct_demo_tasks',  // Quick demo with visible differences
      'evaluation_dataset/distinct_tasks_v2',    // Full distinct styles
      'evaluation_dataset/universal_tasks'       // Fallback
    ]
    
    let tasksDir = ''
    for (const dir of taskDirs) {
      const fullPath = path.join(process.cwd(), dir)
      try {
        await fs.access(fullPath)
        const files = await fs.readdir(fullPath)
        if (files.some(f => f.endsWith('.json'))) {
          tasksDir = fullPath
          break
        }
      } catch {
        continue
      }
    }
    
    if (!tasksDir) {
      return NextResponse.json({ tasks: [], stats: {} })
    }
    
    // Read all task files
    const files = await fs.readdir(tasksDir)
    const taskFiles = files.filter(f => f.endsWith('.json'))
    
    const tasks = []
    for (const file of taskFiles) {
      const content = await fs.readFile(path.join(tasksDir, file), 'utf-8')
      const taskData = JSON.parse(content)
      
      // Transform to dashboard format
      // Handle both old and new image paths
      let originalImage = taskData.original_image
      if (!originalImage.startsWith('/')) {
        originalImage = '/' + originalImage
      }
      
      const task = {
        id: taskData.id,
        category: taskData.category,
        original_image: originalImage,
        styles: {
          classic: {
            name: "Classic Oil Portrait",
            image: taskData.conversions?.classic?.image || null,
            denoising_strength: taskData.style_details?.classic?.denoising_strength || 0.35,
            cfg_scale: taskData.style_details?.classic?.cfg_scale || 5.0,
            sampler: taskData.style_details?.classic?.sampler || "DPM++ 2M Karras",
            controlnet_weight: taskData.style_details?.classic?.controlnet_weight || 0.7,
            human_score: null
          },
          impressionist: {
            name: "Impressionist Style",
            image: taskData.conversions?.impressionist?.image || null,
            denoising_strength: taskData.style_details?.impressionist?.denoising_strength || 0.45,
            cfg_scale: taskData.style_details?.impressionist?.cfg_scale || 4.5,
            sampler: taskData.style_details?.impressionist?.sampler || "Euler a",
            controlnet_weight: taskData.style_details?.impressionist?.controlnet_weight || 0.55,
            human_score: null
          },
          modern: {
            name: "Modern Expressive",
            image: taskData.conversions?.modern?.image || null,
            denoising_strength: taskData.style_details?.modern?.denoising_strength || 0.55,
            cfg_scale: taskData.style_details?.modern?.cfg_scale || 5.5,
            sampler: taskData.style_details?.modern?.sampler || "DPM++ SDE Karras",
            controlnet_weight: taskData.style_details?.modern?.controlnet_weight || 0.45,
            human_score: null
          }
        }
      }
      
      // Load any saved scores
      try {
        const scoresFile = path.join(process.cwd(), 'evaluation_dataset', 'scores', `task_${task.id}_scores.json`)
        const scoresContent = await fs.readFile(scoresFile, 'utf-8')
        const scores = JSON.parse(scoresContent)
        
        if (scores.classic) {
          task.styles.classic.human_score = {
            preservation: scores.classic.preservation,
            style: scores.classic.style,
            overall: scores.classic.overall
          }
          task.styles.classic.feedback = scores.classic.feedback
        }
        if (scores.impressionist) {
          task.styles.impressionist.human_score = {
            preservation: scores.impressionist.preservation,
            style: scores.impressionist.style,
            overall: scores.impressionist.overall
          }
          task.styles.impressionist.feedback = scores.impressionist.feedback
        }
        if (scores.modern) {
          task.styles.modern.human_score = {
            preservation: scores.modern.preservation,
            style: scores.modern.style,
            overall: scores.modern.overall
          }
          task.styles.modern.feedback = scores.modern.feedback
        }
      } catch {
        // No scores file yet
      }
      
      tasks.push(task)
    }
    
    // Sort by ID
    tasks.sort((a, b) => a.id - b.id)
    
    return NextResponse.json({ 
      tasks,
      message: "Distinct styles with optimized parameters"
    })
  } catch (error) {
    console.error('Error loading tasks:', error)
    return NextResponse.json({ tasks: [], error: 'Failed to load tasks' })
  }
}