import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs/promises'
import path from 'path'

// Enhanced feedback types for v0.1 testing
export interface FeedbackV01 {
  id: string
  timestamp: string
  sessionId: string
  category: 'oil-painting' | 'app-feature' | 'bug' | 'suggestion'
  
  // For oil painting feedback
  oilPaintingFeedback?: {
    quality: number // 1-5 rating
    brushstrokeVisibility: number // 1-5 rating
    subjectPreservation: number // 1-5 rating
    artisticAppeal: number // 1-5 rating
    wouldOrder: boolean
    issues?: string[]
    imageId?: string
    style?: string
    processingTime?: number
  }
  
  // For app feature feedback
  appFeatureFeedback?: {
    feature: string
    rating: number // 1-5
    easeOfUse: number // 1-5
    performance: number // 1-5
    issues?: string[]
  }
  
  // General fields
  message: string
  userAgent?: string
  screenResolution?: string
  deviceType?: 'mobile' | 'tablet' | 'desktop'
  email?: string // Optional for follow-up
}

const FEEDBACK_FILE = path.join(process.cwd(), 'data', 'feedback-v01.json')

async function ensureDataDir() {
  const dataDir = path.join(process.cwd(), 'data')
  try {
    await fs.access(dataDir)
  } catch {
    await fs.mkdir(dataDir, { recursive: true })
  }
}

async function loadFeedback(): Promise<FeedbackV01[]> {
  try {
    const data = await fs.readFile(FEEDBACK_FILE, 'utf-8')
    return JSON.parse(data)
  } catch {
    return []
  }
}

async function saveFeedback(feedback: FeedbackV01[]) {
  await fs.writeFile(FEEDBACK_FILE, JSON.stringify(feedback, null, 2))
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Generate unique ID and timestamp
    const feedbackItem: FeedbackV01 = {
      id: `fb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      sessionId: body.sessionId || 'anonymous',
      category: body.category,
      message: body.message,
      ...body
    }
    
    // Ensure data directory exists
    await ensureDataDir()
    
    // Load existing feedback
    const feedback = await loadFeedback()
    
    // Add new feedback
    feedback.push(feedbackItem)
    
    // Save feedback
    await saveFeedback(feedback)
    
    // Log for monitoring
    console.log(`📝 Feedback received [${feedbackItem.category}]:`, {
      id: feedbackItem.id,
      category: feedbackItem.category,
      oilPaintingRating: feedbackItem.oilPaintingFeedback?.quality,
      appFeatureRating: feedbackItem.appFeatureFeedback?.rating,
      message: feedbackItem.message.substring(0, 100)
    })
    
    return NextResponse.json({ 
      success: true, 
      id: feedbackItem.id,
      message: 'Thank you for your feedback! It helps us improve.' 
    })
  } catch (error) {
    console.error('Feedback error:', error)
    return NextResponse.json(
      { error: 'Failed to save feedback' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    // Load all feedback for admin review
    const feedback = await loadFeedback()
    
    // Calculate analytics
    const analytics = {
      total: feedback.length,
      byCategory: {} as Record<string, number>,
      oilPaintingStats: {
        avgQuality: 0,
        avgBrushstroke: 0,
        avgPreservation: 0,
        avgArtistic: 0,
        wouldOrderRate: 0
      },
      appFeatureStats: {
        avgRating: 0,
        avgEaseOfUse: 0,
        avgPerformance: 0
      },
      recentFeedback: feedback.slice(-10).reverse()
    }
    
    // Calculate category counts
    feedback.forEach(item => {
      analytics.byCategory[item.category] = (analytics.byCategory[item.category] || 0) + 1
    })
    
    // Calculate oil painting stats
    const oilFeedback = feedback.filter(f => f.oilPaintingFeedback)
    if (oilFeedback.length > 0) {
      analytics.oilPaintingStats.avgQuality = oilFeedback.reduce((acc, f) => acc + (f.oilPaintingFeedback?.quality || 0), 0) / oilFeedback.length
      analytics.oilPaintingStats.avgBrushstroke = oilFeedback.reduce((acc, f) => acc + (f.oilPaintingFeedback?.brushstrokeVisibility || 0), 0) / oilFeedback.length
      analytics.oilPaintingStats.avgPreservation = oilFeedback.reduce((acc, f) => acc + (f.oilPaintingFeedback?.subjectPreservation || 0), 0) / oilFeedback.length
      analytics.oilPaintingStats.avgArtistic = oilFeedback.reduce((acc, f) => acc + (f.oilPaintingFeedback?.artisticAppeal || 0), 0) / oilFeedback.length
      analytics.oilPaintingStats.wouldOrderRate = oilFeedback.filter(f => f.oilPaintingFeedback?.wouldOrder).length / oilFeedback.length
    }
    
    // Calculate app feature stats
    const appFeedback = feedback.filter(f => f.appFeatureFeedback)
    if (appFeedback.length > 0) {
      analytics.appFeatureStats.avgRating = appFeedback.reduce((acc, f) => acc + (f.appFeatureFeedback?.rating || 0), 0) / appFeedback.length
      analytics.appFeatureStats.avgEaseOfUse = appFeedback.reduce((acc, f) => acc + (f.appFeatureFeedback?.easeOfUse || 0), 0) / appFeedback.length
      analytics.appFeatureStats.avgPerformance = appFeedback.reduce((acc, f) => acc + (f.appFeatureFeedback?.performance || 0), 0) / appFeedback.length
    }
    
    return NextResponse.json(analytics)
  } catch (error) {
    console.error('Error loading feedback:', error)
    return NextResponse.json(
      { error: 'Failed to load feedback' },
      { status: 500 }
    )
  }
}