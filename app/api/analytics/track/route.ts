import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs/promises'
import path from 'path'

const ANALYTICS_FILE = path.join(process.cwd(), 'data', 'analytics.json')

async function ensureDataDir() {
  const dataDir = path.join(process.cwd(), 'data')
  try {
    await fs.access(dataDir)
  } catch {
    await fs.mkdir(dataDir, { recursive: true })
  }
}

interface AnalyticsEvent {
  type: 'pageview' | 'conversion' | 'upload' | 'download'
  page?: string
  action?: string
  timestamp: string
  userAgent?: string
  referrer?: string
  sessionId?: string
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, page, action } = body
    
    // Ensure data directory exists
    await ensureDataDir()
    
    // Create event
    const event: AnalyticsEvent = {
      type,
      page,
      action,
      timestamp: new Date().toISOString(),
      userAgent: request.headers.get('user-agent') || undefined,
      referrer: request.headers.get('referer') || undefined,
      sessionId: request.cookies.get('session')?.value || undefined,
    }
    
    // Read existing analytics
    let analytics = []
    try {
      const data = await fs.readFile(ANALYTICS_FILE, 'utf-8')
      analytics = JSON.parse(data)
    } catch {
      // File doesn't exist yet
    }
    
    // Add new event
    analytics.push(event)
    
    // Keep only last 10000 events to prevent file from growing too large
    if (analytics.length > 10000) {
      analytics = analytics.slice(-10000)
    }
    
    // Save analytics
    await fs.writeFile(ANALYTICS_FILE, JSON.stringify(analytics, null, 2))
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error tracking analytics:', error)
    return NextResponse.json({ error: 'Failed to track event' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    // Only allow admin access
    const sessionCookie = request.cookies.get('session')
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const sessionData = JSON.parse(sessionCookie.value)
    if (sessionData.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }
    
    // Read analytics
    let analytics = []
    try {
      const data = await fs.readFile(ANALYTICS_FILE, 'utf-8')
      analytics = JSON.parse(data)
    } catch {
      // File doesn't exist yet
    }
    
    // Calculate summary statistics
    const now = new Date()
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    
    const summary = {
      total: analytics.length,
      today: analytics.filter((e: AnalyticsEvent) => new Date(e.timestamp) > oneDayAgo).length,
      thisWeek: analytics.filter((e: AnalyticsEvent) => new Date(e.timestamp) > oneWeekAgo).length,
      pageviews: analytics.filter((e: AnalyticsEvent) => e.type === 'pageview').length,
      conversions: analytics.filter((e: AnalyticsEvent) => e.type === 'conversion').length,
      uploads: analytics.filter((e: AnalyticsEvent) => e.type === 'upload').length,
      downloads: analytics.filter((e: AnalyticsEvent) => e.type === 'download').length,
      topPages: getTopPages(analytics),
      recentEvents: analytics.slice(-20).reverse(),
    }
    
    return NextResponse.json(summary)
  } catch (error) {
    console.error('Error fetching analytics:', error)
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 })
  }
}

function getTopPages(analytics: AnalyticsEvent[]) {
  const pageCounts: Record<string, number> = {}
  
  analytics
    .filter(e => e.type === 'pageview' && e.page)
    .forEach(e => {
      pageCounts[e.page!] = (pageCounts[e.page!] || 0) + 1
    })
  
  return Object.entries(pageCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([page, count]) => ({ page, count }))
}