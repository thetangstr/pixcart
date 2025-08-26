/**
 * Replicate API Usage Tracker
 * Tracks API calls, costs, and provides usage analytics
 */

import fs from 'fs'
import path from 'path'

interface UsageEntry {
  timestamp: string
  model: string
  quality: 'quick' | 'standard' | 'fast' | 'premium'
  style: string
  cost: number
  processingTime: string
  success: boolean
  error?: string
}

interface UsageStats {
  totalCalls: number
  successfulCalls: number
  failedCalls: number
  totalCost: number
  byQuality: Record<string, { count: number; cost: number }>
  byStyle: Record<string, number>
  byModel: Record<string, number>
  dailyUsage: Record<string, { calls: number; cost: number }>
}

export class ReplicateUsageTracker {
  private usageFile: string
  
  constructor() {
    // Store usage data in a JSON file
    const dataDir = path.join(process.cwd(), 'data')
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true })
    }
    this.usageFile = path.join(dataDir, 'replicate-usage.json')
    
    // Initialize file if it doesn't exist
    if (!fs.existsSync(this.usageFile)) {
      this.initializeUsageFile()
    }
  }
  
  private initializeUsageFile() {
    const initialData = {
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
    fs.writeFileSync(this.usageFile, JSON.stringify(initialData, null, 2))
  }
  
  /**
   * Track a Replicate API call
   */
  async trackUsage(
    model: string,
    quality: 'quick' | 'standard' | 'fast' | 'premium',
    style: string,
    cost: number,
    processingTime: string,
    success: boolean,
    error?: string
  ) {
    try {
      // Read current data
      const data = JSON.parse(fs.readFileSync(this.usageFile, 'utf-8'))
      
      // Create new entry
      const entry: UsageEntry = {
        timestamp: new Date().toISOString(),
        model,
        quality,
        style,
        cost,
        processingTime,
        success,
        ...(error && { error })
      }
      
      // Add entry
      data.entries.push(entry)
      
      // Update stats
      const stats = data.stats as UsageStats
      stats.totalCalls++
      
      if (success) {
        stats.successfulCalls++
        stats.totalCost += cost
        
        // Update quality stats
        if (!stats.byQuality[quality]) {
          stats.byQuality[quality] = { count: 0, cost: 0 }
        }
        stats.byQuality[quality].count++
        stats.byQuality[quality].cost += cost
        
        // Update style stats
        if (!stats.byStyle[style]) {
          stats.byStyle[style] = 0
        }
        stats.byStyle[style]++
        
        // Update model stats
        if (!stats.byModel[model]) {
          stats.byModel[model] = 0
        }
        stats.byModel[model]++
        
        // Update daily usage
        const today = new Date().toISOString().split('T')[0]
        if (!stats.dailyUsage[today]) {
          stats.dailyUsage[today] = { calls: 0, cost: 0 }
        }
        stats.dailyUsage[today].calls++
        stats.dailyUsage[today].cost += cost
      } else {
        stats.failedCalls++
      }
      
      // Save updated data
      fs.writeFileSync(this.usageFile, JSON.stringify(data, null, 2))
      
      // Log usage
      console.log(`📊 Replicate Usage Tracked:`)
      console.log(`   Model: ${model}`)
      console.log(`   Quality: ${quality} ($${cost})`)
      console.log(`   Total spent today: $${stats.dailyUsage[new Date().toISOString().split('T')[0]]?.cost.toFixed(3) || 0}`)
      console.log(`   Total spent overall: $${stats.totalCost.toFixed(3)}`)
      
    } catch (error) {
      console.error('Failed to track usage:', error)
    }
  }
  
  /**
   * Get usage statistics
   */
  getStats(): UsageStats | null {
    try {
      const data = JSON.parse(fs.readFileSync(this.usageFile, 'utf-8'))
      return data.stats
    } catch (error) {
      console.error('Failed to get stats:', error)
      return null
    }
  }
  
  /**
   * Get usage report
   */
  getReport(): string {
    const stats = this.getStats()
    if (!stats) return 'No usage data available'
    
    const report = [
      '=== Replicate API Usage Report ===',
      '',
      `Total API Calls: ${stats.totalCalls}`,
      `Successful: ${stats.successfulCalls}`,
      `Failed: ${stats.failedCalls}`,
      `Success Rate: ${((stats.successfulCalls / stats.totalCalls) * 100).toFixed(1)}%`,
      '',
      `💰 Total Cost: $${stats.totalCost.toFixed(3)}`,
      '',
      '📊 Usage by Quality Tier:',
      ...Object.entries(stats.byQuality).map(([quality, data]) => 
        `  ${quality}: ${data.count} calls, $${data.cost.toFixed(3)}`
      ),
      '',
      '🎨 Usage by Style:',
      ...Object.entries(stats.byStyle).map(([style, count]) => 
        `  ${style}: ${count} conversions`
      ),
      '',
      '📅 Recent Daily Usage:',
      ...Object.entries(stats.dailyUsage)
        .slice(-7) // Last 7 days
        .map(([date, data]) => 
          `  ${date}: ${data.calls} calls, $${data.cost.toFixed(3)}`
        )
    ]
    
    return report.join('\n')
  }
  
  /**
   * Get cost estimate for remaining API calls
   */
  estimateRemainingBudget(monthlyBudget: number): {
    spent: number
    remaining: number
    estimatedCallsRemaining: { [key: string]: number }
  } {
    const stats = this.getStats()
    if (!stats) {
      return {
        spent: 0,
        remaining: monthlyBudget,
        estimatedCallsRemaining: {
          quick: Math.floor(monthlyBudget / 0.007),
          standard: Math.floor(monthlyBudget / 0.02),
          fast: Math.floor(monthlyBudget / 0.01),
          premium: Math.floor(monthlyBudget / 0.14)
        }
      }
    }
    
    // Get current month's usage
    const currentMonth = new Date().toISOString().slice(0, 7) // YYYY-MM
    const monthlySpent = Object.entries(stats.dailyUsage)
      .filter(([date]) => date.startsWith(currentMonth))
      .reduce((total, [_, data]) => total + data.cost, 0)
    
    const remaining = Math.max(0, monthlyBudget - monthlySpent)
    
    return {
      spent: monthlySpent,
      remaining,
      estimatedCallsRemaining: {
        quick: Math.floor(remaining / 0.007),
        standard: Math.floor(remaining / 0.02),
        fast: Math.floor(remaining / 0.01),
        premium: Math.floor(remaining / 0.14)
      }
    }
  }
}

// Export singleton instance
export const usageTracker = new ReplicateUsageTracker()