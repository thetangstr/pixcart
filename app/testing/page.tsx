'use client'

import { useState, useEffect } from 'react'
import { BarChart, LineChart, Activity, FileText, Image as ImageIcon, TrendingUp, Check, X } from 'lucide-react'

interface IterationResult {
  iteration: number
  timestamp: string
  style: string
  scores: {
    subjectPreservation: number
    oilAuthenticity: number
    styleDistinctiveness: number
    consistency: number
    overall: number
  }
  prompt: {
    positive: string
    negative: string
    settings: {
      cfg_scale: number
      denoising_strength: number
      steps: number
      sampler: string
    }
  }
  image?: string
}

interface StyleStats {
  styleName: string
  averageScores: {
    subjectPreservation: number
    oilAuthenticity: number
    styleDistinctiveness: number
    consistency: number
    overall: number
  }
  improvement: number
  totalIterations: number
}

export default function TestingDashboard() {
  const [iterations, setIterations] = useState<IterationResult[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [currentIteration, setCurrentIteration] = useState(0)
  const [selectedStyle, setSelectedStyle] = useState<string | null>(null)
  const [testImage, setTestImage] = useState<string | null>(null)

  // Load sample data on mount
  useEffect(() => {
    fetch('/sample-iterations.json')
      .then(res => res.json())
      .then(data => {
        setIterations(data.iterations)
        setCurrentIteration(data.iterations.length)
      })
      .catch(err => console.error('Failed to load sample data:', err))
  }, [])

  // Calculate statistics
  const styleStats: StyleStats[] = ['Classic Portrait', 'Thick & Textured', 'Soft & Dreamy'].map(styleName => {
    const styleIterations = iterations.filter(i => i.style === styleName)
    
    if (styleIterations.length === 0) {
      return {
        styleName,
        averageScores: {
          subjectPreservation: 0,
          oilAuthenticity: 0,
          styleDistinctiveness: 0,
          consistency: 0,
          overall: 0
        },
        improvement: 0,
        totalIterations: 0
      }
    }

    const avgScores = {
      subjectPreservation: styleIterations.reduce((sum, i) => sum + i.scores.subjectPreservation, 0) / styleIterations.length,
      oilAuthenticity: styleIterations.reduce((sum, i) => sum + i.scores.oilAuthenticity, 0) / styleIterations.length,
      styleDistinctiveness: styleIterations.reduce((sum, i) => sum + i.scores.styleDistinctiveness, 0) / styleIterations.length,
      consistency: styleIterations.reduce((sum, i) => sum + i.scores.consistency, 0) / styleIterations.length,
      overall: styleIterations.reduce((sum, i) => sum + i.scores.overall, 0) / styleIterations.length
    }

    // Calculate improvement (last 3 vs first 3 iterations)
    const early = styleIterations.slice(0, 3)
    const recent = styleIterations.slice(-3)
    const earlyAvg = early.reduce((sum, i) => sum + i.scores.overall, 0) / (early.length || 1)
    const recentAvg = recent.reduce((sum, i) => sum + i.scores.overall, 0) / (recent.length || 1)
    const improvement = ((recentAvg - earlyAvg) / earlyAvg * 100) || 0

    return {
      styleName,
      averageScores: avgScores,
      improvement,
      totalIterations: styleIterations.length
    }
  })

  const runTestIteration = async () => {
    setIsRunning(true)
    
    try {
      const response = await fetch('/api/test-iteration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          iterationNumber: currentIteration + 1,
          testImage 
        })
      })

      if (response.ok) {
        const result = await response.json()
        setIterations(prev => [...prev, result])
        setCurrentIteration(prev => prev + 1)
      }
    } catch (error) {
      console.error('Test iteration failed:', error)
    }
    
    setIsRunning(false)
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setTestImage(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-green-600'
    if (score >= 7) return 'text-yellow-600'
    if (score >= 6) return 'text-orange-600'
    return 'text-red-600'
  }

  const getScoreBg = (score: number) => {
    if (score >= 8) return 'bg-green-100'
    if (score >= 7) return 'bg-yellow-100'
    if (score >= 6) return 'bg-orange-100'
    return 'bg-red-100'
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Oil Painting Style Testing Dashboard</h1>
          <p className="text-gray-600">Iterative testing and evaluation of oil painting conversion styles</p>
          
          {/* Test Controls */}
          <div className="mt-6 flex items-center space-x-4">
            {!testImage ? (
              <label className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 cursor-pointer">
                <input type="file" onChange={handleFileUpload} className="hidden" accept="image/*" />
                Upload Test Image
              </label>
            ) : (
              <>
                <button
                  onClick={runTestIteration}
                  disabled={isRunning}
                  className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50"
                >
                  {isRunning ? 'Running Test...' : 'Run Next Iteration'}
                </button>
                <span className="text-sm text-gray-600">
                  Iteration #{currentIteration + 1}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Statistics Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {styleStats.map(stat => (
            <div key={stat.styleName} className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">{stat.styleName}</h3>
              
              {/* Overall Score */}
              <div className="mb-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Overall Score</span>
                  <span className={`text-2xl font-bold ${getScoreColor(stat.averageScores.overall)}`}>
                    {stat.averageScores.overall.toFixed(1)}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div
                    className={`h-2 rounded-full ${stat.averageScores.overall >= 8 ? 'bg-green-500' : stat.averageScores.overall >= 7 ? 'bg-yellow-500' : 'bg-orange-500'}`}
                    style={{ width: `${stat.averageScores.overall * 10}%` }}
                  />
                </div>
              </div>

              {/* Individual Metrics */}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subject Preservation</span>
                  <span className={getScoreColor(stat.averageScores.subjectPreservation)}>
                    {stat.averageScores.subjectPreservation.toFixed(1)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Oil Authenticity</span>
                  <span className={getScoreColor(stat.averageScores.oilAuthenticity)}>
                    {stat.averageScores.oilAuthenticity.toFixed(1)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Style Distinctiveness</span>
                  <span className={getScoreColor(stat.averageScores.styleDistinctiveness)}>
                    {stat.averageScores.styleDistinctiveness.toFixed(1)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Consistency</span>
                  <span className={getScoreColor(stat.averageScores.consistency)}>
                    {stat.averageScores.consistency.toFixed(1)}
                  </span>
                </div>
              </div>

              {/* Stats */}
              <div className="mt-4 pt-4 border-t border-gray-200 flex justify-between text-sm">
                <span className="text-gray-600">Iterations: {stat.totalIterations}</span>
                <span className={`font-semibold ${stat.improvement > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {stat.improvement > 0 ? '+' : ''}{stat.improvement.toFixed(1)}%
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Iteration History */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Iteration History</h2>
          
          {iterations.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              No test iterations yet. Upload a test image and click "Run Next Iteration" to begin.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left">
                    <th className="py-2 px-4 text-sm font-medium text-gray-700">#</th>
                    <th className="py-2 px-4 text-sm font-medium text-gray-700">Style</th>
                    <th className="py-2 px-4 text-sm font-medium text-gray-700">Overall</th>
                    <th className="py-2 px-4 text-sm font-medium text-gray-700">Subject</th>
                    <th className="py-2 px-4 text-sm font-medium text-gray-700">Authenticity</th>
                    <th className="py-2 px-4 text-sm font-medium text-gray-700">Distinctive</th>
                    <th className="py-2 px-4 text-sm font-medium text-gray-700">Consistent</th>
                    <th className="py-2 px-4 text-sm font-medium text-gray-700">Settings</th>
                  </tr>
                </thead>
                <tbody>
                  {iterations.map((iter, idx) => (
                    <tr key={idx} className="border-b hover:bg-gray-50">
                      <td className="py-2 px-4 text-sm">{iter.iteration}</td>
                      <td className="py-2 px-4 text-sm font-medium">{iter.style}</td>
                      <td className="py-2 px-4">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${getScoreBg(iter.scores.overall)} ${getScoreColor(iter.scores.overall)}`}>
                          {iter.scores.overall.toFixed(1)}
                        </span>
                      </td>
                      <td className={`py-2 px-4 text-sm ${getScoreColor(iter.scores.subjectPreservation)}`}>
                        {iter.scores.subjectPreservation.toFixed(1)}
                      </td>
                      <td className={`py-2 px-4 text-sm ${getScoreColor(iter.scores.oilAuthenticity)}`}>
                        {iter.scores.oilAuthenticity.toFixed(1)}
                      </td>
                      <td className={`py-2 px-4 text-sm ${getScoreColor(iter.scores.styleDistinctiveness)}`}>
                        {iter.scores.styleDistinctiveness.toFixed(1)}
                      </td>
                      <td className={`py-2 px-4 text-sm ${getScoreColor(iter.scores.consistency)}`}>
                        {iter.scores.consistency.toFixed(1)}
                      </td>
                      <td className="py-2 px-4 text-xs text-gray-600">
                        CFG:{iter.prompt.settings.cfg_scale} DN:{iter.prompt.settings.denoising_strength}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}