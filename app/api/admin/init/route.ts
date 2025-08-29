import { NextRequest, NextResponse } from 'next/server'
import { FirestoreWhitelist, FirestoreUsers } from '@/app/lib/firestore'

// This endpoint initializes the admin user in the whitelist
export async function GET(request: NextRequest) {
  try {
    const adminEmail = 'thetangstr@gmail.com'
    
    // Check if admin is already whitelisted
    const isWhitelisted = await FirestoreWhitelist.isWhitelisted(adminEmail)
    
    if (!isWhitelisted) {
      // Add admin to whitelist
      await FirestoreWhitelist.add(
        adminEmail,
        'System',
        'System Administrator - Auto-added'
      )
      
      // Update user if exists
      const user = await FirestoreUsers.findByEmail(adminEmail)
      if (user) {
        await FirestoreUsers.update(user.id, { 
          isAdmin: true, 
          isWhitelisted: true 
        })
      }
      
      return NextResponse.json({ 
        message: 'Admin initialized and added to whitelist',
        initialized: true 
      })
    }
    
    return NextResponse.json({ 
      message: 'Admin already in whitelist',
      initialized: false 
    })
  } catch (error) {
    console.error('Error initializing admin:', error)
    return NextResponse.json(
      { error: 'Failed to initialize admin' },
      { status: 500 }
    )
  }
}export const dynamic = 'force-dynamic';
