'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { Star, StarHalf, Download, RefreshCw, CheckCircle, XCircle, ArrowLeft, ArrowRight, Zap, Cpu } from 'lucide-react'

interface ConversionResult {
  style: string
  backend: 'a1111' | 'comfyui'
  processing_time: number
  converted_image: string
}

interface EvaluationTask {
  task_id: number
  image_name: string
  original_image: string
  conversions: ConversionResult[]
}

interface EvaluationScore {
  task_id: number
  ratings: {
    [key: string]: {
      preservation: number
      artistic_quality: number
      overall_satisfaction: number
      backend_preference?: 'a1111' | 'comfyui' | 'tie'
    }
  }
  comments?: string
}

export default function ComfyUIEvaluationPage() {
  const [tasks, setTasks] = useState<EvaluationTask[]>([])
  const [currentTaskIndex, setCurrentTaskIndex] = useState(0)
  const [scores, setScores] = useState<EvaluationScore>({
    task_id: 0,
    ratings: {}
  })
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [completedTasks, setCompletedTasks] = useState<Set<number>>(new Set())
  const [evaluationMode, setEvaluationMode] = useState<'single' | 'comparison'>('single')

  const currentTask = tasks[currentTaskIndex]

  useEffect(() => {
    loadEvaluationTasks()
  }, [])

  const loadEvaluationTasks = async () => {
    try {
      setLoading(true)
      
      // Try to load ComfyUI evaluation dataset first
      let response = await fetch('/api/load-comfyui-evaluation')
      
      if (!response.ok) {
        // Fallback to creating sample evaluation tasks
        response = await fetch('/api/create-evaluation-tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            backend: 'comfyui',
            count: 50,
            styles: ['classic_portrait', 'soft_impressionist', 'thick_textured']
          })
        })
      }
      
      if (response.ok) {
        const data = await response.json()
        setTasks(data.tasks || [])
        
        if (data.tasks && data.tasks.length > 0) {
          initializeScoreForTask(data.tasks[0])
        }
      } else {
        console.error('Failed to load evaluation tasks')
      }
    } catch (error) {
      console.error('Error loading evaluation tasks:', error)
    } finally {
      setLoading(false)
    }
  }

  const initializeScoreForTask = (task: EvaluationTask) => {
    const newRatings: any = {}
    
    task.conversions.forEach(conversion => {
      const key = `${conversion.style}_${conversion.backend}`
      newRatings[key] = {
        preservation: 0,
        artistic_quality: 0,
        overall_satisfaction: 0
      }
    })
    
    setScores({
      task_id: task.task_id,
      ratings: newRatings,
      comments: ''
    })
  }

  const updateRating = (conversionKey: string, dimension: string, value: number) => {
    setScores(prev => ({
      ...prev,
      ratings: {
        ...prev.ratings,
        [conversionKey]: {
          ...prev.ratings[conversionKey],
          [dimension]: value
        }
      }
    }))
  }

  const setBackendPreference = (style: string, preference: 'a1111' | 'comfyui' | 'tie') => {
    setScores(prev => ({
      ...prev,
      ratings: {
        ...prev.ratings,
        [`${style}_comparison`]: {
          ...prev.ratings[`${style}_comparison`],
          backend_preference: preference
        }
      }
    }))
  }

  const submitEvaluation = async () => {
    if (!currentTask) return
    
    setSubmitting(true)
    try {
      const response = await fetch('/api/submit-comfyui-evaluation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...scores,
          evaluation_mode: evaluationMode,
          timestamp: Date.now()
        })
      })

      if (response.ok) {
        setCompletedTasks(prev => new Set([...prev, currentTask.task_id]))
        nextTask()
      } else {
        alert('Failed to submit evaluation')
      }
    } catch (error) {
      console.error('Error submitting evaluation:', error)
      alert('Error submitting evaluation')
    } finally {
      setSubmitting(false)
    }
  }

  const nextTask = () => {
    if (currentTaskIndex < tasks.length - 1) {
      const newIndex = currentTaskIndex + 1
      setCurrentTaskIndex(newIndex)
      initializeScoreForTask(tasks[newIndex])
    }
  }

  const previousTask = () => {
    if (currentTaskIndex > 0) {
      const newIndex = currentTaskIndex - 1
      setCurrentTaskIndex(newIndex)
      initializeScoreForTask(tasks[newIndex])
    }
  }

  const renderStarRating = (
    conversionKey: string, 
    dimension: string, 
    currentValue: number,
    label: string
  ) => {
    return (
      <div className="flex items-center space-x-2">
        <span className="text-sm font-medium text-gray-700 w-32">{label}:</span>
        <div className="flex space-x-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onClick={() => updateRating(conversionKey, dimension, star)}
              className="focus:outline-none"
            >
              <Star 
                className={`h-5 w-5 ${
                  star <= currentValue 
                    ? 'text-yellow-500 fill-current' 
                    : 'text-gray-300'
                }`}
              />
            </button>
          ))}
        </div>
        <span className="text-sm text-gray-600">({currentValue}/5)</span>
      </div>
    )
  }

  const renderSingleEvaluation = () => {
    if (!currentTask) return null

    return (
      <div className="space-y-8">
        {/* Original Image */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Original Image</h3>
          <div className="relative w-64 h-64 mx-auto bg-gray-100 rounded-lg overflow-hidden">
            <Image
              src={currentTask.original_image}
              alt="Original"
              fill
              className="object-cover"
              sizes="256px"
            />
          </div>
          <p className="text-center text-sm text-gray-600 mt-2">{currentTask.image_name}</p>
        </div>

        {/* ComfyUI Results */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {currentTask.conversions.map((conversion, index) => {
            const conversionKey = `${conversion.style}_${conversion.backend}`
            const rating = scores.ratings[conversionKey] || { preservation: 0, artistic_quality: 0, overall_satisfaction: 0 }
            
            return (
              <div key={index} className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-semibold text-gray-900 capitalize">
                    {conversion.style.replace('_', ' ')}
                  </h4>
                  <div className="flex items-center space-x-2">
                    <Zap className="h-4 w-4 text-purple-500" />
                    <span className="text-sm text-gray-600">ComfyUI</span>
                  </div>
                </div>
                
                <div className="relative w-full h-48 bg-gray-100 rounded-lg overflow-hidden mb-4">
                  <Image
                    src={conversion.converted_image}
                    alt={`${conversion.style} conversion`}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                </div>
                
                <div className="text-xs text-gray-500 mb-4">
                  Processing: {conversion.processing_time.toFixed(1)}s
                </div>
                
                <div className="space-y-3">
                  {renderStarRating(conversionKey, 'preservation', rating.preservation, 'Preservation')}
                  {renderStarRating(conversionKey, 'artistic_quality', rating.artistic_quality, 'Art Quality')}
                  {renderStarRating(conversionKey, 'overall_satisfaction', rating.overall_satisfaction, 'Overall')}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  const renderComparisonEvaluation = () => {
    if (!currentTask) return null

    // Group conversions by style for A1111 vs ComfyUI comparison
    const styleGroups: { [style: string]: ConversionResult[] } = {}
    currentTask.conversions.forEach(conversion => {
      if (!styleGroups[conversion.style]) {
        styleGroups[conversion.style] = []
      }
      styleGroups[conversion.style].push(conversion)
    })

    return (
      <div className="space-y-8">
        {/* Original Image */}
        <div className="bg-white rounded-xl shadow-lg p-6 text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Original Image</h3>
          <div className="relative w-48 h-48 mx-auto bg-gray-100 rounded-lg overflow-hidden">
            <Image
              src={currentTask.original_image}
              alt="Original"
              fill
              className="object-cover"
              sizes="192px"
            />
          </div>
        </div>

        {/* Style Comparisons */}
        {Object.entries(styleGroups).map(([style, conversions]) => {
          const a1111Result = conversions.find(c => c.backend === 'a1111')
          const comfyuiResult = conversions.find(c => c.backend === 'comfyui')
          
          if (!comfyuiResult) return null
          
          return (
            <div key={style} className="bg-white rounded-xl shadow-lg p-6">
              <h4 className="text-xl font-semibold text-gray-900 mb-6 text-center capitalize">
                {style.replace('_', ' ')} Comparison
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* A1111 Result */}
                {a1111Result && (
                  <div className="text-center">
                    <div className="flex items-center justify-center space-x-2 mb-3">
                      <Cpu className="h-5 w-5 text-blue-500" />
                      <h5 className="font-semibold text-gray-900">Automatic1111</h5>
                    </div>
                    <div className="relative w-full h-64 bg-gray-100 rounded-lg overflow-hidden">
                      <Image
                        src={`/evaluation_results/${a1111Result.converted_image}`}
                        alt="A1111 result"
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, 50vw"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      {a1111Result.processing_time.toFixed(1)}s
                    </p>
                  </div>
                )}
                
                {/* ComfyUI Result */}
                <div className="text-center">
                  <div className="flex items-center justify-center space-x-2 mb-3">
                    <Zap className="h-5 w-5 text-purple-500" />
                    <h5 className="font-semibold text-gray-900">ComfyUI</h5>
                  </div>
                  <div className="relative w-full h-64 bg-gray-100 rounded-lg overflow-hidden">
                    <Image
                      src={comfyuiResult.converted_image}
                      alt="ComfyUI result"
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 50vw"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    {comfyuiResult.processing_time.toFixed(1)}s
                  </p>
                </div>
              </div>
              
              {/* Backend Preference */}
              <div className="mt-6 text-center">
                <p className="text-sm font-medium text-gray-700 mb-3">Which result do you prefer?</p>
                <div className="flex justify-center space-x-4">
                  <button
                    onClick={() => setBackendPreference(style, 'a1111')}
                    className={`px-4 py-2 rounded-lg border-2 transition-colors ${
                      scores.ratings[`${style}_comparison`]?.backend_preference === 'a1111'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-300 text-gray-700 hover:border-blue-300'
                    }`}
                  >
                    <Cpu className="h-4 w-4 inline mr-1" />
                    A1111
                  </button>
                  <button
                    onClick={() => setBackendPreference(style, 'comfyui')}
                    className={`px-4 py-2 rounded-lg border-2 transition-colors ${
                      scores.ratings[`${style}_comparison`]?.backend_preference === 'comfyui'
                        ? 'border-purple-500 bg-purple-50 text-purple-700'
                        : 'border-gray-300 text-gray-700 hover:border-purple-300'
                    }`}
                  >
                    <Zap className="h-4 w-4 inline mr-1" />
                    ComfyUI
                  </button>
                  <button
                    onClick={() => setBackendPreference(style, 'tie')}
                    className={`px-4 py-2 rounded-lg border-2 transition-colors ${
                      scores.ratings[`${style}_comparison`]?.backend_preference === 'tie'
                        ? 'border-gray-500 bg-gray-50 text-gray-700'
                        : 'border-gray-300 text-gray-700 hover:border-gray-400'
                    }`}
                  >
                    Equal/Tie
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-purple-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading ComfyUI evaluation tasks...</p>
        </div>
      </div>
    )
  }

  if (tasks.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">No Evaluation Tasks Found</h2>
          <p className="text-gray-600 mb-4">Run the ComfyUI batch processing script first.</p>
          <div className="bg-gray-100 rounded-lg p-4 text-left text-sm">
            <code>python scripts/comfyui_batch_convert.py</code>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">ComfyUI Oil Painting Evaluation</h1>
              <p className="text-gray-600 mt-2">
                Evaluate ComfyUI results across {tasks.length} images and 3 styles
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm text-gray-600">Progress</p>
                <p className="text-lg font-semibold text-purple-600">
                  {currentTaskIndex + 1} / {tasks.length}
                </p>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setEvaluationMode('single')}
                  className={`px-3 py-2 rounded-lg text-sm ${
                    evaluationMode === 'single'
                      ? 'bg-purple-100 text-purple-700 border border-purple-300'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Single Backend
                </button>
                <button
                  onClick={() => setEvaluationMode('comparison')}
                  className={`px-3 py-2 rounded-lg text-sm ${
                    evaluationMode === 'comparison'
                      ? 'bg-purple-100 text-purple-700 border border-purple-300'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  A1111 vs ComfyUI
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        {evaluationMode === 'single' ? renderSingleEvaluation() : renderComparisonEvaluation()}

        {/* Comments */}
        <div className="bg-white rounded-xl shadow-lg p-6 mt-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Additional Comments</h3>
          <textarea
            value={scores.comments || ''}
            onChange={(e) => setScores(prev => ({ ...prev, comments: e.target.value }))}
            placeholder="Any additional observations about style quality, speed, or preferences..."
            className="w-full h-24 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
          />
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8">
          <button
            onClick={previousTask}
            disabled={currentTaskIndex === 0}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Previous</span>
          </button>

          <button
            onClick={submitEvaluation}
            disabled={submitting}
            className="flex items-center space-x-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle className="h-4 w-4" />
            )}
            <span>{submitting ? 'Submitting...' : 'Submit & Next'}</span>
          </button>

          <button
            onClick={nextTask}
            disabled={currentTaskIndex === tasks.length - 1}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span>Next</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>

        {/* Progress Indicator */}
        <div className="mt-6">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Completed: {completedTasks.size}</span>
            <span>Remaining: {tasks.length - completedTasks.size}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-purple-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(completedTasks.size / tasks.length) * 100}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}