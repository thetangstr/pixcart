import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs/promises'
import path from 'path'

export async function GET(request: NextRequest) {
  try {
    const stylesDir = path.join(process.cwd(), 'public/evaluation-images/portraits_styled')
    
    // Check if directory exists
    try {
      await fs.access(stylesDir)
    } catch {
      // Return empty if not ready yet
      return NextResponse.json({ tasks: [] })
    }
    
    // Get all portrait files
    const files = await fs.readdir(stylesDir)
    const originals = files.filter(f => f.includes('_original.jpg'))
    
    const tasks = []
    
    for (const originalFile of originals) {
      // Extract task ID from filename
      const match = originalFile.match(/portrait_(\d+)_original\.jpg/)
      if (!match) continue
      
      const taskId = parseInt(match[1])
      
      // Check for style variants
      const classicFile = `portrait_${taskId}_classic.jpg`
      const impressionistFile = `portrait_${taskId}_impressionist.jpg`
      const modernFile = `portrait_${taskId}_modern.jpg`
      
      // Determine category based on ID (1-20 cats, 21-40 dogs)
      const category = taskId <= 20 ? 'cat' : 'dog'
      
      tasks.push({
        id: taskId,
        category,
        original_image: `/evaluation-images/portraits_styled/${originalFile}`,
        classic_image: files.includes(classicFile) 
          ? `/evaluation-images/portraits_styled/${classicFile}` 
          : null,
        impressionist_image: files.includes(impressionistFile)
          ? `/evaluation-images/portraits_styled/${impressionistFile}`
          : null,
        modern_image: files.includes(modernFile)
          ? `/evaluation-images/portraits_styled/${modernFile}`
          : null
      })
    }
    
    // Sort by ID
    tasks.sort((a, b) => a.id - b.id)
    
    return NextResponse.json({
      tasks,
      stats: {
        total: tasks.length,
        cats: tasks.filter(t => t.category === 'cat').length,
        dogs: tasks.filter(t => t.category === 'dog').length
      }
    })
    
  } catch (error) {
    console.error('Error loading tasks:', error)
    return NextResponse.json(
      { error: 'Failed to load tasks' },
      { status: 500 }
    )
  }
}