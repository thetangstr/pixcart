'use client'

import { useState, useEffect } from 'react'

interface StyleData {
  image: string | null
  name: string
  denoising_strength?: number
  cfg_scale?: number
  sampler?: string
  controlnet_weight?: number
  human_score?: { preservation: number; style: number; overall: number }
  feedback?: string
}

interface Task {
  id: number
  category: string
  original_image: string
  styles: {
    classic: StyleData
    impressionist: StyleData
    modern: StyleData
  }
}

export default function UnifiedEvaluation() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [evaluatingStyle, setEvaluatingStyle] = useState<string | null>(null)
  const [tempScores, setTempScores] = useState<any>({})

  useEffect(() => {
    loadTasks()
  }, [])

  useEffect(() => {
    // Keyboard navigation
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' && currentIndex > 0) {
        setCurrentIndex(currentIndex - 1)
      } else if (e.key === 'ArrowRight' && currentIndex < tasks.length - 1) {
        setCurrentIndex(currentIndex + 1)
      }
    }
    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [currentIndex, tasks.length])

  const loadTasks = async () => {
    try {
      // Try v2 distinct tasks first (with proper style variations)
      let response = await fetch('/api/evaluation/load-distinct-tasks-v2')
      let data = await response.json()
      
      // Fallback to other task sources if needed
      if (!data.tasks || data.tasks.length === 0) {
        response = await fetch('/api/evaluation-dashboard/load-universal-tasks')
        data = await response.json()
      }
      
      setTasks(data.tasks || [])
    } catch (error) {
      console.error('Failed to load tasks:', error)
    }
    setLoading(false)
  }

  const submitScore = async (taskId: number, style: string) => {
    const scores = tempScores[`${taskId}_${style}`]
    
    if (!scores?.preservation || !scores?.style || !scores?.overall) {
      alert('Please complete all scores before submitting')
      return
    }

    try {
      const response = await fetch('/api/evaluation/save-score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId,
          style,
          scores,
          feedback: scores.feedback || ''
        })
      })

      if (response.ok) {
        // Update local state
        const updatedTasks = [...tasks]
        const task = updatedTasks.find(t => t.id === taskId)
        if (task && task.styles[style as keyof typeof task.styles]) {
          task.styles[style as keyof typeof task.styles].human_score = {
            preservation: scores.preservation,
            style: scores.style,
            overall: scores.overall
          }
          task.styles[style as keyof typeof task.styles].feedback = scores.feedback || ''
        }
        setTasks(updatedTasks)
        setEvaluatingStyle(null)
        
        // Clear temp scores
        const newTempScores = { ...tempScores }
        delete newTempScores[`${taskId}_${style}`]
        setTempScores(newTempScores)
      }
    } catch (error) {
      console.error('Failed to save score:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading evaluation tasks...</p>
        </div>
      </div>
    )
  }

  if (tasks.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">No evaluation tasks available.</p>
          <p className="text-sm text-gray-500 mt-2">Run the conversion script first.</p>
        </div>
      </div>
    )
  }

  const currentTask = tasks[currentIndex]
  const completedCount = tasks.reduce((acc, task) => {
    return acc + Object.values(task.styles).filter(s => s.human_score).length
  }, 0)
  const totalStyles = tasks.length * 3

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                🎨 Oil Painting Style Evaluation
              </h1>
              <p className="text-gray-600">
                Evaluate distinct oil painting styles with optimized parameters
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-blue-600">
                {completedCount}/{totalStyles}
              </div>
              <div className="text-sm text-gray-500">Evaluated</div>
            </div>
          </div>
          
          <div className="mt-4 flex items-center gap-6">
            <span className="text-sm text-gray-500">
              Task {currentIndex + 1} of {tasks.length}
            </span>
            <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
              {currentTask.category === 'cat' ? '🐱 Cat' : '🐕 Dog'}
            </span>
            <div className="flex-1"></div>
            <span className="text-xs text-gray-500">
              Use ← → arrow keys to navigate
            </span>
          </div>
        </div>

        {/* Original Image */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Original Portrait</h2>
          <div className="flex justify-center">
            <img 
              src={currentTask.original_image} 
              alt="Original"
              className="max-w-md rounded-lg border-2 border-gray-200 shadow-lg"
            />
          </div>
        </div>

        {/* Three Styles Grid */}
        <div className="grid grid-cols-3 gap-6 mb-6">
          {Object.entries(currentTask.styles).map(([styleKey, styleData]) => (
            <div key={styleKey} className="bg-white rounded-lg shadow-sm p-4 relative">
              {/* Style Label Badge */}
              <div className={`absolute -top-3 -right-3 px-3 py-1 rounded-full text-xs font-bold text-white shadow-lg ${
                styleKey === 'classic' ? 'bg-amber-600' :
                styleKey === 'impressionist' ? 'bg-blue-600' :
                'bg-purple-600'
              }`}>
                {styleKey.toUpperCase()}
              </div>
              
              <div className="mb-3">
                <h3 className="text-lg font-semibold">{styleData.name}</h3>
                {styleData.denoising_strength && (
                  <div className="text-xs text-gray-500 mt-1 space-y-0.5">
                    <div>Denoising: {styleData.denoising_strength}</div>
                    <div>CFG: {styleData.cfg_scale}</div>
                    <div>Sampler: {styleData.sampler}</div>
                    <div>ControlNet: {styleData.controlnet_weight}</div>
                  </div>
                )}
              </div>
              
              {styleData.image ? (
                <>
                  <img 
                    src={styleData.image} 
                    alt={styleData.name}
                    className="w-full rounded-lg border-2 border-amber-200 mb-4 shadow-lg hover:scale-105 transition-transform"
                  />
                  
                  {/* Existing Scores Display */}
                  {styleData.human_score && (
                    <div className="mb-4 p-3 bg-green-50 rounded-lg">
                      <div className="text-sm font-medium text-green-800 mb-2">✅ Evaluated</div>
                      <div className="text-xs space-y-1">
                        <div>Preservation: {styleData.human_score.preservation}/5</div>
                        <div>Style: {styleData.human_score.style}/5</div>
                        <div>Overall: {styleData.human_score.overall}/5</div>
                        {styleData.feedback && (
                          <div className="mt-2 pt-2 border-t border-green-200">
                            <div className="font-medium">Feedback:</div>
                            <div className="italic">{styleData.feedback}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Evaluation Form */}
                  {!styleData.human_score && evaluatingStyle === styleKey ? (
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs text-gray-600">Pet Preservation (1-5)</label>
                        <div className="flex gap-1">
                          {[1,2,3,4,5].map(n => (
                            <button
                              key={n}
                              onClick={() => {
                                const key = `${currentTask.id}_${styleKey}`
                                setTempScores({
                                  ...tempScores,
                                  [key]: { ...tempScores[key], preservation: n }
                                })
                              }}
                              className={`flex-1 py-2 rounded text-sm font-medium transition-colors ${
                                tempScores[`${currentTask.id}_${styleKey}`]?.preservation === n
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
                        <label className="text-xs text-gray-600">Oil Painting Quality (1-5)</label>
                        <div className="flex gap-1">
                          {[1,2,3,4,5].map(n => (
                            <button
                              key={n}
                              onClick={() => {
                                const key = `${currentTask.id}_${styleKey}`
                                setTempScores({
                                  ...tempScores,
                                  [key]: { ...tempScores[key], style: n }
                                })
                              }}
                              className={`flex-1 py-2 rounded text-sm font-medium transition-colors ${
                                tempScores[`${currentTask.id}_${styleKey}`]?.style === n
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
                        <label className="text-xs text-gray-600">Overall Quality (1-5)</label>
                        <div className="flex gap-1">
                          {[1,2,3,4,5].map(n => (
                            <button
                              key={n}
                              onClick={() => {
                                const key = `${currentTask.id}_${styleKey}`
                                setTempScores({
                                  ...tempScores,
                                  [key]: { ...tempScores[key], overall: n }
                                })
                              }}
                              className={`flex-1 py-2 rounded text-sm font-medium transition-colors ${
                                tempScores[`${currentTask.id}_${styleKey}`]?.overall === n
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
                        <label className="text-xs text-gray-600">Feedback (optional)</label>
                        <textarea
                          value={tempScores[`${currentTask.id}_${styleKey}`]?.feedback || ''}
                          onChange={(e) => {
                            const key = `${currentTask.id}_${styleKey}`
                            setTempScores({
                              ...tempScores,
                              [key]: { ...tempScores[key], feedback: e.target.value }
                            })
                          }}
                          placeholder="Any comments about this style?"
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm text-gray-900 bg-white placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          rows={3}
                        />
                      </div>
                      
                      <div className="flex gap-2">
                        <button
                          onClick={() => submitScore(currentTask.id, styleKey)}
                          className="flex-1 bg-green-600 text-white py-2 rounded text-sm font-medium hover:bg-green-700"
                        >
                          Submit
                        </button>
                        <button
                          onClick={() => {
                            setEvaluatingStyle(null)
                            const key = `${currentTask.id}_${styleKey}`
                            const newScores = { ...tempScores }
                            delete newScores[key]
                            setTempScores(newScores)
                          }}
                          className="px-3 py-2 bg-gray-300 text-gray-700 rounded text-sm hover:bg-gray-400"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    !styleData.human_score && (
                      <button
                        onClick={() => setEvaluatingStyle(styleKey)}
                        className="w-full bg-amber-600 text-white py-2 rounded font-medium hover:bg-amber-700 transition-colors"
                      >
                        Evaluate
                      </button>
                    )
                  )}
                </>
              ) : (
                <div className="h-64 bg-gray-100 rounded flex items-center justify-center">
                  <p className="text-gray-400">Processing...</p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center bg-white rounded-lg shadow-sm p-4">
          <button
            onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
            disabled={currentIndex === 0}
            className="px-6 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ← Previous
          </button>
          
          <div className="flex gap-2">
            {tasks.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`w-2 h-2 rounded-full transition-colors ${
                  idx === currentIndex ? 'bg-blue-600' : 'bg-gray-300'
                }`}
              />
            ))}
          </div>
          
          <button
            onClick={() => setCurrentIndex(Math.min(tasks.length - 1, currentIndex + 1))}
            disabled={currentIndex === tasks.length - 1}
            className="px-6 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  )
}