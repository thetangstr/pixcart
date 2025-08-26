'use client'

import { useState, useEffect } from 'react'
import { MessageCircle, X, ChevronRight, Bug, Lightbulb, Zap, Star } from 'lucide-react'

interface AppFeatureFeedbackProps {
  sessionId?: string
}

export default function AppFeatureFeedback({ sessionId = 'anonymous' }: AppFeatureFeedbackProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [activeTab, setActiveTab] = useState<'quick' | 'detailed'>('quick')
  const [submitted, setSubmitted] = useState(false)
  
  // Quick feedback state
  const [quickType, setQuickType] = useState<'bug' | 'feature' | 'suggestion'>('suggestion')
  const [quickMessage, setQuickMessage] = useState('')
  
  // Detailed feedback state
  const [selectedFeature, setSelectedFeature] = useState('')
  const [rating, setRating] = useState(0)
  const [easeOfUse, setEaseOfUse] = useState(0)
  const [performance, setPerformance] = useState(0)
  const [detailedMessage, setDetailedMessage] = useState('')
  const [featureIssues, setFeatureIssues] = useState<string[]>([])
  
  const features = [
    'Upload & Preview',
    'Style Selection',
    'Processing Speed',
    'Result Quality',
    'Download Options',
    'User Interface',
    'Mobile Experience',
    'Gallery',
    'Navigation',
    'Overall App'
  ]
  
  const commonIssues = [
    'Too slow',
    'Confusing UI',
    'Button not working',
    'Image quality issue',
    'Mobile layout broken',
    'Can\'t download',
    'Style preview missing',
    'Error message'
  ]
  
  // Show feedback prompt after 2 minutes
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!submitted && !isOpen) {
        setIsMinimized(true)
      }
    }, 120000) // 2 minutes
    
    return () => clearTimeout(timer)
  }, [submitted, isOpen])
  
  const handleQuickSubmit = async () => {
    try {
      await fetch('/api/feedback-v01', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          category: quickType,
          message: quickMessage,
          userAgent: navigator.userAgent,
          screenResolution: `${window.screen.width}x${window.screen.height}`,
          deviceType: window.innerWidth < 768 ? 'mobile' : 
                     window.innerWidth < 1024 ? 'tablet' : 'desktop'
        })
      })
      
      setSubmitted(true)
      setTimeout(() => {
        setIsOpen(false)
        setQuickMessage('')
      }, 2000)
    } catch (error) {
      console.error('Failed to submit feedback:', error)
    }
  }
  
  const handleDetailedSubmit = async () => {
    if (!selectedFeature || rating === 0) return
    
    try {
      await fetch('/api/feedback-v01', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          category: 'app-feature',
          appFeatureFeedback: {
            feature: selectedFeature,
            rating,
            easeOfUse,
            performance,
            issues: featureIssues.length > 0 ? featureIssues : undefined
          },
          message: detailedMessage || `Feedback for ${selectedFeature}`,
          userAgent: navigator.userAgent,
          screenResolution: `${window.screen.width}x${window.screen.height}`,
          deviceType: window.innerWidth < 768 ? 'mobile' : 
                     window.innerWidth < 1024 ? 'tablet' : 'desktop'
        })
      })
      
      setSubmitted(true)
      setTimeout(() => {
        setIsOpen(false)
        resetForm()
      }, 2000)
    } catch (error) {
      console.error('Failed to submit feedback:', error)
    }
  }
  
  const resetForm = () => {
    setQuickMessage('')
    setSelectedFeature('')
    setRating(0)
    setEaseOfUse(0)
    setPerformance(0)
    setDetailedMessage('')
    setFeatureIssues([])
  }
  
  const StarRating = ({ 
    value, 
    onChange, 
    label 
  }: { 
    value: number
    onChange: (v: number) => void
    label: string
  }) => (
    <div className="mb-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-gray-600">{label}</span>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map(star => (
            <button
              key={star}
              type="button"
              onClick={() => onChange(star)}
              className={`transition-colors ${
                star <= value 
                  ? 'text-amber-500' 
                  : 'text-gray-300 hover:text-amber-300'
              }`}
            >
              <Star className="w-4 h-4 fill-current" />
            </button>
          ))}
        </div>
      </div>
    </div>
  )
  
  // Minimized floating button
  if (isMinimized && !isOpen) {
    return (
      <button
        onClick={() => {
          setIsMinimized(false)
          setIsOpen(true)
        }}
        className="fixed bottom-6 right-6 z-40 bg-gradient-to-r from-amber-500 to-orange-500 text-white p-4 rounded-full shadow-lg hover:scale-110 transition-transform animate-pulse"
      >
        <MessageCircle className="w-6 h-6" />
      </button>
    )
  }
  
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-40 bg-gradient-to-r from-amber-500 to-orange-500 text-white py-3 px-6 rounded-full shadow-lg hover:scale-105 transition-transform flex items-center gap-2"
      >
        <MessageCircle className="w-5 h-5" />
        <span className="font-medium">Feedback</span>
      </button>
    )
  }
  
  return (
    <div className="fixed bottom-6 right-6 z-50 w-96 bg-white rounded-2xl shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-4 text-white">
        <div className="flex justify-between items-center">
          <h3 className="font-semibold text-lg">
            {submitted ? '✅ Thank You!' : '💬 Share Feedback'}
          </h3>
          <button
            onClick={() => setIsOpen(false)}
            className="text-white/80 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        {!submitted && (
          <p className="text-sm text-white/90 mt-1">
            Help us improve the app for v0.1!
          </p>
        )}
      </div>
      
      {submitted ? (
        <div className="p-6 text-center">
          <p className="text-gray-600">Your feedback has been recorded!</p>
        </div>
      ) : (
        <>
          {/* Tab Selection */}
          <div className="flex border-b">
            <button
              onClick={() => setActiveTab('quick')}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                activeTab === 'quick'
                  ? 'text-amber-600 border-b-2 border-amber-500'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Quick Feedback
            </button>
            <button
              onClick={() => setActiveTab('detailed')}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                activeTab === 'detailed'
                  ? 'text-amber-600 border-b-2 border-amber-500'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Feature Review
            </button>
          </div>
          
          {/* Content */}
          <div className="p-4 max-h-96 overflow-y-auto">
            {activeTab === 'quick' ? (
              <div>
                {/* Quick Type Selection */}
                <div className="flex gap-2 mb-4">
                  <button
                    onClick={() => setQuickType('bug')}
                    className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                      quickType === 'bug'
                        ? 'bg-red-100 text-red-700 border-2 border-red-300'
                        : 'bg-gray-50 text-gray-600 border-2 border-gray-200'
                    }`}
                  >
                    <Bug className="w-4 h-4 inline mr-1" />
                    Bug
                  </button>
                  <button
                    onClick={() => setQuickType('feature')}
                    className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                      quickType === 'feature'
                        ? 'bg-blue-100 text-blue-700 border-2 border-blue-300'
                        : 'bg-gray-50 text-gray-600 border-2 border-gray-200'
                    }`}
                  >
                    <Lightbulb className="w-4 h-4 inline mr-1" />
                    Feature
                  </button>
                  <button
                    onClick={() => setQuickType('suggestion')}
                    className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                      quickType === 'suggestion'
                        ? 'bg-green-100 text-green-700 border-2 border-green-300'
                        : 'bg-gray-50 text-gray-600 border-2 border-gray-200'
                    }`}
                  >
                    <Zap className="w-4 h-4 inline mr-1" />
                    Idea
                  </button>
                </div>
                
                {/* Quick Message */}
                <textarea
                  value={quickMessage}
                  onChange={(e) => setQuickMessage(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none text-sm"
                  rows={4}
                  placeholder={
                    quickType === 'bug' 
                      ? 'Describe the bug you encountered...'
                      : quickType === 'feature'
                      ? 'What feature would you like to see?'
                      : 'Share your suggestion or idea...'
                  }
                />
                
                <button
                  onClick={handleQuickSubmit}
                  disabled={!quickMessage.trim()}
                  className="w-full mt-3 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-medium rounded-lg hover:from-amber-600 hover:to-orange-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Send Feedback
                </button>
              </div>
            ) : (
              <div>
                {/* Feature Selection */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Feature
                  </label>
                  <select
                    value={selectedFeature}
                    onChange={(e) => setSelectedFeature(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
                  >
                    <option value="">Choose a feature...</option>
                    {features.map(feature => (
                      <option key={feature} value={feature}>{feature}</option>
                    ))}
                  </select>
                </div>
                
                {selectedFeature && (
                  <>
                    {/* Ratings */}
                    <div className="space-y-1 mb-4">
                      <StarRating value={rating} onChange={setRating} label="Overall Rating" />
                      <StarRating value={easeOfUse} onChange={setEaseOfUse} label="Ease of Use" />
                      <StarRating value={performance} onChange={setPerformance} label="Performance" />
                    </div>
                    
                    {/* Common Issues */}
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Issues (if any)
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {commonIssues.map(issue => (
                          <button
                            key={issue}
                            type="button"
                            onClick={() => {
                              setFeatureIssues(prev =>
                                prev.includes(issue)
                                  ? prev.filter(i => i !== issue)
                                  : [...prev, issue]
                              )
                            }}
                            className={`py-1 px-3 rounded-full text-xs transition-all ${
                              featureIssues.includes(issue)
                                ? 'bg-red-100 text-red-700 border border-red-300'
                                : 'bg-gray-50 text-gray-600 border border-gray-200'
                            }`}
                          >
                            {issue}
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    {/* Additional Comments */}
                    <textarea
                      value={detailedMessage}
                      onChange={(e) => setDetailedMessage(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none text-sm mb-3"
                      rows={3}
                      placeholder="Additional comments (optional)..."
                    />
                    
                    <button
                      onClick={handleDetailedSubmit}
                      disabled={!selectedFeature || rating === 0}
                      className="w-full py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-medium rounded-lg hover:from-amber-600 hover:to-orange-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Submit Review
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}