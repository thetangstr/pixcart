import { NextRequest, NextResponse } from 'next/server';
import { getQueue } from '../../../lib/model-queue';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const queue = getQueue();
    const stats = queue.getStats();
    
    // Get individual job status if ID provided
    const jobId = request.nextUrl.searchParams.get('jobId');
    if (jobId) {
      const job = queue.getJob(jobId);
      if (!job) {
        return NextResponse.json({ error: 'Job not found' }, { status: 404 });
      }
      return NextResponse.json({ job });
    }
    
    // Return overall queue stats
    return NextResponse.json({
      stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Queue status error:', error);
    return NextResponse.json({ 
      error: 'Failed to get queue status' 
    }, { status: 500 });
  }
}