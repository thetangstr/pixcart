import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import fs from 'fs/promises'
import path from 'path'

const FEEDBACK_FILE = path.join(process.cwd(), 'data', 'feedback.json')

async function ensureDataDir() {
  const dataDir = path.join(process.cwd(), 'data')
  try {
    await fs.access(dataDir)
  } catch {
    await fs.mkdir(dataDir, { recursive: true })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    const { type, message } = await request.json()
    
    if (!type || !message) {
      return NextResponse.json(
        { error: 'Type and message are required' },
        { status: 400 }
      )
    }
    
    // Ensure data directory exists
    await ensureDataDir()
    
    // Create feedback item
    const feedbackItem = {
      id: Date.now().toString(),
      type,
      message,
      userId: user.id,
      username: user.username,
      timestamp: new Date().toISOString()
    }
    
    // Read existing feedback
    let feedback = []
    try {
      const data = await fs.readFile(FEEDBACK_FILE, 'utf-8')
      feedback = JSON.parse(data)
    } catch {
      // File doesn't exist yet
    }
    
    // Add new feedback
    feedback.push(feedbackItem)
    
    // Save feedback
    await fs.writeFile(FEEDBACK_FILE, JSON.stringify(feedback, null, 2))
    
    return NextResponse.json({ success: true, feedback: feedbackItem })
  } catch (error) {
    console.error('Error saving feedback:', error)
    return NextResponse.json(
      { error: 'Failed to save feedback' },
      { status: 500 }
    )
  }
}