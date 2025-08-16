'use client'

import { useState, useEffect } from 'react'

interface Task {
  id: number
  category: string
  original_image: string
  converted_image: string
  parameters?: {
    denoising_strength?: number
    cfg_scale?: number
    style?: string
  }
  ai_scores?: {
    preservation: number
    style: number
    overall: number
  }
  human_scores?: {
    preservation: number
    style: number
    overall: number
  }
}

interface Stats {
  totalTasks: number
  aiEvaluated: number
  humanEvaluated: number
  avgAiPreservation: number
  avgAiStyle: number
  avgAiOverall: number
  avgHumanPreservation: number
  avgHumanStyle: number
  avgHumanOverall: number
}

export default function EvaluationDashboard() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(5)
  const [filter, setFilter] = useState<'all' | 'evaluated' | 'pending'>('all')
  const [stats, setStats] = useState<Stats>({
    totalTasks: 0,
    aiEvaluated: 0,
    humanEvaluated: 0,
    avgAiPreservation: 0,
    avgAiStyle: 0,
    avgAiOverall: 0,
    avgHumanPreservation: 0,
    avgHumanStyle: 0,
    avgHumanOverall: 0
  })
  const [loading, setLoading] = useState(true)
  const [evaluatingTask, setEvaluatingTask] = useState<number | null>(null)
  const [tempScores, setTempScores] = useState<{[key: number]: any}>({})

  useEffect(() => {
    loadTasks()
  }, [])

  const loadTasks = async () => {
    try {
      // Try quality tasks first (with 3 styles)
      let response = await fetch('/api/evaluation-dashboard/load-quality-tasks')
      let data = await response.json()
      
      // If no quality tasks, fallback to regular tasks
      if (!data.tasks || data.tasks.length === 0) {
        response = await fetch('/api/evaluation-dashboard/load-tasks')
        data = await response.json()
      }
      
      setTasks(data.tasks)
      setStats(data.stats)
    } catch (error) {
      console.error('Failed to load tasks:', error)
    }
    setLoading(false)
  }

  const submitHumanScore = async (taskId: number) => {
    const scores = tempScores[taskId]
    if (!scores || !scores.preservation || !scores.style || !scores.overall) {
      alert('Please select all three scores before submitting')
      return
    }

    try {
      const response = await fetch('/api/evaluation-dashboard/save-human-score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId,
          scores
        })
      })

      if (response.ok) {
        // Update local state
        setTasks(prev => prev.map(t => 
          t.id === taskId ? { ...t, human_scores: scores } : t
        ))
        setEvaluatingTask(null)
        setTempScores(prev => {
          const newScores = { ...prev }
          delete newScores[taskId]
          return newScores
        })
      }
    } catch (error) {
      console.error('Failed to save score:', error)
    }
  }

  const filteredTasks = tasks.filter(task => {
    if (filter === 'evaluated') return task.ai_scores || task.human_scores
    if (filter === 'pending') return !task.human_scores
    return true
  })

  const paginatedTasks = filteredTasks.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  const totalPages = Math.ceil(filteredTasks.length / itemsPerPage)

  const getScoreColor = (score?: number) => {
    if (!score) return 'bg-gray-100'
    if (score >= 4) return 'bg-green-100 text-green-800'
    if (score >= 3) return 'bg-yellow-100 text-yellow-800'
    return 'bg-red-100 text-red-800'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading evaluation data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🎨 AI vs Human Evaluation Dashboard
          </h1>
          <p className="text-gray-600">
            Compare Claude AI scores with human evaluations for oil painting conversions
          </p>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="text-sm text-gray-600">Total Tasks</div>
            <div className="text-2xl font-bold text-gray-900">{stats.totalTasks}</div>
          </div>
          <div className="bg-blue-50 rounded-lg shadow-sm p-4">
            <div className="text-sm text-gray-600">AI Evaluated</div>
            <div className="text-2xl font-bold text-blue-600">{stats.aiEvaluated}</div>
          </div>
          <div className="bg-purple-50 rounded-lg shadow-sm p-4">
            <div className="text-sm text-gray-600">Human Evaluated</div>
            <div className="text-2xl font-bold text-purple-600">{stats.humanEvaluated}</div>
          </div>
          <div className="bg-green-50 rounded-lg shadow-sm p-4">
            <div className="text-sm text-gray-600">Both Evaluated</div>
            <div className="text-2xl font-bold text-green-600">
              {tasks.filter(t => t.ai_scores && t.human_scores).length}
            </div>
          </div>
        </div>

        {/* Filters and Controls */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg font-medium ${
                filter === 'all' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 hover:bg-gray-200'
              }`}
            >
              All Tasks ({tasks.length})
            </button>
            <button
              onClick={() => setFilter('pending')}
              className={`px-4 py-2 rounded-lg font-medium ${
                filter === 'pending' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 hover:bg-gray-200'
              }`}
            >
              Needs Human Eval ({tasks.filter(t => !t.human_scores).length})
            </button>
          </div>
          
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Items per page:</label>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value))
                setCurrentPage(1)
              }}
              className="px-3 py-1 border border-gray-300 rounded-lg"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
            </select>
          </div>
        </div>

        {/* Task Cards */}
        <div className="space-y-6">
          {paginatedTasks.map((task) => (
            <div key={task.id} className="bg-white rounded-lg shadow-sm p-6">
              <div className="grid grid-cols-12 gap-6">
                {/* Small Original Image */}
                <div className="col-span-2">
                  <div className="text-xs text-gray-500 mb-1">Original</div>
                  {task.original_image ? (
                    <img 
                      src={task.original_image} 
                      alt={`Original ${task.id}`}
                      className="w-full rounded border border-gray-200"
                    />
                  ) : (
                    <div className="aspect-square bg-gray-200 rounded flex items-center justify-center text-gray-400 text-xs">
                      No image
                    </div>
                  )}
                  <div className="mt-2 text-xs text-center">
                    <span className="px-2 py-1 bg-gray-100 rounded">
                      {task.category || 'unknown'}
                    </span>
                  </div>
                </div>
                
                {/* Large Converted Image */}
                <div className="col-span-5">
                  <div className="text-xs text-gray-500 mb-1">
                    Converted - Style: <span className="font-medium">{task.parameters?.style || 'oil_painting'}</span>
                  </div>
                  {task.converted_image ? (
                    <img 
                      src={task.converted_image} 
                      alt={`Converted ${task.id}`}
                      className="w-full rounded border-2 border-blue-200 shadow-lg"
                    />
                  ) : (
                    <div className="aspect-square bg-gray-200 rounded flex items-center justify-center text-gray-400">
                      No image
                    </div>
                  )}
                  <div className="mt-2 text-xs text-gray-600">
                    Denoising: {task.parameters?.denoising_strength || 0.30} | 
                    CFG: {task.parameters?.cfg_scale || 3.0}
                    {task.conversion_version === 'v2_optimal' && (
                      <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs">
                        Optimized
                      </span>
                    )}
                  </div>
                </div>
                
                {/* Scores and Evaluation */}
                <div className="col-span-5">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-lg font-medium">Task #{task.id}</span>
                  </div>
                  
                  {/* AI Scores */}
                  {task.ai_scores && (
                    <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                      <div className="text-sm font-medium text-blue-800 mb-2">AI Scores:</div>
                      <div className="flex gap-2">
                        <span className={`px-3 py-1 rounded ${getScoreColor(task.ai_scores.preservation)}`}>
                          Preservation: {task.ai_scores.preservation}
                        </span>
                        <span className={`px-3 py-1 rounded ${getScoreColor(task.ai_scores.style)}`}>
                          Style: {task.ai_scores.style}
                        </span>
                        <span className={`px-3 py-1 rounded ${getScoreColor(task.ai_scores.overall)}`}>
                          Overall: {task.ai_scores.overall}
                        </span>
                      </div>
                    </div>
                  )}
                  
                  {/* Human Scores or Evaluation Form */}
                  {task.human_scores ? (
                    <div className="p-3 bg-purple-50 rounded-lg">
                      <div className="text-sm font-medium text-purple-800 mb-2">Human Scores:</div>
                      <div className="flex gap-2">
                        <span className={`px-3 py-1 rounded ${getScoreColor(task.human_scores.preservation)}`}>
                          Preservation: {task.human_scores.preservation}
                        </span>
                        <span className={`px-3 py-1 rounded ${getScoreColor(task.human_scores.style)}`}>
                          Style: {task.human_scores.style}
                        </span>
                        <span className={`px-3 py-1 rounded ${getScoreColor(task.human_scores.overall)}`}>
                          Overall: {task.human_scores.overall}
                        </span>
                      </div>
                    </div>
                  ) : evaluatingTask === task.id ? (
                    <div className="p-3 bg-yellow-50 rounded-lg">
                      <div className="text-sm font-medium text-gray-800 mb-3">Add Your Evaluation:</div>
                      
                      {/* Preservation Score */}
                      <div className="mb-3">
                        <div className="text-xs text-gray-600 mb-1">Preservation (Is it still the same cat/dog?)</div>
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map(score => (
                            <button
                              key={score}
                              onClick={() => setTempScores({
                                ...tempScores,
                                [task.id]: { ...tempScores[task.id], preservation: score }
                              })}
                              className={`flex-1 py-2 rounded text-sm font-medium transition-colors ${
                                tempScores[task.id]?.preservation === score
                                  ? score >= 4 ? 'bg-green-600 text-white' 
                                    : score >= 3 ? 'bg-yellow-500 text-white'
                                    : 'bg-red-600 text-white'
                                  : 'bg-gray-200 hover:bg-gray-300'
                              }`}
                            >
                              {score}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Style Score */}
                      <div className="mb-3">
                        <div className="text-xs text-gray-600 mb-1">Style (How good is the oil painting effect?)</div>
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map(score => (
                            <button
                              key={score}
                              onClick={() => setTempScores({
                                ...tempScores,
                                [task.id]: { ...tempScores[task.id], style: score }
                              })}
                              className={`flex-1 py-2 rounded text-sm font-medium transition-colors ${
                                tempScores[task.id]?.style === score
                                  ? score >= 4 ? 'bg-green-600 text-white' 
                                    : score >= 3 ? 'bg-yellow-500 text-white'
                                    : 'bg-red-600 text-white'
                                  : 'bg-gray-200 hover:bg-gray-300'
                              }`}
                            >
                              {score}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Overall Score */}
                      <div className="mb-3">
                        <div className="text-xs text-gray-600 mb-1">Overall (Is this production ready?)</div>
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map(score => (
                            <button
                              key={score}
                              onClick={() => setTempScores({
                                ...tempScores,
                                [task.id]: { ...tempScores[task.id], overall: score }
                              })}
                              className={`flex-1 py-2 rounded text-sm font-medium transition-colors ${
                                tempScores[task.id]?.overall === score
                                  ? score >= 4 ? 'bg-green-600 text-white' 
                                    : score >= 3 ? 'bg-yellow-500 text-white'
                                    : 'bg-red-600 text-white'
                                  : 'bg-gray-200 hover:bg-gray-300'
                              }`}
                            >
                              {score}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => submitHumanScore(task.id)}
                          className="flex-1 bg-blue-600 text-white py-2 rounded font-medium hover:bg-blue-700"
                        >
                          Submit Scores
                        </button>
                        <button
                          onClick={() => {
                            setEvaluatingTask(null)
                            setTempScores(prev => {
                              const newScores = { ...prev }
                              delete newScores[task.id]
                              return newScores
                            })
                          }}
                          className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-100"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setEvaluatingTask(task.id)}
                      className="w-full bg-purple-600 text-white py-3 rounded-lg font-medium hover:bg-purple-700"
                    >
                      Add Human Evaluation
                    </button>
                  )}

                  {/* Agreement indicator */}
                  {task.ai_scores && task.human_scores && (
                    <div className="mt-3 p-2 bg-gray-50 rounded text-sm">
                      <div className="font-medium text-gray-700">Agreement Analysis:</div>
                      <div className="mt-1 text-xs">
                        Preservation: {Math.abs(task.ai_scores.preservation - task.human_scores.preservation) <= 1 ? '✅ Match' : '⚠️ Differs'}
                        <br />
                        Style: {Math.abs(task.ai_scores.style - task.human_scores.style) <= 1 ? '✅ Match' : '⚠️ Differs'}
                        <br />
                        Overall: {Math.abs(task.ai_scores.overall - task.human_scores.overall) <= 1 ? '✅ Match' : '⚠️ Differs'}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-6">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 rounded-lg bg-white border border-gray-300 disabled:opacity-50"
            >
              Previous
            </button>
            
            <span className="px-3 py-1">
              Page {currentPage} of {totalPages}
            </span>
            
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 rounded-lg bg-white border border-gray-300 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  )
}