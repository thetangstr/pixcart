import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user from database
    const user = await db.user.findUnique({
      where: { email: session.user.email! },
      select: {
        id: true,
        email: true,
        dailyImageLimit: true,
        createdAt: true
      }
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get today's usage
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayUsage = await db.apiUsage.count({
      where: {
        userId: user.id,
        createdAt: {
          gte: today,
          lt: tomorrow
        },
        success: true
      }
    });

    // Get last 7 days usage for trend
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const weeklyUsage = await db.apiUsage.findMany({
      where: {
        userId: user.id,
        createdAt: {
          gte: sevenDaysAgo
        }
      },
      select: {
        createdAt: true,
        success: true,
        operation: true
      }
    });

    // Calculate daily breakdown for the week
    const dailyBreakdown: Record<string, { successful: number; failed: number; total: number }> = {};
    
    // Initialize all days in the past week
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      dailyBreakdown[dateStr] = { successful: 0, failed: 0, total: 0 };
    }

    // Fill with actual data
    weeklyUsage.forEach(usage => {
      const date = usage.createdAt.toISOString().split('T')[0];
      if (dailyBreakdown[date]) {
        dailyBreakdown[date].total++;
        if (usage.success) {
          dailyBreakdown[date].successful++;
        } else {
          dailyBreakdown[date].failed++;
        }
      }
    });

    const dailyLimit = user.dailyImageLimit || 10;
    const remaining = Math.max(0, dailyLimit - todayUsage);
    const usagePercentage = Math.min(100, (todayUsage / dailyLimit) * 100);

    // Get operation breakdown
    const operationStats: Record<string, number> = {};
    weeklyUsage.forEach(usage => {
      const operation = usage.operation || 'generate';
      operationStats[operation] = (operationStats[operation] || 0) + 1;
    });

    const stats = {
      limits: {
        daily: dailyLimit,
        used: todayUsage,
        remaining: remaining,
        percentage: usagePercentage,
        resetTime: tomorrow.getTime() // When the limit resets (midnight)
      },
      usage: {
        today: todayUsage,
        thisWeek: weeklyUsage.filter(u => u.success).length,
        weeklyBreakdown: Object.entries(dailyBreakdown)
          .map(([date, stats]) => ({
            date,
            successful: stats.successful,
            failed: stats.failed,
            total: stats.total
          }))
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      },
      operations: operationStats,
      status: {
        canGenerate: remaining > 0,
        nearLimit: usagePercentage >= 80,
        limitReached: remaining === 0
      }
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error("Error fetching user usage stats:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}