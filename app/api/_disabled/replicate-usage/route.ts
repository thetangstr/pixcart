/**
 * API endpoint for Replicate usage statistics
 */

import { NextRequest, NextResponse } from 'next/server'
import { usageTracker } from '@/app/lib/replicate-usage-tracker'

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const format = url.searchParams.get('format') || 'json'
    const monthlyBudget = parseFloat(url.searchParams.get('budget') || '10') // Default $10 budget
    
    const stats = usageTracker.getStats()
    
    if (format === 'report') {
      // Return text report
      const report = usageTracker.getReport()
      return new NextResponse(report, {
        headers: { 'Content-Type': 'text/plain' }
      })
    }
    
    // Get budget info
    const budgetInfo = usageTracker.estimateRemainingBudget(monthlyBudget)
    
    // Return JSON stats with budget info
    return NextResponse.json({
      stats,
      budget: {
        monthly: monthlyBudget,
        spent: budgetInfo.spent,
        remaining: budgetInfo.remaining,
        percentUsed: ((budgetInfo.spent / monthlyBudget) * 100).toFixed(1),
        estimatedCallsRemaining: budgetInfo.estimatedCallsRemaining
      },
      recommendations: {
        costEffective: 'Use "quick" quality for testing ($0.007 per image)',
        bestValue: 'Use "standard" quality for production ($0.02 per image)',
        premium: 'Reserve "premium" for special requests ($0.14 per image)'
      }
    })
  } catch (error) {
    console.error('Failed to get usage stats:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve usage statistics' },
      { status: 500 }
    )
  }
}

/**
 * Reset usage statistics (admin only)
 */
export async function DELETE(request: NextRequest) {
  try {
    // In production, add authentication check here
    const url = new URL(request.url)
    const confirm = url.searchParams.get('confirm')
    
    if (confirm !== 'yes') {
      return NextResponse.json(
        { error: 'Please confirm reset by adding ?confirm=yes' },
        { status: 400 }
      )
    }
    
    // Reset by reinitializing the usage file
    const fs = require('fs')
    const path = require('path')
    const usageFile = path.join(process.cwd(), 'data', 'replicate-usage.json')
    
    const resetData = {
      entries: [],
      stats: {
        totalCalls: 0,
        successfulCalls: 0,
        failedCalls: 0,
        totalCost: 0,
        byQuality: {},
        byStyle: {},
        byModel: {},
        dailyUsage: {}
      }
    }
    
    fs.writeFileSync(usageFile, JSON.stringify(resetData, null, 2))
    
    return NextResponse.json({
      success: true,
      message: 'Usage statistics have been reset'
    })
  } catch (error) {
    console.error('Failed to reset usage stats:', error)
    return NextResponse.json(
      { error: 'Failed to reset usage statistics' },
      { status: 500 }
    )
  }
}