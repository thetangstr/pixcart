'use client'

import { useState, useEffect } from 'react'
import FeedbackWidget from '@/components/FeedbackWidget'
import Link from 'next/link'
import { Shield } from 'lucide-react'

interface User {
  id: string
  username: string
  role: string
  email: string
}

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/current')
      if (response.ok) {
        const data = await response.json()
        setUser(data.user)
      }
    } catch (error) {
      console.error('Auth check failed:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* Admin Link for Admin Users */}
      {user?.role === 'admin' && (
        <div className="fixed top-4 right-4 z-50">
          <Link
            href="/admin"
            className="inline-flex items-center px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors shadow-lg"
          >
            <Shield className="w-4 h-4 mr-2" />
            Admin Console
          </Link>
        </div>
      )}
      
      {children}
      
      {/* Feedback Widget for logged-in users */}
      {!loading && <FeedbackWidget user={user} />}
    </>
  )
}