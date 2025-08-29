/**
 * Admin API - Hybrid System Statistics
 * 
 * GET: Retrieve usage statistics and analytics
 * DELETE: Reset usage statistics
 */

import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

interface UsageStats {
  totalUsers: number;
  totalGenerations: number;
  sdxlGenerations: number;
  geminiGenerations: number;
  averageUpgradeTime: number; // minutes
  costSavings: number;
  dailyStats: Record<string, {
    users: number;
    sdxl: number;
    gemini: number;
    cost: number;
  }>;
  lastUpdated: string;
}

const STATS_FILE = path.join(process.cwd(), 'data', 'hybrid-stats.json');

// Default stats
const DEFAULT_STATS: UsageStats = {
  totalUsers: 0,
  totalGenerations: 0,
  sdxlGenerations: 0,
  geminiGenerations: 0,
  averageUpgradeTime: 0,
  costSavings: 0,
  dailyStats: {},
  lastUpdated: new Date().toISOString()
};

/**
 * Load stats from file
 */
function loadStats(): UsageStats {
  try {
    if (fs.existsSync(STATS_FILE)) {
      const data = fs.readFileSync(STATS_FILE, 'utf8');
      const stats = JSON.parse(data);
      return { ...DEFAULT_STATS, ...stats };
    }
  } catch (error) {
    console.error('Failed to load hybrid stats:', error);
  }
  
  return DEFAULT_STATS;
}

/**
 * Save stats to file
 */
function saveStats(stats: UsageStats): boolean {
  try {
    // Ensure data directory exists
    const dataDir = path.dirname(STATS_FILE);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    const statsWithTimestamp = {
      ...stats,
      lastUpdated: new Date().toISOString()
    };
    
    fs.writeFileSync(STATS_FILE, JSON.stringify(statsWithTimestamp, null, 2));
    return true;
  } catch (error) {
    console.error('Failed to save hybrid stats:', error);
    return false;
  }
}

/**
 * Calculate enhanced analytics
 */
function calculateAnalytics(stats: UsageStats) {
  const totalCost = (stats.sdxlGenerations * 0.01) + (stats.geminiGenerations * 0.039);
  const allGeminiCost = stats.totalGenerations * 0.039;
  const costSavings = allGeminiCost - totalCost;
  
  // Calculate conversion rates
  const sdxlRate = stats.totalGenerations > 0 ? (stats.sdxlGenerations / stats.totalGenerations) * 100 : 0;
  const geminiRate = stats.totalGenerations > 0 ? (stats.geminiGenerations / stats.totalGenerations) * 100 : 0;
  
  // Calculate daily trends (last 7 days)
  const last7Days = Object.keys(stats.dailyStats)
    .sort()
    .slice(-7)
    .map(date => ({
      date,
      ...stats.dailyStats[date]
    }));
  
  return {
    totalCost: parseFloat(totalCost.toFixed(2)),
    allGeminiCost: parseFloat(allGeminiCost.toFixed(2)),
    costSavings: parseFloat(costSavings.toFixed(2)),
    costSavingsPercentage: allGeminiCost > 0 ? parseFloat(((costSavings / allGeminiCost) * 100).toFixed(1)) : 0,
    sdxlUsageRate: parseFloat(sdxlRate.toFixed(1)),
    geminiUsageRate: parseFloat(geminiRate.toFixed(1)),
    averageCostPerGeneration: stats.totalGenerations > 0 ? parseFloat((totalCost / stats.totalGenerations).toFixed(3)) : 0,
    last7Days,
    trends: {
      weeklyGrowth: last7Days.length >= 2 ? 
        ((last7Days[last7Days.length - 1]?.users || 0) - (last7Days[0]?.users || 0)) / Math.max(1, last7Days[0]?.users || 1) * 100 : 0,
      averageDailyUsers: last7Days.length > 0 ? 
        last7Days.reduce((sum, day) => sum + (day.users || 0), 0) / last7Days.length : 0
    }
  };
}

/**
 * Record a new usage event (called by hybrid API)
 */
export async function recordUsage(model: 'sdxl' | 'gemini', sessionId: string) {
  try {
    const stats = loadStats();
    const today = new Date().toISOString().split('T')[0];
    
    // Update totals
    stats.totalGenerations += 1;
    if (model === 'sdxl') {
      stats.sdxlGenerations += 1;
    } else {
      stats.geminiGenerations += 1;
    }
    
    // Update daily stats
    if (!stats.dailyStats[today]) {
      stats.dailyStats[today] = { users: 0, sdxl: 0, gemini: 0, cost: 0 };
    }
    
    stats.dailyStats[today][model] += 1;
    stats.dailyStats[today].cost += model === 'gemini' ? 0.039 : 0.01;
    
    // Track unique users (simplified - in production, use proper user tracking)
    stats.totalUsers = Math.max(stats.totalUsers, stats.totalGenerations * 0.3); // Rough estimate
    
    saveStats(stats);
    return true;
  } catch (error) {
    console.error('Failed to record usage:', error);
    return false;
  }
}

/**
 * GET - Retrieve current statistics
 */
export async function GET() {
  try {
    const stats = loadStats();
    const analytics = calculateAnalytics(stats);
    
    return NextResponse.json({
      success: true,
      stats: {
        ...stats,
        ...analytics
      },
      metadata: {
        dataSource: STATS_FILE,
        lastUpdated: stats.lastUpdated,
        recordCount: stats.totalGenerations
      }
    });
  } catch (error) {
    console.error('Failed to retrieve hybrid stats:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to retrieve statistics',
      stats: DEFAULT_STATS
    }, { status: 500 });
  }
}

/**
 * POST - Update statistics (internal use)
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { model, sessionId, timestamp } = body;
    
    if (!model || !['sdxl', 'gemini'].includes(model)) {
      return NextResponse.json({
        success: false,
        error: 'Valid model type required (sdxl or gemini)'
      }, { status: 400 });
    }
    
    const success = await recordUsage(model, sessionId || 'unknown');
    
    if (success) {
      return NextResponse.json({
        success: true,
        message: 'Usage recorded successfully'
      });
    } else {
      return NextResponse.json({
        success: false,
        error: 'Failed to record usage'
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Failed to update hybrid stats:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update statistics'
    }, { status: 500 });
  }
}

/**
 * DELETE - Reset all statistics
 */
export async function DELETE() {
  try {
    const resetStats = {
      ...DEFAULT_STATS,
      lastUpdated: new Date().toISOString()
    };
    
    const saveSuccess = saveStats(resetStats);
    if (!saveSuccess) {
      return NextResponse.json({
        success: false,
        error: 'Failed to reset statistics'
      }, { status: 500 });
    }
    
    console.log('🔄 Hybrid statistics reset to defaults');
    
    return NextResponse.json({
      success: true,
      stats: resetStats,
      message: 'Statistics reset successfully'
    });
    
  } catch (error) {
    console.error('Failed to reset hybrid stats:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to reset statistics'
    }, { status: 500 });
  }
}