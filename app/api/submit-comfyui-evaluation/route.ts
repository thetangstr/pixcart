import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

export async function POST(request: NextRequest) {
  try {
    const evaluationData = await request.json()
    
    // Validate required fields
    if (!evaluationData.task_id || !evaluationData.ratings) {
      return NextResponse.json({
        success: false,
        error: 'Missing required evaluation data'
      }, { status: 400 })
    }
    
    // Create evaluation results directory
    const resultsDir = path.join(process.cwd(), 'comfyui_evaluation_results', 'human_evaluations')
    await fs.mkdir(resultsDir, { recursive: true })
    
    // Save individual evaluation
    const timestamp = new Date().toISOString()
    const filename = `evaluation_task_${evaluationData.task_id}_${Date.now()}.json`
    const filepath = path.join(resultsDir, filename)
    
    const evaluationRecord = {
      ...evaluationData,
      submitted_at: timestamp,
      evaluator_id: 'human_evaluator', // Could be expanded for multiple evaluators
    }
    
    await fs.writeFile(filepath, JSON.stringify(evaluationRecord, null, 2))
    
    // Update summary statistics
    await updateEvaluationSummary(evaluationData)
    
    return NextResponse.json({
      success: true,
      message: 'Evaluation submitted successfully',
      evaluation_id: filename
    })
    
  } catch (error) {
    console.error('Error submitting ComfyUI evaluation:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to submit evaluation'
    }, { status: 500 })
  }
}

async function updateEvaluationSummary(newEvaluation: any) {
  try {
    const summaryFile = path.join(process.cwd(), 'comfyui_evaluation_results', 'evaluation_summary.json')
    
    let summary = {
      total_evaluations: 0,
      avg_scores: {
        comfyui: {
          preservation: 0,
          artistic_quality: 0,
          overall_satisfaction: 0
        },
        a1111: {
          preservation: 0,
          artistic_quality: 0,  
          overall_satisfaction: 0
        }
      },
      backend_preferences: {
        a1111: 0,
        comfyui: 0,
        tie: 0
      },
      style_performance: {},
      last_updated: new Date().toISOString()
    }
    
    // Try to load existing summary
    try {
      const existingData = await fs.readFile(summaryFile, 'utf-8')
      summary = { ...summary, ...JSON.parse(existingData) }
    } catch (error) {
      // File doesn't exist yet, use default summary
    }
    
    // Update with new evaluation
    summary.total_evaluations += 1
    
    // Process ratings
    Object.entries(newEvaluation.ratings).forEach(([key, rating]: [string, any]) => {
      const [style, backend] = key.split('_')
      
      if (backend === 'comfyui' || backend === 'a1111') {
        // Update average scores
        const currentAvg = summary.avg_scores[backend as 'comfyui' | 'a1111']
        const totalEvals = summary.total_evaluations
        
        currentAvg.preservation = ((currentAvg.preservation * (totalEvals - 1)) + rating.preservation) / totalEvals
        currentAvg.artistic_quality = ((currentAvg.artistic_quality * (totalEvals - 1)) + rating.artistic_quality) / totalEvals
        currentAvg.overall_satisfaction = ((currentAvg.overall_satisfaction * (totalEvals - 1)) + rating.overall_satisfaction) / totalEvals
        
        // Update style performance
        if (!summary.style_performance[style]) {
          summary.style_performance[style] = {
            comfyui: { count: 0, avg_score: 0 },
            a1111: { count: 0, avg_score: 0 }
          }
        }
        
        const stylePerf = summary.style_performance[style][backend]
        const avgScore = (rating.preservation + rating.artistic_quality + rating.overall_satisfaction) / 3
        stylePerf.avg_score = ((stylePerf.avg_score * stylePerf.count) + avgScore) / (stylePerf.count + 1)
        stylePerf.count += 1
      }
      
      // Update backend preferences
      if (rating.backend_preference) {
        summary.backend_preferences[rating.backend_preference] += 1
      }
    })
    
    summary.last_updated = new Date().toISOString()
    
    // Save updated summary
    await fs.writeFile(summaryFile, JSON.stringify(summary, null, 2))
    
  } catch (error) {
    console.error('Error updating evaluation summary:', error)
  }
}