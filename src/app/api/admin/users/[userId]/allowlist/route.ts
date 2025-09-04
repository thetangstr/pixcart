import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { prisma } from '@/lib/prisma';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
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

    // Parse request body
    const body = await request.json();
    const { action } = body; // 'approve' or 'reject'

    if (!action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ 
        error: 'Invalid action. Must be "approve" or "reject"' 
      }, { status: 400 });
    }

    // Find the user to update
    const targetUser = await prisma.user.findUnique({
      where: { id: params.userId },
      select: {
        id: true,
        email: true,
        name: true,
        isAdmin: true,
        isAllowlisted: true,
        isWaitlisted: true
      }
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Prevent changes to admin users
    if (targetUser.isAdmin) {
      return NextResponse.json({ 
        error: 'Cannot modify admin user allowlist status' 
      }, { status: 400 });
    }

    // Update user based on action
    const updatedUser = await prisma.user.update({
      where: { id: params.userId },
      data: {
        isAllowlisted: action === 'approve',
        isWaitlisted: action === 'reject' || !targetUser.isAllowlisted, // Keep waitlisted if rejecting or if not previously approved
        approvedAt: action === 'approve' ? new Date() : null,
      },
      select: {
        id: true,
        email: true,
        name: true,
        isAllowlisted: true,
        isWaitlisted: true,
        approvedAt: true,
        joinedWaitlistAt: true
      }
    });

    return NextResponse.json({
      message: `User ${action === 'approve' ? 'approved' : 'rejected'} successfully`,
      user: updatedUser
    });

  } catch (error) {
    console.error('Error updating user allowlist status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Get allowlist status for a specific user
export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
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

    // Find the user
    const targetUser = await prisma.user.findUnique({
      where: { id: params.userId },
      select: {
        id: true,
        email: true,
        name: true,
        isAdmin: true,
        isAllowlisted: true,
        isWaitlisted: true,
        approvedAt: true,
        joinedWaitlistAt: true,
        createdAt: true,
        // Include usage statistics
        apiUsage: {
          select: {
            cost: true,
            success: true,
            createdAt: true
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: 100 // Last 100 API calls
        }
      }
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Calculate usage statistics
    const totalApiCalls = targetUser.apiUsage.length;
    const totalCost = targetUser.apiUsage.reduce((sum, usage) => sum + (usage.cost || 0), 0);
    const successfulCalls = targetUser.apiUsage.filter(u => u.success).length;
    const successRate = totalApiCalls > 0 ? (successfulCalls / totalApiCalls) * 100 : 0;

    return NextResponse.json({
      user: {
        ...targetUser,
        apiUsage: undefined, // Remove detailed usage from response
        usageStats: {
          totalApiCalls,
          totalCost,
          successfulCalls,
          successRate,
          lastApiCall: targetUser.apiUsage[0]?.createdAt || null
        }
      }
    });

  } catch (error) {
    console.error('Error fetching user allowlist status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}