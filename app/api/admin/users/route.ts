import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, isAdmin } from '@/lib/auth'

// Mock user database - in production, use a real database
const mockUsers = [
  {
    id: '1',
    username: 'admin',
    email: 'admin@oilpainting.app',
    role: 'admin' as const
  },
  {
    id: '2',
    username: 'testuser',
    email: 'test@oilpainting.app',
    role: 'user' as const
  }
]

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    
    if (!isAdmin(user)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }
    
    // Return users without passwords
    return NextResponse.json({ users: mockUsers })
  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    )
  }
}