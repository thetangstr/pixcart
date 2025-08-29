'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Shield, Users, MessageCircle, Bug, Lightbulb, Trash2, Edit2, X, Check, Server, Activity, BarChart3, TrendingUp } from 'lucide-react'
import Link from 'next/link'

interface User {
  id: string
  username: string
  email: string
  role: 'admin' | 'user'
}

interface FeedbackItem {
  id: string
  type: 'feedback' | 'bug' | 'feature'
  message: string
  userId: string
  username: string
  timestamp: string
}

export default function AdminConsole() {
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [feedbackItems, setFeedbackItems] = useState<FeedbackItem[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'models' | 'users' | 'feedback'>('models')
  const [editingUser, setEditingUser] = useState<string | null>(null)
  const [newPassword, setNewPassword] = useState('')

  useEffect(() => {
    checkAuth()
    fetchUsers()
    fetchFeedback()
  }, [])

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/current')
      if (response.ok) {
        const data = await response.json()
        if (data.user && data.user.role === 'admin') {
          setCurrentUser(data.user)
        } else {
          router.push('/login')
        }
      } else {
        router.push('/login')
      }
    } catch (error) {
      router.push('/login')
    } finally {
      setLoading(false)
    }
  }

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/admin/users')
      if (response.ok) {
        const data = await response.json()
        setUsers(data.users)
      }
    } catch (error) {
      console.error('Failed to fetch users:', error)
    }
  }

  const fetchFeedback = async () => {
    try {
      const response = await fetch('/api/admin/feedback')
      if (response.ok) {
        const data = await response.json()
        setFeedbackItems(data.feedback)
      }
    } catch (error) {
      console.error('Failed to fetch feedback:', error)
    }
  }

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return
    
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE'
      })
      if (response.ok) {
        fetchUsers()
      }
    } catch (error) {
      console.error('Failed to delete user:', error)
    }
  }

  const handleUpdatePassword = async (userId: string) => {
    if (!newPassword) return
    
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newPassword })
      })
      if (response.ok) {
        setEditingUser(null)
        setNewPassword('')
        alert('Password updated successfully')
      }
    } catch (error) {
      console.error('Failed to update password:', error)
    }
  }

  const handleDeleteFeedback = async (feedbackId: string) => {
    try {
      const response = await fetch(`/api/admin/feedback/${feedbackId}`, {
        method: 'DELETE'
      })
      if (response.ok) {
        fetchFeedback()
      }
    } catch (error) {
      console.error('Failed to delete feedback:', error)
    }
  }

  const getFeedbackIcon = (type: string) => {
    switch (type) {
      case 'bug':
        return <Bug className="w-4 h-4 text-red-600" />
      case 'feature':
        return <Lightbulb className="w-4 h-4 text-blue-600" />
      default:
        return <MessageCircle className="w-4 h-4 text-amber-600" />
    }
  }

  const getFeedbackBadgeColor = (type: string) => {
    switch (type) {
      case 'bug':
        return 'bg-red-100 text-red-700'
      case 'feature':
        return 'bg-blue-100 text-blue-700'
      default:
        return 'bg-amber-100 text-amber-700'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-orange-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading admin console...</p>
        </div>
      </div>
    )
  }

  if (!currentUser || currentUser.role !== 'admin') {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-amber-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Shield className="w-8 h-8 text-amber-600 mr-3" />
              <h1 className="text-xl font-bold text-gray-900">Admin Console</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Link 
                href="/admin/analytics"
                className="text-sm px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                Analytics
              </Link>
              <span className="text-sm text-gray-600">Logged in as: {currentUser.username}</span>
              <Link 
                href="/"
                className="text-sm px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
              >
                Back to App
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('models')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'models'
                  ? 'border-amber-500 text-amber-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Server className="w-4 h-4 inline mr-2" />
              Models & Production
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'users'
                  ? 'border-amber-500 text-amber-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Users className="w-4 h-4 inline mr-2" />
              Users ({users.length})
            </button>
            <button
              onClick={() => setActiveTab('feedback')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'feedback'
                  ? 'border-amber-500 text-amber-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <MessageCircle className="w-4 h-4 inline mr-2" />
              Feedback ({feedbackItems.length})
            </button>
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        {activeTab === 'models' && (
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-800">Model Management & Production Settings</h2>
              <p className="text-sm text-gray-600 mt-1">Configure and test oil painting models</p>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Link
                  href="/admin/models"
                  className="flex items-center justify-center px-4 py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
                >
                  <Server className="w-5 h-5 mr-2" />
                  Model Dashboard
                </Link>
                <Link
                  href="/api/system-status"
                  target="_blank"
                  className="flex items-center justify-center px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Activity className="w-5 h-5 mr-2" />
                  System Status
                </Link>
                <Link
                  href="/admin/analytics"
                  className="flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <BarChart3 className="w-5 h-5 mr-2" />
                  Analytics
                </Link>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-medium text-gray-800 mb-3">Quick Status</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Production Model:</span>
                    <span className="font-medium text-green-600">Optimized Local SDXL</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Backup Model:</span>
                    <span className="font-medium text-blue-600">Replicate Cloud</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Processing Mode:</span>
                    <span className="font-medium">Expert-Tuned (0.75 denoising, CFG 13.0)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {activeTab === 'users' && (
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">User Management</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Username
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{user.username}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          user.role === 'admin' 
                            ? 'bg-purple-100 text-purple-800' 
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {editingUser === user.id ? (
                          <div className="flex items-center space-x-2">
                            <input
                              type="password"
                              placeholder="New password"
                              value={newPassword}
                              onChange={(e) => setNewPassword(e.target.value)}
                              className="px-2 py-1 border border-gray-300 rounded text-sm"
                            />
                            <button
                              onClick={() => handleUpdatePassword(user.id)}
                              className="text-green-600 hover:text-green-700"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setEditingUser(null)
                                setNewPassword('')
                              }}
                              className="text-gray-600 hover:text-gray-700"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-3">
                            <button
                              onClick={() => setEditingUser(user.id)}
                              className="text-blue-600 hover:text-blue-700"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            {user.role !== 'admin' && (
                              <button
                                onClick={() => handleDeleteUser(user.id)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'feedback' && (
          <div className="space-y-4">
            {/* Link to advanced feedback dashboard */}
            <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold mb-2">Advanced Feedback Dashboard</h3>
                  <p className="text-purple-100">Manage feedback with priority marking and Claude integration</p>
                </div>
                <Link 
                  href="/admin/feedback"
                  className="px-6 py-3 bg-white text-purple-600 rounded-lg font-semibold hover:bg-purple-50 transition-colors"
                >
                  Open Dashboard →
                </Link>
              </div>
            </div>
            
            {feedbackItems.length === 0 ? (
              <div className="bg-white rounded-xl shadow-lg p-8 text-center">
                <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No feedback received yet</p>
              </div>
            ) : (
              feedbackItems.map((item) => (
                <div key={item.id} className="bg-white rounded-xl shadow-lg p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      {getFeedbackIcon(item.type)}
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getFeedbackBadgeColor(item.type)}`}>
                            {item.type}
                          </span>
                          <span className="text-sm text-gray-500">
                            from {item.username}
                          </span>
                          <span className="text-sm text-gray-400">
                            • {new Date(item.timestamp).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-gray-700">{item.message}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteFeedback(item.id)}
                      className="text-red-600 hover:text-red-700 ml-4"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}