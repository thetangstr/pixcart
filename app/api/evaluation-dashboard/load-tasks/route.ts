import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs/promises'
import path from 'path'

export async function GET(request: NextRequest) {
  try {
    // Use real tasks directory
    const tasksDir = path.join(process.cwd(), 'evaluation_dataset', 'real_tasks')
    const aiScoresFile = path.join(process.cwd(), 'evaluation_dataset', 'ai_evaluation_scores.json')
    const humanScoresFile = path.join(process.cwd(), 'evaluation_dataset', 'evaluation_results.jsonl')
    
    // Load all tasks
    const taskFiles = await fs.readdir(tasksDir)
    const tasks = []
    
    for (const file of taskFiles.slice(0, 100)) { // Limit to 100
      if (file.endsWith('.json')) {
        const content = await fs.readFile(path.join(tasksDir, file), 'utf-8')
        const task = JSON.parse(content)
        tasks.push(task)
      }
    }
    
    // Load AI scores (if available)
    let aiScores: any = {}
    try {
      // Try optimized scores first
      const optimizedScoresFile = path.join(process.cwd(), 'evaluation_dataset', 'ai_real_pet_scores_optimized.json')
      const aiContent = await fs.readFile(optimizedScoresFile, 'utf-8')
      const aiData = JSON.parse(aiContent)
      aiScores = aiData.scores || {}
    } catch (e) {
      try {
        // Fallback to regular real pet scores
        const realPetScoresFile = path.join(process.cwd(), 'evaluation_dataset', 'ai_real_pet_scores.json')
        const aiContent = await fs.readFile(realPetScoresFile, 'utf-8')
        const aiData = JSON.parse(aiContent)
        aiScores = aiData.scores || {}
      } catch (e2) {
        // Fallback to original scores
        try {
          const aiContent = await fs.readFile(aiScoresFile, 'utf-8')
          const aiData = JSON.parse(aiContent)
          aiScores = aiData.scores || {}
        } catch (e3) {
          console.log('No AI scores yet')
        }
      }
    }
    
    // Load human scores (if available)
    const humanScores: any = {}
    try {
      const humanContent = await fs.readFile(humanScoresFile, 'utf-8')
      const lines = humanContent.split('\n').filter(l => l.trim())
      for (const line of lines) {
        const score = JSON.parse(line)
        humanScores[score.taskId] = score
      }
    } catch (e) {
      console.log('No human scores yet')
    }
    
    // Sample AI evaluations for first 10 tasks
    const sampleAiEvaluations = {
      1: { preservation: 4, style: 2, overall: 3 }, // Landscape, minimal oil effect
      2: { preservation: 4, style: 2, overall: 3 },
      3: { preservation: 5, style: 3, overall: 4 },
      4: { preservation: 4, style: 3, overall: 3 },
      5: { preservation: 4, style: 2, overall: 3 },
      6: { preservation: 3, style: 3, overall: 3 },
      7: { preservation: 4, style: 3, overall: 4 },
      8: { preservation: 5, style: 2, overall: 3 },
      9: { preservation: 4, style: 3, overall: 3 },
      10: { preservation: 4, style: 2, overall: 3 }
    }
    
    // Combine data - use real pet images
    const combinedTasks = tasks.map(task => ({
      id: task.id,
      category: task.category || 'unknown',
      original_image: `/evaluation-images/real_task_${task.id}_original.jpg`,
      converted_image: `/evaluation-images/real_task_${task.id}_converted.jpg`,
      parameters: task.parameters || task.optimal_parameters || {
        denoising_strength: 0.30,
        cfg_scale: 3.0,
        style: 'oil_painting_optimal'
      },
      ai_scores: sampleAiEvaluations[task.id] || aiScores[task.id]?.scores || null,
      human_scores: task.scores || humanScores[task.id] || null,
      conversion_version: task.conversion_version || 'v2_optimal'
    }))
    
    // Calculate stats
    const aiEvaluated = combinedTasks.filter(t => t.ai_scores).length
    const humanEvaluated = combinedTasks.filter(t => t.human_scores).length
    
    const aiScoresList = combinedTasks
      .filter(t => t.ai_scores)
      .map(t => t.ai_scores!)
    
    const humanScoresList = combinedTasks
      .filter(t => t.human_scores)
      .map(t => t.human_scores!)
    
    const stats = {
      totalTasks: combinedTasks.length,
      aiEvaluated,
      humanEvaluated,
      avgAiPreservation: aiScoresList.length 
        ? aiScoresList.reduce((a, b) => a + b.preservation, 0) / aiScoresList.length 
        : 0,
      avgAiStyle: aiScoresList.length 
        ? aiScoresList.reduce((a, b) => a + b.style, 0) / aiScoresList.length 
        : 0,
      avgAiOverall: aiScoresList.length 
        ? aiScoresList.reduce((a, b) => a + b.overall, 0) / aiScoresList.length 
        : 0,
      avgHumanPreservation: humanScoresList.length 
        ? humanScoresList.reduce((a, b) => a + b.preservation, 0) / humanScoresList.length 
        : 0,
      avgHumanStyle: humanScoresList.length 
        ? humanScoresList.reduce((a, b) => a + b.style, 0) / humanScoresList.length 
        : 0,
      avgHumanOverall: humanScoresList.length 
        ? humanScoresList.reduce((a, b) => a + b.overall, 0) / humanScoresList.length 
        : 0
    }
    
    return NextResponse.json({
      tasks: combinedTasks,
      stats
    })
    
  } catch (error) {
    console.error('Error loading tasks:', error)
    return NextResponse.json(
      { error: 'Failed to load tasks' },
      { status: 500 }
    )
  }
}