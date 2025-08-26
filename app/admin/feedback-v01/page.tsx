'use client'

import { useState, useEffect } from 'react'
import { BarChart3, TrendingUp, Star, ThumbsUp, MessageCircle, AlertCircle, Download, RefreshCw, Filter } from 'lucide-react'

interface FeedbackAnalytics {
  total: number
  byCategory: Record<string, number>
  oilPaintingStats: {
    avgQuality: number
    avgBrushstroke: number
    avgPreservation: number
    avgArtistic: number
    wouldOrderRate: number
  }
  appFeatureStats: {
    avgRating: number
    avgEaseOfUse: number
    avgPerformance: number
  }
  recentFeedback: any[]
}

export default function FeedbackV01Dashboard() {
  const [analytics, setAnalytics] = useState<FeedbackAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'oil-painting' | 'app-feature'>('all')
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month' | 'all'>('all')

  const loadAnalytics = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/feedback-v01')
      const data = await response.json()
      setAnalytics(data)
    } catch (error) {
      console.error('Failed to load feedback analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAnalytics()
  }, [])

  const exportFeedback = () => {
    if (!analytics) return
    
    const dataStr = JSON.stringify(analytics, null, 2)
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr)
    
    const exportFileDefaultName = `feedback-v01-${new Date().toISOString().split('T')[0]}.json`
    
    const linkElement = document.createElement('a')
    linkElement.setAttribute('href', dataUri)
    linkElement.setAttribute('download', exportFileDefaultName)
    linkElement.click()
  }

  const RatingBar = ({ label, value, max = 5, color = 'amber' }: any) => {
    const percentage = (value / max) * 100
    const colorClasses = {
      amber: 'bg-amber-500',
      green: 'bg-green-500',
      blue: 'bg-blue-500',
      purple: 'bg-purple-500'
    }
    
    return (
      <div className="mb-3">
        <div className="flex justify-between mb-1">
          <span className="text-sm font-medium text-gray-700">{label}</span>
          <span className="text-sm font-bold text-gray-900">{value.toFixed(1)}/5</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className={`h-2 rounded-full transition-all ${colorClasses[color as keyof typeof colorClasses]}`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-amber-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading feedback analytics...</p>
        </div>
      </div>
    )
  }

  if (!analytics) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-xl shadow-lg p-8 text-center">
            <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-800 mb-2">No Feedback Data Yet</h2>
            <p className="text-gray-600">Feedback will appear here once users start submitting reviews.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <BarChart3 className="w-8 h-8 text-amber-600" />
                Feedback Analytics v0.1
              </h1>
              <p className="text-gray-600 mt-1">Internal testing feedback dashboard</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={loadAnalytics}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
              <button
                onClick={exportFeedback}
                className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
              >
                <Download className="w-4 h-4" />
                Export
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {/* Total Feedback */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <MessageCircle className="w-8 h-8 text-amber-600" />
              <span className="text-3xl font-bold text-gray-900">{analytics.total}</span>
            </div>
            <p className="text-sm text-gray-600">Total Feedback</p>
          </div>

          {/* Would Order Rate */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <ThumbsUp className="w-8 h-8 text-green-600" />
              <span className="text-3xl font-bold text-gray-900">
                {(analytics.oilPaintingStats.wouldOrderRate * 100).toFixed(0)}%
              </span>
            </div>
            <p className="text-sm text-gray-600">Would Order</p>
          </div>

          {/* Average Quality */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <Star className="w-8 h-8 text-yellow-500" />
              <span className="text-3xl font-bold text-gray-900">
                {analytics.oilPaintingStats.avgQuality.toFixed(1)}
              </span>
            </div>
            <p className="text-sm text-gray-600">Avg Quality Rating</p>
          </div>

          {/* App Rating */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <TrendingUp className="w-8 h-8 text-blue-600" />
              <span className="text-3xl font-bold text-gray-900">
                {analytics.appFeatureStats.avgRating.toFixed(1)}
              </span>
            </div>
            <p className="text-sm text-gray-600">App Rating</p>
          </div>
        </div>

        {/* Detailed Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Oil Painting Quality Metrics */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-semibold text-gray-800 mb-6 flex items-center gap-2">
              <Star className="w-6 h-6 text-amber-600" />
              Oil Painting Quality Metrics
            </h3>
            <div className="space-y-3">
              <RatingBar 
                label="Overall Quality" 
                value={analytics.oilPaintingStats.avgQuality} 
                color="amber"
              />
              <RatingBar 
                label="Brushstroke Visibility" 
                value={analytics.oilPaintingStats.avgBrushstroke} 
                color="purple"
              />
              <RatingBar 
                label="Subject Preservation" 
                value={analytics.oilPaintingStats.avgPreservation} 
                color="blue"
              />
              <RatingBar 
                label="Artistic Appeal" 
                value={analytics.oilPaintingStats.avgArtistic} 
                color="green"
              />
            </div>
            
            <div className="mt-6 pt-6 border-t">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700">Conversion Rate</span>
                <span className="text-2xl font-bold text-green-600">
                  {(analytics.oilPaintingStats.wouldOrderRate * 100).toFixed(0)}%
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">Users who would order hand-painted version</p>
            </div>
          </div>

          {/* App Feature Ratings */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-semibold text-gray-800 mb-6 flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-blue-600" />
              App Feature Ratings
            </h3>
            <div className="space-y-3">
              <RatingBar 
                label="Overall Rating" 
                value={analytics.appFeatureStats.avgRating} 
                color="blue"
              />
              <RatingBar 
                label="Ease of Use" 
                value={analytics.appFeatureStats.avgEaseOfUse} 
                color="green"
              />
              <RatingBar 
                label="Performance" 
                value={analytics.appFeatureStats.avgPerformance} 
                color="purple"
              />
            </div>
            
            <div className="mt-6 pt-6 border-t">
              <h4 className="font-medium text-gray-700 mb-3">Feedback by Category</h4>
              <div className="space-y-2">
                {Object.entries(analytics.byCategory).map(([category, count]) => (
                  <div key={category} className="flex justify-between">
                    <span className="text-sm capitalize text-gray-600">
                      {category.replace('-', ' ')}
                    </span>
                    <span className="text-sm font-medium text-gray-900">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Recent Feedback */}
        <div className="mt-8">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-semibold text-gray-800 mb-6 flex items-center gap-2">
              <MessageCircle className="w-6 h-6 text-amber-600" />
              Recent Feedback
            </h3>
            
            <div className="space-y-4">
              {analytics.recentFeedback.map((item: any) => (
                <div key={item.id} className="border-l-4 border-amber-400 pl-4 py-2">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-medium text-white bg-amber-500 px-2 py-1 rounded">
                      {item.category}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(item.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700">{item.message}</p>
                  
                  {item.oilPaintingFeedback && (
                    <div className="mt-2 flex gap-4 text-xs text-gray-500">
                      <span>Quality: {item.oilPaintingFeedback.quality}/5</span>
                      <span>Brushstrokes: {item.oilPaintingFeedback.brushstrokeVisibility}/5</span>
                      <span>Would Order: {item.oilPaintingFeedback.wouldOrder ? '✅' : '❌'}</span>
                    </div>
                  )}
                  
                  {item.appFeatureFeedback && (
                    <div className="mt-2 flex gap-4 text-xs text-gray-500">
                      <span>Feature: {item.appFeatureFeedback.feature}</span>
                      <span>Rating: {item.appFeatureFeedback.rating}/5</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}