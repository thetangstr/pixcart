import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { checkImageGenerationLimit, getUserImageStats } from "@/lib/rate-limit";

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const supabase = createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    const adminUser = await prisma.user.findUnique({
      where: { email: user.email! },
      select: { isAdmin: true }
    });

    if (!adminUser?.isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get user's current usage stats
    const targetUser = await prisma.user.findUnique({
      where: { id: params.userId },
      select: {
        id: true,
        email: true,
        name: true,
        dailyImageLimit: true,
        createdAt: true
      }
    });

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get today's usage
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayUsage = await prisma.apiUsage.count({
      where: {
        userId: params.userId,
        createdAt: {
          gte: today,
          lt: tomorrow
        },
        success: true
      }
    });

    // Get last 30 days usage
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const monthlyUsage = await prisma.apiUsage.findMany({
      where: {
        userId: params.userId,
        createdAt: {
          gte: thirtyDaysAgo
        }
      },
      select: {
        createdAt: true,
        success: true,
        cost: true
      }
    });

    // Calculate daily usage breakdown
    const dailyStats: Record<string, { requests: number; successful: number; cost: number }> = {};
    monthlyUsage.forEach(usage => {
      const date = usage.createdAt.toISOString().split('T')[0];
      if (!dailyStats[date]) {
        dailyStats[date] = { requests: 0, successful: 0, cost: 0 };
      }
      dailyStats[date].requests++;
      if (usage.success) dailyStats[date].successful++;
      dailyStats[date].cost += usage.cost || 0;
    });

    const stats = {
      user: {
        id: targetUser.id,
        email: targetUser.email,
        name: targetUser.name,
        dailyLimit: targetUser.dailyImageLimit || 10, // Default limit
        memberSince: targetUser.createdAt
      },
      usage: {
        today: todayUsage,
        remaining: Math.max(0, (targetUser.dailyImageLimit || 10) - todayUsage),
        monthly: {
          totalRequests: monthlyUsage.length,
          successfulRequests: monthlyUsage.filter(u => u.success).length,
          totalCost: monthlyUsage.reduce((sum, u) => sum + (u.cost || 0), 0),
          dailyBreakdown: Object.entries(dailyStats)
            .map(([date, stats]) => ({ date, ...stats }))
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .slice(0, 30)
        }
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

export async function PATCH(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const supabase = createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    const adminUser = await prisma.user.findUnique({
      where: { email: user.email! },
      select: { isAdmin: true }
    });

    if (!adminUser?.isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { dailyLimit } = body;

    if (!dailyLimit || typeof dailyLimit !== 'number' || dailyLimit < 0 || dailyLimit > 1000) {
      return NextResponse.json(
        { error: "Daily limit must be a number between 0 and 1000" },
        { status: 400 }
      );
    }

    // Update user's daily limit
    const updatedUser = await prisma.user.update({
      where: { id: params.userId },
      data: { dailyImageLimit: dailyLimit },
      select: {
        id: true,
        email: true,
        name: true,
        dailyImageLimit: true
      }
    });

    return NextResponse.json({
      message: "Daily limit updated successfully",
      user: updatedUser
    });
  } catch (error) {
    console.error("Error updating user daily limit:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}