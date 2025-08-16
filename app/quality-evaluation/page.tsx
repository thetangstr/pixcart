'use client'

import { useState, useEffect } from 'react'

interface StyleData {
  image: string | null
  name: string
  ai_score: { preservation: number; style: number; overall: number } | null
  human_score: { preservation: number; style: number; overall: number } | null
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
  parameters: {
    denoising_strength: number
    cfg_scale: number
  }
}

export default function QualityEvaluation() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<any>({})
  const [evaluatingStyle, setEvaluatingStyle] = useState<string | null>(null)
  const [tempScores, setTempScores] = useState<any>({})

  useEffect(() => {
    loadTasks()
  }, [])

  const loadTasks = async () => {
    try {
      // Try universal parameter tasks first (best approach)
      let response = await fetch('/api/evaluation-dashboard/load-universal-tasks')
      let data = await response.json()
      
      // If no universal tasks, try quality tasks
      if (!data.tasks || data.tasks.length === 0) {
        response = await fetch('/api/evaluation-dashboard/load-quality-tasks')
        data = await response.json()
      }
      
      setTasks(data.tasks)
      setStats(data.stats)
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
      const response = await fetch('/api/evaluation-dashboard/save-style-score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId,
          style,
          scores,
          evaluator: 'human'
        })
      })

      if (response.ok) {
        // Update local state
        const updatedTasks = [...tasks]
        const task = updatedTasks.find(t => t.id === taskId)
        if (task && task.styles[style as keyof typeof task.styles]) {
          task.styles[style as keyof typeof task.styles].human_score = scores
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
          <p className="mt-4 text-gray-600">Loading quality evaluation tasks...</p>
        </div>
      </div>
    )
  }

  if (tasks.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Quality portraits are being processed. Please wait...</p>
        </div>
      </div>
    )
  }

  const currentTask = tasks[currentIndex]

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🎨 Universal Parameters Evaluation
          </h1>
          <p className="text-gray-600">
            Using ONE optimal parameter set for ALL portraits - styles achieved through prompts only
          </p>
          {stats.message && (
            <div className="mt-2 px-3 py-1 bg-green-100 text-green-800 rounded-lg text-sm inline-block">
              {stats.message}
            </div>
          )}
          <div className="mt-4 flex items-center gap-6">
            <span className="text-sm text-gray-500">
              Task {currentIndex + 1} of {tasks.length}
            </span>
            <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
              {currentTask.category === 'cat' ? '🐱 Cat' : '🐕 Dog'}
            </span>
            {stats.totalStyles && (
              <span className="text-sm text-gray-500">
                {stats.humanEvaluated}/{stats.totalStyles} styles evaluated
              </span>
            )}
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
          <div className="mt-4 text-center text-sm text-gray-600">
            Parameters: Denoising {currentTask.parameters.denoising_strength} | CFG {currentTask.parameters.cfg_scale}
          </div>
        </div>

        {/* Three Styles Grid */}
        <div className="grid grid-cols-3 gap-6 mb-6">
          {Object.entries(currentTask.styles).map(([styleKey, styleData]) => (
            <div key={styleKey} className="bg-white rounded-lg shadow-sm p-4">
              <h3 className="text-lg font-semibold mb-3 text-center">{styleData.name}</h3>
              
              {styleData.image ? (
                <>
                  <img 
                    src={styleData.image} 
                    alt={styleData.name}
                    className="w-full rounded-lg border-2 border-amber-200 mb-4 shadow-lg"
                  />
                  
                  {/* Existing Scores Display */}
                  {styleData.human_score && (
                    <div className="mb-4 p-3 bg-green-50 rounded-lg">
                      <div className="text-sm font-medium text-green-800 mb-2">✅ Evaluated</div>
                      <div className="text-xs space-y-1">
                        <div>Preservation: {styleData.human_score.preservation}/5</div>
                        <div>Style: {styleData.human_score.style}/5</div>
                        <div>Overall: {styleData.human_score.overall}/5</div>
                      </div>
                    </div>
                  )}
                  
                  {/* Evaluation Form */}
                  {!styleData.human_score && evaluatingStyle === styleKey ? (
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs text-gray-600">Preservation (1-5)</label>
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
                              className={`flex-1 py-2 rounded text-sm font-medium ${
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
                        <label className="text-xs text-gray-600">Style Quality (1-5)</label>
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
                              className={`flex-1 py-2 rounded text-sm font-medium ${
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
                        <label className="text-xs text-gray-600">Overall (1-5)</label>
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
                              className={`flex-1 py-2 rounded text-sm font-medium ${
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
                        className="w-full bg-amber-600 text-white py-2 rounded font-medium hover:bg-amber-700"
                      >
                        Evaluate {styleData.name}
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
            className="px-6 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50"
          >
            Previous
          </button>
          
          <div className="text-center">
            <span className="text-gray-600">
              {currentIndex + 1} / {tasks.length}
            </span>
            <div className="text-xs text-gray-500 mt-1">
              Use arrow keys to navigate
            </div>
          </div>
          
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