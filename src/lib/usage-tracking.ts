import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Gemini pricing as of 2025 (these should be updated based on actual pricing)
const GEMINI_PRICING = {
  'gemini-2.0-flash-exp': {
    inputTokens: 0.000125, // per 1K tokens
    outputTokens: 0.000375, // per 1K tokens
    images: 0.00001, // per image
  },
  'gemini-1.5-pro': {
    inputTokens: 0.0035, // per 1K tokens
    outputTokens: 0.0105, // per 1K tokens
    images: 0.0105, // per image
  },
  'gemini-1.5-flash': {
    inputTokens: 0.00015, // per 1K tokens
    outputTokens: 0.0006, // per 1K tokens
    images: 0.00015, // per image
  }
};

export interface ApiUsageData {
  userId?: string;
  apiType: string;
  endpoint: string;
  model?: string;
  operation: string;
  inputTokens?: number;
  outputTokens?: number;
  imageCount?: number;
  success: boolean;
  error?: string;
  metadata?: any;
  duration?: number;
}

export class UsageTracker {
  /**
   * Log API usage to the database
   */
  static async logUsage(data: ApiUsageData): Promise<void> {
    try {
      const cost = this.calculateCost(data);

      await prisma.apiUsage.create({
        data: {
          userId: data.userId,
          apiType: data.apiType,
          endpoint: data.endpoint,
          model: data.model,
          operation: data.operation,
          inputTokens: data.inputTokens,
          outputTokens: data.outputTokens,
          imageCount: data.imageCount,
          cost,
          success: data.success,
          error: data.error,
          metadata: data.metadata,
          duration: data.duration,
        }
      });

      console.log(`API usage logged: ${data.apiType}/${data.operation} - Cost: $${cost?.toFixed(6)}`);
    } catch (error) {
      console.error('Failed to log API usage:', error);
      // Don't throw - usage tracking failure shouldn't break the main functionality
    }
  }

  /**
   * Calculate estimated cost for API usage
   */
  static calculateCost(data: ApiUsageData): number | null {
    if (data.apiType !== 'gemini' || !data.model) {
      return null;
    }

    const pricing = GEMINI_PRICING[data.model as keyof typeof GEMINI_PRICING];
    if (!pricing) {
      return null;
    }

    let cost = 0;

    // Token costs
    if (data.inputTokens) {
      cost += (data.inputTokens / 1000) * pricing.inputTokens;
    }
    if (data.outputTokens) {
      cost += (data.outputTokens / 1000) * pricing.outputTokens;
    }

    // Image costs
    if (data.imageCount) {
      cost += data.imageCount * pricing.images;
    }

    return cost;
  }

  /**
   * Get usage analytics for a user
   */
  static async getUserUsageAnalytics(userId: string, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    try {
      const usage = await prisma.apiUsage.findMany({
        where: {
          userId,
          createdAt: {
            gte: startDate
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      const totalCost = usage.reduce((sum, record) => sum + (record.cost || 0), 0);
      const totalRequests = usage.length;
      const successfulRequests = usage.filter(u => u.success).length;
      const failedRequests = totalRequests - successfulRequests;

      const operationStats = usage.reduce((acc, record) => {
        const key = record.operation;
        if (!acc[key]) {
          acc[key] = { count: 0, cost: 0, success: 0, failed: 0 };
        }
        acc[key].count++;
        acc[key].cost += record.cost || 0;
        if (record.success) {
          acc[key].success++;
        } else {
          acc[key].failed++;
        }
        return acc;
      }, {} as Record<string, { count: number; cost: number; success: number; failed: number }>);

      const modelStats = usage.reduce((acc, record) => {
        if (!record.model) return acc;
        const key = record.model;
        if (!acc[key]) {
          acc[key] = { count: 0, cost: 0 };
        }
        acc[key].count++;
        acc[key].cost += record.cost || 0;
        return acc;
      }, {} as Record<string, { count: number; cost: number }>);

      return {
        totalCost,
        totalRequests,
        successfulRequests,
        failedRequests,
        successRate: totalRequests > 0 ? (successfulRequests / totalRequests) * 100 : 0,
        operationStats,
        modelStats,
        recentUsage: usage.slice(0, 10), // Most recent 10 entries
        dailyUsage: this.aggregateDailyUsage(usage)
      };
    } catch (error) {
      console.error('Failed to get user usage analytics:', error);
      throw error;
    }
  }

  /**
   * Get overall usage analytics (admin view)
   */
  static async getOverallUsageAnalytics(days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    try {
      const usage = await prisma.apiUsage.findMany({
        where: {
          createdAt: {
            gte: startDate
          }
        },
        include: {
          user: {
            select: {
              email: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      const totalCost = usage.reduce((sum, record) => sum + (record.cost || 0), 0);
      const totalRequests = usage.length;
      const successfulRequests = usage.filter(u => u.success).length;
      const uniqueUsers = new Set(usage.filter(u => u.userId).map(u => u.userId)).size;

      const userStats = usage.reduce((acc, record) => {
        if (!record.userId || !record.user) return acc;
        const email = record.user.email;
        if (!acc[email]) {
          acc[email] = { 
            userId: record.userId,
            count: 0, 
            cost: 0, 
            success: 0, 
            failed: 0 
          };
        }
        acc[email].count++;
        acc[email].cost += record.cost || 0;
        if (record.success) {
          acc[email].success++;
        } else {
          acc[email].failed++;
        }
        return acc;
      }, {} as Record<string, { userId: string; count: number; cost: number; success: number; failed: number }>);

      const operationStats = usage.reduce((acc, record) => {
        const key = record.operation;
        if (!acc[key]) {
          acc[key] = { count: 0, cost: 0, success: 0, failed: 0 };
        }
        acc[key].count++;
        acc[key].cost += record.cost || 0;
        if (record.success) {
          acc[key].success++;
        } else {
          acc[key].failed++;
        }
        return acc;
      }, {} as Record<string, { count: number; cost: number; success: number; failed: number }>);

      const modelStats = usage.reduce((acc, record) => {
        if (!record.model) return acc;
        const key = record.model;
        if (!acc[key]) {
          acc[key] = { count: 0, cost: 0 };
        }
        acc[key].count++;
        acc[key].cost += record.cost || 0;
        return acc;
      }, {} as Record<string, { count: number; cost: number }>);

      return {
        totalCost,
        totalRequests,
        successfulRequests,
        failedRequests: totalRequests - successfulRequests,
        successRate: totalRequests > 0 ? (successfulRequests / totalRequests) * 100 : 0,
        uniqueUsers,
        userStats: Object.entries(userStats)
          .map(([email, stats]) => ({ email, ...stats }))
          .sort((a, b) => b.cost - a.cost), // Sort by cost descending
        operationStats,
        modelStats,
        dailyUsage: this.aggregateDailyUsage(usage)
      };
    } catch (error) {
      console.error('Failed to get overall usage analytics:', error);
      throw error;
    }
  }

  /**
   * Aggregate usage by day for charts
   */
  private static aggregateDailyUsage(usage: any[]) {
    const dailyData = usage.reduce((acc, record) => {
      const date = new Date(record.createdAt).toISOString().split('T')[0];
      if (!acc[date]) {
        acc[date] = { 
          date, 
          requests: 0, 
          cost: 0, 
          successful: 0, 
          failed: 0 
        };
      }
      acc[date].requests++;
      acc[date].cost += record.cost || 0;
      if (record.success) {
        acc[date].successful++;
      } else {
        acc[date].failed++;
      }
      return acc;
    }, {} as Record<string, { date: string; requests: number; cost: number; successful: number; failed: number }>);

    return Object.values(dailyData).sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * Helper function to track API call timing
   */
  static async trackApiCall<T>(
    operation: () => Promise<T>,
    trackingData: Omit<ApiUsageData, 'success' | 'error' | 'duration'>
  ): Promise<T> {
    const startTime = Date.now();
    
    try {
      const result = await operation();
      const duration = Date.now() - startTime;
      
      await this.logUsage({
        ...trackingData,
        success: true,
        duration
      });
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      await this.logUsage({
        ...trackingData,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration
      });
      
      throw error;
    }
  }
}

export default UsageTracker;