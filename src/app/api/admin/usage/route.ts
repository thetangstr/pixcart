import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { PrismaClient } from '@prisma/client';
import { UsageTracker } from '@/lib/usage-tracking';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    // Create Supabase client
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value;
          },
          set() {
            // Not needed for server-side operations
          },
          remove() {
            // Not needed for server-side operations
          },
        },
      }
    );

    // Get session
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if current user is admin
    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { isAdmin: true }
    });

    if (!currentUser?.isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30');
    const userId = searchParams.get('userId');

    let analytics;

    if (userId) {
      // Get analytics for specific user
      analytics = await UsageTracker.getUserUsageAnalytics(userId, days);
      
      // Get user info
      const userInfo = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          isAllowlisted: true,
          isWaitlisted: true,
          createdAt: true
        }
      });

      return NextResponse.json({
        type: 'user',
        user: userInfo,
        analytics,
        period: `${days} days`
      });
    } else {
      // Get overall analytics
      analytics = await UsageTracker.getOverallUsageAnalytics(days);
      
      // Get additional platform statistics
      const platformStats = await getPlatformStats();

      return NextResponse.json({
        type: 'overall',
        analytics,
        platformStats,
        period: `${days} days`
      });
    }

  } catch (error) {
    console.error('Error fetching usage analytics:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Get platform-wide statistics
async function getPlatformStats() {
  try {
    const [
      totalUsers,
      allowlistedUsers,
      waitlistedUsers,
      totalOrders,
      recentSignups
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isAllowlisted: true } }),
      prisma.user.count({ where: { isWaitlisted: true } }),
      prisma.order.count(),
      prisma.user.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
          }
        }
      })
    ]);

    // Get waitlist progression (users by join date)
    const waitlistProgression = await prisma.user.groupBy({
      by: ['joinedWaitlistAt'],
      _count: {
        id: true
      },
      where: {
        isWaitlisted: true,
        joinedWaitlistAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
        }
      },
      orderBy: {
        joinedWaitlistAt: 'asc'
      }
    });

    // Get approval rate over time
    const approvalStats = await prisma.user.groupBy({
      by: ['approvedAt'],
      _count: {
        id: true
      },
      where: {
        isAllowlisted: true,
        approvedAt: {
          not: null,
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
        }
      },
      orderBy: {
        approvedAt: 'asc'
      }
    });

    return {
      totalUsers,
      allowlistedUsers,
      waitlistedUsers,
      totalOrders,
      recentSignups,
      allowlistRate: totalUsers > 0 ? (allowlistedUsers / totalUsers) * 100 : 0,
      waitlistProgression: waitlistProgression.map(item => ({
        date: item.joinedWaitlistAt?.toISOString().split('T')[0],
        count: item._count.id
      })),
      approvalStats: approvalStats.map(item => ({
        date: item.approvedAt?.toISOString().split('T')[0],
        count: item._count.id
      }))
    };
  } catch (error) {
    console.error('Error fetching platform stats:', error);
    return {
      totalUsers: 0,
      allowlistedUsers: 0,
      waitlistedUsers: 0,
      totalOrders: 0,
      recentSignups: 0,
      allowlistRate: 0,
      waitlistProgression: [],
      approvalStats: []
    };
  }
}

// POST endpoint for bulk operations
export async function POST(request: NextRequest) {
  try {
    // Create Supabase client
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value;
          },
          set() {
            // Not needed for server-side operations
          },
          remove() {
            // Not needed for server-side operations
          },
        },
      }
    );

    // Get session
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if current user is admin
    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { isAdmin: true }
    });

    if (!currentUser?.isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { action, userIds } = body;

    if (!action || !['approve_bulk', 'reject_bulk'].includes(action)) {
      return NextResponse.json({
        error: 'Invalid action. Must be "approve_bulk" or "reject_bulk"'
      }, { status: 400 });
    }

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json({
        error: 'userIds array is required and must not be empty'
      }, { status: 400 });
    }

    // Verify all users exist and are not admins
    const targetUsers = await prisma.user.findMany({
      where: {
        id: { in: userIds },
        isAdmin: false // Exclude admin users
      },
      select: {
        id: true,
        email: true,
        isAdmin: true
      }
    });

    if (targetUsers.length !== userIds.length) {
      return NextResponse.json({
        error: 'Some users were not found or are admin users'
      }, { status: 400 });
    }

    // Perform bulk update
    const isApprove = action === 'approve_bulk';
    const updateResult = await prisma.user.updateMany({
      where: {
        id: { in: userIds },
        isAdmin: false
      },
      data: {
        isAllowlisted: isApprove,
        isWaitlisted: !isApprove,
        approvedAt: isApprove ? new Date() : null
      }
    });

    return NextResponse.json({
      message: `${updateResult.count} users ${isApprove ? 'approved' : 'rejected'} successfully`,
      updatedCount: updateResult.count
    });

  } catch (error) {
    console.error('Error performing bulk operation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}