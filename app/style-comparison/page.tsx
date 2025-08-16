'use client'

import { useState, useEffect } from 'react'

interface StyleTask {
  id: number
  category: string
  original_image: string
  classic_image?: string
  impressionist_image?: string
  modern_image?: string
  scores?: {
    classic?: { preservation: number; style: number; overall: number }
    impressionist?: { preservation: number; style: number; overall: number }
    modern?: { preservation: number; style: number; overall: number }
  }
}

export default function StyleComparison() {
  const [tasks, setTasks] = useState<StyleTask[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [evaluations, setEvaluations] = useState<{[key: string]: any}>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadTasks()
  }, [])

  const loadTasks = async () => {
    try {
      const response = await fetch('/api/style-comparison/load-tasks')
      const data = await response.json()
      setTasks(data.tasks)
      setLoading(false)
    } catch (error) {
      console.error('Failed to load tasks:', error)
      setLoading(false)
    }
  }

  const submitScore = (taskId: number, style: string, metric: string, score: number) => {
    const key = `${taskId}_${style}`
    setEvaluations(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        [metric]: score
      }
    }))
  }

  const saveEvaluation = async (taskId: number, style: string) => {
    const key = `${taskId}_${style}`
    const scores = evaluations[key]
    
    if (!scores?.preservation || !scores?.style || !scores?.overall) {
      alert('Please complete all scores before saving')
      return
    }

    try {
      await fetch('/api/style-comparison/save-evaluation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId,
          style,
          scores
        })
      })
      
      alert(`Saved evaluation for ${style}`)
    } catch (error) {
      console.error('Failed to save:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading style comparison...</p>
        </div>
      </div>
    )
  }

  const currentTask = tasks[currentIndex]
  if (!currentTask) {
    return <div>No tasks available</div>
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🎨 Three-Style Oil Painting Comparison
          </h1>
          <p className="text-gray-600">
            Compare Classic, Impressionist, and Modern oil painting styles
          </p>
          <div className="mt-4 flex items-center gap-4">
            <span className="text-sm text-gray-500">
              Task {currentIndex + 1} of {tasks.length}
            </span>
            <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
              {currentTask.category}
            </span>
          </div>
        </div>

        {/* Original Image */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Original Photo</h2>
          <div className="flex justify-center">
            <img 
              src={currentTask.original_image} 
              alt="Original"
              className="max-w-md rounded-lg border-2 border-gray-200"
            />
          </div>
        </div>

        {/* Style Comparisons */}
        <div className="grid grid-cols-3 gap-6 mb-6">
          {/* Classic Style */}
          <div className="bg-white rounded-lg shadow-sm p-4">
            <h3 className="text-lg font-semibold mb-3 text-center">Classic Oil Portrait</h3>
            {currentTask.classic_image ? (
              <>
                <img 
                  src={currentTask.classic_image} 
                  alt="Classic"
                  className="w-full rounded-lg border-2 border-amber-200 mb-4"
                />
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-gray-600">Preservation (1-5)</label>
                    <div className="flex gap-1">
                      {[1,2,3,4,5].map(n => (
                        <button
                          key={n}
                          onClick={() => submitScore(currentTask.id, 'classic', 'preservation', n)}
                          className={`flex-1 py-2 rounded text-sm font-medium ${
                            evaluations[`${currentTask.id}_classic`]?.preservation === n
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-200 hover:bg-gray-300'
                          }`}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-600">Style Quality (1-5)</label>
                    <div className="flex gap-1">
                      {[1,2,3,4,5].map(n => (
                        <button
                          key={n}
                          onClick={() => submitScore(currentTask.id, 'classic', 'style', n)}
                          className={`flex-1 py-2 rounded text-sm font-medium ${
                            evaluations[`${currentTask.id}_classic`]?.style === n
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-200 hover:bg-gray-300'
                          }`}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-600">Overall (1-5)</label>
                    <div className="flex gap-1">
                      {[1,2,3,4,5].map(n => (
                        <button
                          key={n}
                          onClick={() => submitScore(currentTask.id, 'classic', 'overall', n)}
                          className={`flex-1 py-2 rounded text-sm font-medium ${
                            evaluations[`${currentTask.id}_classic`]?.overall === n
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-200 hover:bg-gray-300'
                          }`}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                  <button 
                    onClick={() => saveEvaluation(currentTask.id, 'classic')}
                    className="w-full bg-amber-600 text-white py-2 rounded hover:bg-amber-700"
                  >
                    Save Classic Evaluation
                  </button>
                </div>
              </>
            ) : (
              <div className="h-64 bg-gray-100 rounded flex items-center justify-center">
                <p className="text-gray-400">Processing...</p>
              </div>
            )}
          </div>

          {/* Impressionist Style */}
          <div className="bg-white rounded-lg shadow-sm p-4">
            <h3 className="text-lg font-semibold mb-3 text-center">Impressionist Style</h3>
            {currentTask.impressionist_image ? (
              <>
                <img 
                  src={currentTask.impressionist_image} 
                  alt="Impressionist"
                  className="w-full rounded-lg border-2 border-purple-200 mb-4"
                />
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-gray-600">Preservation (1-5)</label>
                    <div className="flex gap-1">
                      {[1,2,3,4,5].map(n => (
                        <button
                          key={n}
                          onClick={() => submitScore(currentTask.id, 'impressionist', 'preservation', n)}
                          className={`flex-1 py-2 rounded text-sm font-medium ${
                            evaluations[`${currentTask.id}_impressionist`]?.preservation === n
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-200 hover:bg-gray-300'
                          }`}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-600">Style Quality (1-5)</label>
                    <div className="flex gap-1">
                      {[1,2,3,4,5].map(n => (
                        <button
                          key={n}
                          onClick={() => submitScore(currentTask.id, 'impressionist', 'style', n)}
                          className={`flex-1 py-2 rounded text-sm font-medium ${
                            evaluations[`${currentTask.id}_impressionist`]?.style === n
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-200 hover:bg-gray-300'
                          }`}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-600">Overall (1-5)</label>
                    <div className="flex gap-1">
                      {[1,2,3,4,5].map(n => (
                        <button
                          key={n}
                          onClick={() => submitScore(currentTask.id, 'impressionist', 'overall', n)}
                          className={`flex-1 py-2 rounded text-sm font-medium ${
                            evaluations[`${currentTask.id}_impressionist`]?.overall === n
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-200 hover:bg-gray-300'
                          }`}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                  <button 
                    onClick={() => saveEvaluation(currentTask.id, 'impressionist')}
                    className="w-full bg-purple-600 text-white py-2 rounded hover:bg-purple-700"
                  >
                    Save Impressionist Evaluation
                  </button>
                </div>
              </>
            ) : (
              <div className="h-64 bg-gray-100 rounded flex items-center justify-center">
                <p className="text-gray-400">Processing...</p>
              </div>
            )}
          </div>

          {/* Modern Style */}
          <div className="bg-white rounded-lg shadow-sm p-4">
            <h3 className="text-lg font-semibold mb-3 text-center">Modern Expressive</h3>
            {currentTask.modern_image ? (
              <>
                <img 
                  src={currentTask.modern_image} 
                  alt="Modern"
                  className="w-full rounded-lg border-2 border-green-200 mb-4"
                />
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-gray-600">Preservation (1-5)</label>
                    <div className="flex gap-1">
                      {[1,2,3,4,5].map(n => (
                        <button
                          key={n}
                          onClick={() => submitScore(currentTask.id, 'modern', 'preservation', n)}
                          className={`flex-1 py-2 rounded text-sm font-medium ${
                            evaluations[`${currentTask.id}_modern`]?.preservation === n
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-200 hover:bg-gray-300'
                          }`}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-600">Style Quality (1-5)</label>
                    <div className="flex gap-1">
                      {[1,2,3,4,5].map(n => (
                        <button
                          key={n}
                          onClick={() => submitScore(currentTask.id, 'modern', 'style', n)}
                          className={`flex-1 py-2 rounded text-sm font-medium ${
                            evaluations[`${currentTask.id}_modern`]?.style === n
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-200 hover:bg-gray-300'
                          }`}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-600">Overall (1-5)</label>
                    <div className="flex gap-1">
                      {[1,2,3,4,5].map(n => (
                        <button
                          key={n}
                          onClick={() => submitScore(currentTask.id, 'modern', 'overall', n)}
                          className={`flex-1 py-2 rounded text-sm font-medium ${
                            evaluations[`${currentTask.id}_modern`]?.overall === n
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-200 hover:bg-gray-300'
                          }`}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                  <button 
                    onClick={() => saveEvaluation(currentTask.id, 'modern')}
                    className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700"
                  >
                    Save Modern Evaluation
                  </button>
                </div>
              </>
            ) : (
              <div className="h-64 bg-gray-100 rounded flex items-center justify-center">
                <p className="text-gray-400">Processing...</p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center bg-white rounded-lg shadow-sm p-4">
          <button
            onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
            disabled={currentIndex === 0}
            className="px-6 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50"
          >
            Previous
          </button>
          
          <span className="text-gray-600">
            {currentIndex + 1} / {tasks.length}
          </span>
          
          <button
            onClick={() => setCurrentIndex(Math.min(tasks.length - 1, currentIndex + 1))}
            disabled={currentIndex === tasks.length - 1}
            className="px-6 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  )
}