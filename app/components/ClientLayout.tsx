'use client'

import { useState, useEffect } from 'react'
import FeedbackWidget from '@/components/FeedbackWidget'
import AnalyticsTracker from './AnalyticsTracker'
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
      const response = await fetch('/api/auth/current', {
        // Add credentials and headers to prevent 401 console errors
        credentials: 'same-origin',
        headers: { 'Accept': 'application/json' }
      })
      if (response.ok) {
        const data = await response.json()
        setUser(data.user)
      } else if (response.status === 401) {
        // User is not logged in - this is expected, not an error
        setUser(null)
      } else {
        console.warn(`Auth check returned ${response.status}`)
      }
    } catch (error) {
      // Only log actual network errors, not 401s
      console.warn('Auth check failed:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <AnalyticsTracker />
      
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