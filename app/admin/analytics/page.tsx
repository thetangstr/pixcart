'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { BarChart, TrendingUp, Users, Download, Upload, Eye, ArrowUp, ArrowDown } from 'lucide-react'
import Link from 'next/link'

interface AnalyticsSummary {
  total: number
  today: number
  thisWeek: number
  pageviews: number
  conversions: number
  uploads: number
  downloads: number
  topPages: Array<{ page: string; count: number }>
  recentEvents: Array<{
    type: string
    page?: string
    action?: string
    timestamp: string
  }>
}

export default function AnalyticsDashboard() {
  const router = useRouter()
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    checkAuthAndLoadAnalytics()
  }, [])

  const checkAuthAndLoadAnalytics = async () => {
    try {
      // Check if user is admin
      const authResponse = await fetch('/api/auth/current')
      if (authResponse.ok) {
        const authData = await authResponse.json()
        if (!authData.user || authData.user.role !== 'admin') {
          router.push('/login')
          return
        }
      } else {
        router.push('/login')
        return
      }

      // Load analytics
      const response = await fetch('/api/analytics/track')
      if (response.ok) {
        const data = await response.json()
        setAnalytics(data)
      } else {
        setError('Failed to load analytics')
      }
    } catch (err) {
      setError('Error loading analytics')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-orange-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading analytics...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-orange-50">
        <div className="text-center">
          <p className="text-red-600">{error}</p>
          <Link href="/admin" className="mt-4 text-amber-600 hover:text-amber-700">
            Back to Admin
          </Link>
        </div>
      </div>
    )
  }

  if (!analytics) return null

  const conversionRate = analytics.pageviews > 0 
    ? ((analytics.conversions / analytics.pageviews) * 100).toFixed(1)
    : '0'

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <BarChart className="w-8 h-8 text-amber-600 mr-3" />
              <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
            </div>
            <Link 
              href="/admin"
              className="text-sm px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Back to Admin
            </Link>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Events */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <TrendingUp className="w-6 h-6 text-blue-600" />
              </div>
              <span className="text-sm text-gray-500">All Time</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{analytics.total.toLocaleString()}</p>
            <p className="text-sm text-gray-600 mt-1">Total Events</p>
          </div>

          {/* Today's Events */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <Eye className="w-6 h-6 text-green-600" />
              </div>
              <span className="text-sm text-gray-500">Today</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{analytics.today.toLocaleString()}</p>
            <p className="text-sm text-gray-600 mt-1">Events Today</p>
          </div>

          {/* Conversions */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-amber-100 rounded-lg">
                <Upload className="w-6 h-6 text-amber-600" />
              </div>
              <span className="text-sm text-green-600 font-medium">{conversionRate}%</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{analytics.conversions.toLocaleString()}</p>
            <p className="text-sm text-gray-600 mt-1">Conversions</p>
          </div>

          {/* Downloads */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-purple-100 rounded-lg">
                <Download className="w-6 h-6 text-purple-600" />
              </div>
              <span className="text-sm text-gray-500">All Time</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{analytics.downloads.toLocaleString()}</p>
            <p className="text-sm text-gray-600 mt-1">Downloads</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Top Pages */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Top Pages</h2>
            <div className="space-y-3">
              {analytics.topPages.map((page, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <span className="text-sm font-medium text-gray-500 w-6">{index + 1}.</span>
                    <span className="text-sm text-gray-700 ml-2">{page.page}</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-sm font-semibold text-gray-900">{page.count.toLocaleString()}</span>
                    <span className="text-xs text-gray-500 ml-2">views</span>
                  </div>
                </div>
              ))}
              {analytics.topPages.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">No page views yet</p>
              )}
            </div>
          </div>

          {/* Recent Events */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Events</h2>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {analytics.recentEvents.map((event, index) => (
                <div key={index} className="flex items-start space-x-3 py-2 border-b border-gray-100 last:border-0">
                  <div className={`p-1 rounded ${
                    event.type === 'conversion' ? 'bg-green-100' :
                    event.type === 'upload' ? 'bg-amber-100' :
                    event.type === 'download' ? 'bg-purple-100' :
                    'bg-gray-100'
                  }`}>
                    {event.type === 'conversion' ? <TrendingUp className="w-4 h-4 text-green-600" /> :
                     event.type === 'upload' ? <Upload className="w-4 h-4 text-amber-600" /> :
                     event.type === 'download' ? <Download className="w-4 h-4 text-purple-600" /> :
                     <Eye className="w-4 h-4 text-gray-600" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{event.type}</p>
                    {event.page && <p className="text-xs text-gray-500 truncate">{event.page}</p>}
                    <p className="text-xs text-gray-400">
                      {new Date(event.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
              {analytics.recentEvents.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">No events recorded yet</p>
              )}
            </div>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="bg-gradient-to-r from-amber-500 to-orange-600 rounded-xl shadow-lg p-6 mt-8 text-white">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
            <div>
              <p className="text-3xl font-bold">{analytics.thisWeek.toLocaleString()}</p>
              <p className="text-amber-100 mt-1">Events This Week</p>
            </div>
            <div>
              <p className="text-3xl font-bold">{analytics.uploads.toLocaleString()}</p>
              <p className="text-amber-100 mt-1">Total Uploads</p>
            </div>
            <div>
              <p className="text-3xl font-bold">{analytics.pageviews.toLocaleString()}</p>
              <p className="text-amber-100 mt-1">Total Page Views</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}