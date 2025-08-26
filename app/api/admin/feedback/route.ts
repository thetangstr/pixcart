import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, isAdmin } from '@/lib/auth'
import fs from 'fs/promises'
import path from 'path'

const FEEDBACK_FILE = path.join(process.cwd(), 'data', 'feedback.json')

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    
    if (!isAdmin(user)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }
    
    // Read feedback from file
    try {
      const data = await fs.readFile(FEEDBACK_FILE, 'utf-8')
      const feedback = JSON.parse(data)
      return NextResponse.json({ feedback })
    } catch (error) {
      // If file doesn't exist, return empty array
      return NextResponse.json({ feedback: [] })
    }
  } catch (error) {
    console.error('Error fetching feedback:', error)
    return NextResponse.json(
      { error: 'Failed to fetch feedback' },
      { status: 500 }
    )
  }
}