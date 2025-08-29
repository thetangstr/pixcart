import { NextRequest, NextResponse } from 'next/server'
// import { FirestoreWhitelist, FirestoreUsers } from '@/app/lib/firestore' // Firebase removed

// This endpoint initializes the admin user in the whitelist
export async function GET(request: NextRequest) {
  try {
    // Firebase removed - returning mock response
    return NextResponse.json({ 
      message: 'Admin already initialized (Firebase removed)',
      initialized: true 
    })
  } catch (error) {
    console.error('Error initializing admin:', error)
    return NextResponse.json(
      { error: 'Failed to initialize admin' },
      { status: 500 }
    )
  }
}
export const dynamic = 'force-dynamic';