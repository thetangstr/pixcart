import { cookies } from 'next/headers'
import { NextRequest } from 'next/server'

// Simple in-memory user store (in production, use a database)
const users = [
  {
    id: '1',
    username: 'admin',
    password: 'admin123', // In production, hash passwords
    role: 'admin',
    email: 'admin@oilpainting.app'
  },
  {
    id: '2',
    username: 'testuser',
    password: 'password',
    role: 'user',
    email: 'test@oilpainting.app'
  }
]

export interface User {
  id: string
  username: string
  role: 'admin' | 'user'
  email: string
}

export async function authenticate(username: string, password: string): Promise<User | null> {
  const user = users.find(u => u.username === username && u.password === password)
  
  if (user) {
    const { password: _, ...userWithoutPassword } = user
    return userWithoutPassword
  }
  
  return null
}

export async function getCurrentUser(request?: NextRequest): Promise<User | null> {
  const cookieStore = request ? request.cookies : cookies()
  const sessionCookie = cookieStore.get('session')
  
  if (!sessionCookie) return null
  
  try {
    const sessionData = JSON.parse(sessionCookie.value)
    const user = users.find(u => u.id === sessionData.userId)
    
    if (user) {
      const { password: _, ...userWithoutPassword } = user
      return userWithoutPassword
    }
  } catch {
    // Invalid session
  }
  
  return null
}

export async function createSession(user: User) {
  const sessionData = {
    userId: user.id,
    username: user.username,
    role: user.role,
    createdAt: Date.now()
  }
  
  const cookieStore = cookies()
  cookieStore.set('session', JSON.stringify(sessionData), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7 // 7 days
  })
}

export async function destroySession() {
  const cookieStore = cookies()
  cookieStore.delete('session')
}

export function isAdmin(user: User | null): boolean {
  return user?.role === 'admin'
}

export function canAccessFeedback(user: User | null): boolean {
  return user !== null // Any logged-in user can access feedback
}