'use client'

import React, { useState, useEffect } from 'react'
import Image from 'next/image'

interface EvaluationTask {
  id: string | number
  original_image: string
  converted_image: string
  parameters: {
    denoising_strength?: number
    cfg_scale?: number
    canny_weight?: number
    style?: string
    [key: string]: any
  }
  timestamp: string
  category?: string
}

interface EvaluationScore {
  preservation: 1 | 2 | 3 | 4 | 5  // 5 = perfect, 1 = failed
  style: 1 | 2 | 3 | 4 | 5         // 5 = excellent, 1 = poor
  overall: 1 | 2 | 3 | 4 | 5       // 5 = production ready, 1 = reject
  comments?: string
}

export default function HumanEvaluationPage() {
  const [currentTask, setCurrentTask] = useState<EvaluationTask | null>(null)
  const [loading, setLoading] = useState(false)
  const [score, setScore] = useState<EvaluationScore>({
    preservation: 3,
    style: 3,
    overall: 3
  })
  const [comments, setComments] = useState('')
  const [stats, setStats] = useState({
    evaluated: 0,
    pending: 0,
    avgPreservation: 0,
    avgStyle: 0,
    avgOverall: 0
  })

  // Fetch next task for evaluation
  const fetchNextTask = async () => {
    setLoading(true)
    try {
      // Try to get real task first
      const response = await fetch('/api/human-eval/get-real-task')
      const data = await response.json()
      
      if (data.task) {
        setCurrentTask(data.task)
        setStats(data.stats)
      } else {
        // Fallback to mock task
        const mockResponse = await fetch('/api/human-eval/next-task')
        const mockData = await mockResponse.json()
        setCurrentTask(mockData.task)
        setStats(mockData.stats)
      }
      
      setScore({
        preservation: 3,
        style: 3,
        overall: 3
      })
      setComments('')
    } catch (error) {
      console.error('Failed to fetch task:', error)
    }
    setLoading(false)
  }

  // Submit evaluation
  const submitEvaluation = async () => {
    if (!currentTask) return
    
    setLoading(true)
    try {
      // Save to real task if it exists
      if (currentTask.id && typeof currentTask.id === 'number') {
        await fetch('/api/human-eval/get-real-task', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            taskId: currentTask.id,
            preservation: score.preservation,
            style: score.style,
            overall: score.overall,
            comments: comments
          })
        })
      } else {
        // Fallback to old endpoint
        await fetch('/api/human-eval/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            task_id: currentTask.id,
            preservation: score.preservation,
            style: score.style,
            overall: score.overall,
            comments: comments,
            parameters: currentTask.parameters
          })
        })
      }
      
      // Fetch next task
      await fetchNextTask()
    } catch (error) {
      console.error('Failed to submit evaluation:', error)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchNextTask()
  }, [])

  if (!currentTask) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading evaluation task...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🎨 Human Evaluation System
          </h1>
          <p className="text-gray-600">
            Help train the AI by evaluating oil painting conversions
          </p>
          
          {/* Stats */}
          <div className="grid grid-cols-5 gap-4 mt-6">
            <div className="bg-blue-50 rounded-lg p-3">
              <div className="text-2xl font-bold text-blue-600">{stats.evaluated}</div>
              <div className="text-sm text-gray-600">Evaluated</div>
            </div>
            <div className="bg-yellow-50 rounded-lg p-3">
              <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
              <div className="text-sm text-gray-600">Pending</div>
            </div>
            <div className="bg-purple-50 rounded-lg p-3">
              <div className="text-2xl font-bold text-purple-600">{stats.avgPreservation.toFixed(1)}</div>
              <div className="text-sm text-gray-600">Avg Preserve</div>
            </div>
            <div className="bg-green-50 rounded-lg p-3">
              <div className="text-2xl font-bold text-green-600">{stats.avgStyle.toFixed(1)}</div>
              <div className="text-sm text-gray-600">Avg Style</div>
            </div>
            <div className="bg-indigo-50 rounded-lg p-3">
              <div className="text-2xl font-bold text-indigo-600">{stats.avgOverall.toFixed(1)}</div>
              <div className="text-sm text-gray-600">Avg Overall</div>
            </div>
          </div>
        </div>

        {/* Image Comparison */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Compare Images</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Original</h3>
              <div className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden">
                <img
                  src={currentTask.original_image}
                  alt="Original"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">
                Oil Painting Result
              </h3>
              <div className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden">
                <img
                  src={currentTask.converted_image}
                  alt="Converted"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
          
          {/* Parameters Info */}
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">
              <span className="font-medium">Parameters:</span>{' '}
              Denoising: {currentTask.parameters?.denoising_strength?.toFixed(2) || 'N/A'} | 
              CFG: {currentTask.parameters?.cfg_scale?.toFixed(1) || 'N/A'} | 
              {currentTask.parameters?.canny_weight && `Canny: ${currentTask.parameters.canny_weight.toFixed(2)} | `}
              Style: {currentTask.parameters?.style || 'default'}
            </p>
          </div>
        </div>

        {/* Evaluation Form */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold mb-4">Your Evaluation</h2>
          
          {/* Preservation Score */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              1. Subject Preservation (Is it still the same subject?)
            </label>
            <div className="grid grid-cols-5 gap-2">
              {[
                { value: 5, emoji: '😊', label: 'Perfect', desc: 'Identical subject', color: 'green' },
                { value: 4, emoji: '🙂', label: 'Great', desc: 'Very minor changes', color: 'lime' },
                { value: 3, emoji: '😐', label: 'Good', desc: 'Recognizable', color: 'yellow' },
                { value: 2, emoji: '😕', label: 'Poor', desc: 'Major changes', color: 'orange' },
                { value: 1, emoji: '😱', label: 'Failed', desc: 'Wrong species', color: 'red' }
              ].map((tier) => (
                <button
                  key={tier.value}
                  onClick={() => setScore({...score, preservation: tier.value as 1|2|3|4|5})}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    score.preservation === tier.value
                      ? `border-${tier.color}-500 bg-${tier.color}-50`
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="text-xl mb-1">{tier.emoji}</div>
                  <div className={`text-sm font-medium text-${tier.color}-600`}>{tier.value}</div>
                  <div className="text-xs text-gray-600 mt-1">{tier.label}</div>
                  <div className="text-xs text-gray-500">{tier.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Style Score */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              2. Oil Painting Style Quality
            </label>
            <div className="grid grid-cols-5 gap-2">
              {[
                { value: 5, emoji: '🎨', label: 'Museum', desc: 'Museum quality', color: 'green' },
                { value: 4, emoji: '🖼️', label: 'Professional', desc: 'Very good', color: 'lime' },
                { value: 3, emoji: '🖌️', label: 'Good', desc: 'Decent effect', color: 'yellow' },
                { value: 2, emoji: '✏️', label: 'Poor', desc: 'Weak effect', color: 'orange' },
                { value: 1, emoji: '❌', label: 'Failed', desc: 'No oil effect', color: 'red' }
              ].map((tier) => (
                <button
                  key={tier.value}
                  onClick={() => setScore({...score, style: tier.value as 1|2|3|4|5})}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    score.style === tier.value
                      ? `border-${tier.color}-500 bg-${tier.color}-50`
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="text-xl mb-1">{tier.emoji}</div>
                  <div className={`text-sm font-medium text-${tier.color}-600`}>{tier.value}</div>
                  <div className="text-xs text-gray-600 mt-1">{tier.label}</div>
                  <div className="text-xs text-gray-500">{tier.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Overall Score */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              3. Overall Assessment
            </label>
            <div className="grid grid-cols-5 gap-2">
              {[
                { value: 5, emoji: '✅', label: 'Approve', desc: 'Production ready', color: 'green' },
                { value: 4, emoji: '👍', label: 'Good', desc: 'Deploy with review', color: 'lime' },
                { value: 3, emoji: '🔧', label: 'Needs Work', desc: 'Minor fixes', color: 'yellow' },
                { value: 2, emoji: '⚠️', label: 'Poor', desc: 'Major issues', color: 'orange' },
                { value: 1, emoji: '🚫', label: 'Reject', desc: 'Unacceptable', color: 'red' }
              ].map((tier) => (
                <button
                  key={tier.value}
                  onClick={() => setScore({...score, overall: tier.value as 1|2|3|4|5})}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    score.overall === tier.value
                      ? `border-${tier.color}-500 bg-${tier.color}-50`
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="text-xl mb-1">{tier.emoji}</div>
                  <div className={`text-sm font-medium text-${tier.color}-600`}>{tier.value}</div>
                  <div className="text-xs text-gray-600 mt-1">{tier.label}</div>
                  <div className="text-xs text-gray-500">{tier.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Comments */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Optional Comments
            </label>
            <textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={3}
              placeholder="Any specific issues or suggestions?"
            />
          </div>

          {/* Submit Button */}
          <div className="flex justify-between">
            <button
              onClick={() => fetchNextTask()}
              disabled={loading}
              className="px-6 py-3 text-gray-600 hover:text-gray-800"
            >
              Skip
            </button>
            
            <button
              onClick={submitEvaluation}
              disabled={loading}
              className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
            >
              {loading ? 'Submitting...' : 'Submit & Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}