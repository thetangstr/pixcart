import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs/promises'

// Submit human evaluation
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      task_id,
      preservation,
      style,
      overall,
      comments,
      parameters
    } = body

    // Log to RL training system (file-based for now)
    await logToRLSystem({
      task_id,
      preservation,
      style,
      overall,
      parameters,
      timestamp: new Date().toISOString()
    })

    // Check if parameters should be blacklisted
    if (preservation <= 2) {
      // Preservation failed - blacklist these parameters
      await blacklistParameters(parameters)
    }

    // Check if parameters should be promoted
    if (preservation >= 4 && style >= 4 && overall >= 4) {
      // Excellent result - promote these parameters
      await promoteParameters(parameters)
    }

    return NextResponse.json({
      success: true,
      message: 'Evaluation submitted successfully'
    })

  } catch (error) {
    console.error('Error submitting evaluation:', error)
    return NextResponse.json(
      { error: 'Failed to submit evaluation' },
      { status: 500 }
    )
  }
}

// Log evaluation to RL training system
async function logToRLSystem(evaluation: any) {
  try {
    // Append to RL training log
    const logPath = path.join(process.cwd(), 'rl_training', 'human_evaluations.jsonl')
    const logEntry = JSON.stringify(evaluation) + '\n'
    await fs.appendFile(logPath, logEntry)
    
    // Calculate reward based on human evaluation
    const reward = calculateReward(
      evaluation.preservation,
      evaluation.style,
      evaluation.overall
    )
    
    // Update RL model with human feedback
    console.log(`Human feedback reward: ${reward} for params:`, evaluation.parameters)
    
  } catch (error) {
    console.error('Error logging to RL system:', error)
  }
}

// Calculate RL reward from human scores
function calculateReward(preservation: number, style: number, overall: number): number {
  // Preservation is most important (50% weight)
  // Style is secondary (30% weight)
  // Overall is final check (20% weight)
  
  // Convert 1-5 scale to -1 to 1 scale
  const preservationNorm = (preservation - 3) / 2
  const styleNorm = (style - 3) / 2
  const overallNorm = (overall - 3) / 2
  
  // Calculate weighted reward
  let reward = (0.5 * preservationNorm) + (0.3 * styleNorm) + (0.2 * overallNorm)
  
  // Apply penalties for critical failures
  if (preservation === 1) {
    reward = -10 // Massive penalty for species change
  } else if (preservation === 2) {
    reward = Math.min(reward, -2) // Large penalty for major changes
  }
  
  // Apply bonuses for excellence
  if (preservation === 5 && style >= 4) {
    reward += 1 // Bonus for perfect preservation with good style
  }
  
  return reward
}

// Blacklist parameters that fail preservation
async function blacklistParameters(params: any) {
  try {
    const blacklistPath = path.join(process.cwd(), 'rl_training', 'blacklist.json')
    
    // Read existing blacklist
    let blacklist = []
    try {
      const data = await fs.readFile(blacklistPath, 'utf-8')
      blacklist = JSON.parse(data)
    } catch {
      // File doesn't exist yet
    }
    
    // Add to blacklist
    blacklist.push({
      parameters: params,
      reason: 'Failed human evaluation - preservation score <= 2',
      timestamp: new Date().toISOString()
    })
    
    // Save updated blacklist
    await fs.writeFile(blacklistPath, JSON.stringify(blacklist, null, 2))
    console.log('Blacklisted parameters:', params)
    
  } catch (error) {
    console.error('Error blacklisting parameters:', error)
  }
}

// Promote parameters that excel
async function promoteParameters(params: any) {
  try {
    const promotedPath = path.join(process.cwd(), 'rl_training', 'promoted.json')
    
    // Read existing promoted list
    let promoted = []
    try {
      const data = await fs.readFile(promotedPath, 'utf-8')
      promoted = JSON.parse(data)
    } catch {
      // File doesn't exist yet
    }
    
    // Add to promoted list
    promoted.push({
      parameters: params,
      reason: 'Excellent human evaluation - all scores >= 4',
      timestamp: new Date().toISOString()
    })
    
    // Save updated promoted list
    await fs.writeFile(promotedPath, JSON.stringify(promoted, null, 2))
    console.log('Promoted parameters:', params)
    
  } catch (error) {
    console.error('Error promoting parameters:', error)
  }
}