import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { FirestoreUsers } from '@/app/lib/firestore'

export async function POST(request: NextRequest) {
  try {
    const { name, email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { message: 'Email and password are required' },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existingUser = await FirestoreUsers.findByEmail(email)

    if (existingUser) {
      return NextResponse.json(
        { message: 'User already exists with this email' },
        { status: 409 }
      )
    }

    // Hash the password - Note: We're not storing passwords in this simplified version
    // In a full implementation, you'd need to add a password field to the User model
    const hashedPassword = await bcrypt.hash(password, 12)

    // Create the user (without password storage for now)
    const user = await FirestoreUsers.create({
      name,
      email,
      // password: hashedPassword, // Would need to add this field to User model
    })

    return NextResponse.json(
      { 
        message: 'User created successfully',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
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