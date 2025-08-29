import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
// import { FirestoreUsers } from '@/app/lib/firestore'; // Firebase removed

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    // Only admins can manage beta testers
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { email, action } = await req.json();

    if (!email || !action) {
      return NextResponse.json({ error: 'Email and action required' }, { status: 400 });
    }

    // Firebase removed - returning mock response
    if (action === 'add') {
      return NextResponse.json({ message: `${email} is now a beta tester` });
    } else if (action === 'remove') {
      return NextResponse.json({ message: `${email} is no longer a beta tester` });
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error managing beta testers:', error);
    return NextResponse.json({ error: 'Failed to update beta tester status' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // For now, return all users and filter on frontend
    // In production, you'd want to query specifically for beta testers
    return NextResponse.json({ message: 'Use whitelist endpoint for user list' });
  } catch (error) {
    console.error('Error fetching beta testers:', error);
    return NextResponse.json({ error: 'Failed to fetch beta testers' }, { status: 500 });
  }
}export const dynamic = 'force-dynamic';
