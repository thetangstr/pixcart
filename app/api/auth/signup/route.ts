import { NextRequest, NextResponse } from 'next/server'
// import bcrypt from 'bcryptjs' // Package removed
// import { FirestoreUsers } from '@/app/lib/firestore' // Firebase removed

export async function POST(request: NextRequest) {
  try {
    const { name, email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { message: 'Email and password are required' },
        { status: 400 }
      )
    }

    // Firebase removed - returning mock response
    // Hash the password - bcrypt removed
    // const hashedPassword = await bcrypt.hash(password, 12)

    return NextResponse.json(
      { 
        message: 'User created successfully',
        user: {
          id: 'mock-id',
          email: email,
          name: name,
        }
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Signup error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
export const dynamic = 'force-dynamic';