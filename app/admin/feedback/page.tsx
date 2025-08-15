'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { MessageSquare, Bug, Lightbulb, CheckCircle, Clock, XCircle, AlertCircle } from 'lucide-react'
import Link from 'next/link'

interface Feedback {
  id: string
  userId: string
  userEmail: string
  type: 'bug' | 'feature' | 'improvement' | 'other'
  title: string
  description: string
  status: 'new' | 'in_progress' | 'resolved' | 'wont_fix'
  priority: 'low' | 'medium' | 'high' | 'critical'
  createdAt: string
  updatedAt: string
}

export default function FeedbackManagement() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [feedback, setFeedback] = useState<Feedback[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'new' | 'in_progress' | 'resolved'>('all')

  useEffect(() => {
    if (status === 'loading') return
    
    if (!session || !session.user?.isAdmin) {
      router.push('/auth/not-authorized')
    } else {
      fetchFeedback()
    }
  }, [session, status, router])

  const fetchFeedback = async () => {
    try {
      const response = await fetch('/api/feedback')
      if (response.ok) {
        const data = await response.json()
        setFeedback(data)
      }
    } catch (err) {
      console.error('Error loading feedback:', err)
    } finally {
      setLoading(false)
    }
  }

  const updateStatus = async (id: string, status: string) => {
    try {
      const response = await fetch(`/api/feedback/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      
      if (response.ok) {
        await fetchFeedback()
      }
    } catch (err) {
      console.error('Error updating feedback:', err)
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'bug': return <Bug className="h-4 w-4 text-red-500" />
      case 'feature': return <Lightbulb className="h-4 w-4 text-blue-500" />
      case 'improvement': return <MessageSquare className="h-4 w-4 text-green-500" />
      default: return <AlertCircle className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'new': return <Clock className="h-4 w-4 text-yellow-500" />
      case 'in_progress': return <Clock className="h-4 w-4 text-blue-500" />
      case 'resolved': return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'wont_fix': return <XCircle className="h-4 w-4 text-gray-500" />
      default: return null
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800'
      case 'high': return 'bg-orange-100 text-orange-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'low': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const filteredFeedback = filter === 'all' 
    ? feedback 
    : feedback.filter(f => f.status === filter)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Feedback Management</h1>
            <div className="flex space-x-4">
              <Link href="/admin" className="text-amber-600 hover:text-amber-700">
                ← Back to Admin
              </Link>
            </div>
          </div>

          <div className="flex space-x-2 mb-6">
            {['all', 'new', 'in_progress', 'resolved'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f as any)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filter === f 
                    ? 'bg-orange-500 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {f === 'all' ? 'All' : f.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                <span className="ml-2 text-sm">
                  ({f === 'all' ? feedback.length : feedback.filter(fb => fb.status === f).length})
                </span>
              </button>
            ))}
          </div>

          <div className="space-y-4">
            {filteredFeedback.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No feedback items found.</p>
            ) : (
              filteredFeedback.map((item) => (
                <div key={item.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        {getTypeIcon(item.type)}
                        <h3 className="font-semibold text-lg">{item.title}</h3>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(item.priority)}`}>
                          {item.priority}
                        </span>
                      </div>
                      
                      <p className="text-gray-600 mb-3">{item.description}</p>
                      
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <span>From: {item.userEmail}</span>
                        <span>•</span>
                        <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      {getStatusIcon(item.status)}
                      <select
                        value={item.status}
                        onChange={(e) => updateStatus(item.id, e.target.value)}
                        className="px-3 py-1 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                      >
                        <option value="new">New</option>
                        <option value="in_progress">In Progress</option>
                        <option value="resolved">Resolved</option>
                        <option value="wont_fix">Won't Fix</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}