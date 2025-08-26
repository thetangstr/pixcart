import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { FirestoreWhitelist, FirestoreUsers } from '@/app/lib/firestore'

export async function GET(request: NextRequest) {
  try {
    // Check if user is admin
    const session = await getServerSession(authOptions)
    
    if (!session || session.user?.email !== 'thetangstr@gmail.com') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get all whitelist entries
    const whitelist = await FirestoreWhitelist.getAll()
    
    // Always include admin in the list
    const adminInList = whitelist.some(entry => entry.email === 'thetangstr@gmail.com')
    if (!adminInList) {
      whitelist.unshift({
        id: 'admin',
        email: 'thetangstr@gmail.com',
        addedBy: 'System',
        addedAt: new Date(),
        notes: 'System Administrator'
      })
    }
    
    return NextResponse.json(whitelist)
  } catch (error) {
    console.error('Error fetching whitelist:', error)
    return NextResponse.json(
      { error: 'Failed to fetch whitelist' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check if user is admin
    const session = await getServerSession(authOptions)
    
    if (!session || session.user?.email !== 'thetangstr@gmail.com') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { email, notes, action } = await request.json()

    if (!email || !action) {
      return NextResponse.json(
        { error: 'Email and action are required' },
        { status: 400 }
      )
    }

    if (action === 'add') {
      // Don't allow duplicate entries
      const isAlreadyWhitelisted = await FirestoreWhitelist.isWhitelisted(email)
      if (isAlreadyWhitelisted) {
        return NextResponse.json(
          { error: 'Email is already whitelisted' },
          { status: 400 }
        )
      }

      await FirestoreWhitelist.add(
        email,
        session.user.email!,
        notes
      )
      
      // If notes include "Beta", mark user as beta tester
      if (notes?.toLowerCase().includes('beta')) {
        const user = await FirestoreUsers.findByEmail(email)
        if (user) {
          await FirestoreUsers.update(user.id, { isBetaTester: true })
        }
      }
      
      return NextResponse.json({ success: true, message: 'Email added to whitelist' })
    } else if (action === 'remove') {
      // Don't allow removing admin
      if (email === 'thetangstr@gmail.com') {
        return NextResponse.json(
          { error: 'Cannot remove admin from whitelist' },
          { status: 400 }
        )
      }

      await FirestoreWhitelist.remove(email)
      
      return NextResponse.json({ success: true, message: 'Email removed from whitelist' })
    } else {
      return NextResponse.json(
        { error: 'Invalid action' },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('Error updating whitelist:', error)
    return NextResponse.json(
      { error: 'Failed to update whitelist' },
      { status: 500 }
    )
  }
}