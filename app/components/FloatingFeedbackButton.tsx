'use client'

import { useState } from 'react'
import { MessageSquare, X, Send, Star, Heart, Bug, Lightbulb } from 'lucide-react'

interface FeedbackData {
  type: 'bug' | 'feature' | 'improvement' | 'general'
  rating: number
  title: string
  description: string
  email?: string
}

export default function FloatingFeedbackButton() {
  const [isOpen, setIsOpen] = useState(false)
  const [step, setStep] = useState(1) // 1: rating, 2: details
  const [feedback, setFeedback] = useState<FeedbackData>({
    type: 'general',
    rating: 0,
    title: '',
    description: '',
    email: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState('')

  const handleRatingClick = (rating: number) => {
    setFeedback(prev => ({ ...prev, rating }))
    if (rating <= 3) {
      setFeedback(prev => ({ ...prev, type: 'improvement' }))
    }
    setStep(2)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setMessage('')

    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...feedback,
          source: 'floating_button',
          page: window.location.pathname,
          timestamp: new Date().toISOString()
        })
      })

      if (res.ok) {
        setMessage('Thank you for your feedback! 🎉')
        setTimeout(() => {
          setIsOpen(false)
          setStep(1)
          setFeedback({
            type: 'general',
            rating: 0,
            title: '',
            description: '',
            email: ''
          })
          setMessage('')
        }, 2000)
      } else {
        setMessage('Failed to submit feedback. Please try again.')
      }
    } catch (error) {
      setMessage('Error submitting feedback. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const typeIcons = {
    bug: <Bug className="h-4 w-4" />,
    feature: <Lightbulb className="h-4 w-4" />,
    improvement: <Star className="h-4 w-4" />,
    general: <Heart className="h-4 w-4" />
  }

  const typeLabels = {
    bug: 'Bug Report',
    feature: 'Feature Request', 
    improvement: 'Improvement',
    general: 'General Feedback'
  }

  return (
    <>
      {/* Floating Feedback Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 bg-gradient-to-r from-amber-500 to-orange-600 text-white p-4 rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 z-50 group"
        aria-label="Send Feedback"
      >
        <MessageSquare className="h-6 w-6" />
        
        {/* Tooltip */}
        <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 bg-gray-900 text-white text-sm px-3 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
          💬 Send Feedback
          <div className="absolute left-full top-1/2 -translate-y-1/2 border-4 border-transparent border-l-gray-900"></div>
        </div>
      </button>

      {/* Feedback Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-amber-500" />
                Share Your Feedback
              </h2>
              <button
                onClick={() => {
                  setIsOpen(false)
                  setStep(1)
                  setMessage('')
                }}
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {message && (
              <div className={`mb-4 p-3 rounded-lg text-sm font-medium ${
                message.includes('Thank') 
                  ? 'bg-green-100 text-green-800 border border-green-200' 
                  : 'bg-red-100 text-red-800 border border-red-200'
              }`}>
                {message}
              </div>
            )}

            {/* Step 1: Rating */}
            {step === 1 && (
              <div className="text-center">
                <p className="text-gray-700 mb-6">How was your experience with PetCanvas?</p>
                
                <div className="flex justify-center space-x-2 mb-6">
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <button
                      key={rating}
                      onClick={() => handleRatingClick(rating)}
                      className="group transition-transform hover:scale-110"
                    >
                      <Star 
                        className={`h-8 w-8 transition-colors ${
                          rating <= feedback.rating
                            ? 'text-yellow-400 fill-yellow-400'
                            : 'text-gray-300 hover:text-yellow-300'
                        }`}
                      />
                    </button>
                  ))}
                </div>
                
                <p className="text-xs text-gray-500">Click a star to continue</p>
              </div>
            )}

            {/* Step 2: Details */}
            {step === 2 && (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="text-center mb-4">
                  <div className="flex justify-center space-x-1 mb-2">
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <Star 
                        key={rating}
                        className={`h-5 w-5 ${
                          rating <= feedback.rating
                            ? 'text-yellow-400 fill-yellow-400'
                            : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-sm text-gray-600">
                    {feedback.rating <= 3 
                      ? "Help us improve! What went wrong?" 
                      : "Great! Tell us more about your experience"}
                  </p>
                </div>

                {/* Feedback Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Type of feedback
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(typeLabels).map(([type, label]) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setFeedback(prev => ({ ...prev, type: type as any }))}
                        className={`p-3 rounded-lg border-2 transition-all flex items-center justify-center gap-2 text-sm ${
                          feedback.type === type
                            ? 'border-amber-500 bg-amber-50 text-amber-700'
                            : 'border-gray-200 hover:border-gray-300 text-gray-600'
                        }`}
                      >
                        {typeIcons[type as keyof typeof typeIcons]}
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Title
                  </label>
                  <input
                    type="text"
                    value={feedback.title}
                    onChange={(e) => setFeedback(prev => ({ ...prev, title: e.target.value }))}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    placeholder="Brief summary..."
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Details
                  </label>
                  <textarea
                    value={feedback.description}
                    onChange={(e) => setFeedback(prev => ({ ...prev, description: e.target.value }))}
                    required
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
                    placeholder="Tell us more about your experience..."
                  />
                </div>

                {/* Email (Optional) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email <span className="text-gray-400 text-xs">(optional)</span>
                  </label>
                  <input
                    type="email"
                    value={feedback.email}
                    onChange={(e) => setFeedback(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    placeholder="your@email.com"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    We'll only use this to follow up on your feedback
                  </p>
                </div>

                {/* Submit Button */}
                <div className="flex space-x-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 bg-gradient-to-r from-amber-500 to-orange-600 text-white px-4 py-2 rounded-lg hover:from-amber-600 hover:to-orange-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                  >
                    <Send className="h-4 w-4" />
                    <span>{isSubmitting ? 'Sending...' : 'Send Feedback'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  )
}