'use client'

import { useState, useEffect } from 'react'
import { MessageCircle, X, Bug, Lightbulb, Heart, Send } from 'lucide-react'

interface FeedbackWidgetProps {
  user: {
    id: string
    username: string
    role: string
  } | null
}

export default function FeedbackWidget({ user }: FeedbackWidgetProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [feedbackType, setFeedbackType] = useState<'feedback' | 'bug' | 'feature'>('feedback')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [success, setSuccess] = useState(false)

  // Only show for logged-in users
  if (!user) return null

  const handleSubmit = async () => {
    if (!message.trim()) return
    
    setSending(true)
    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: feedbackType,
          message,
          userId: user.id,
          username: user.username
        })
      })
      
      if (response.ok) {
        setSuccess(true)
        setMessage('')
        setTimeout(() => {
          setSuccess(false)
          setIsOpen(false)
        }, 2000)
      }
    } catch (error) {
      console.error('Failed to send feedback:', error)
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-full shadow-lg hover:shadow-xl transform hover:scale-110 transition-all duration-200 flex items-center justify-center z-40"
      >
        <MessageCircle className="w-6 h-6" />
      </button>

      {/* Feedback Modal */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 w-96 bg-white rounded-2xl shadow-2xl z-50 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-amber-500 to-orange-600 text-white p-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold">Send Feedback</h3>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-4">
            {success ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Heart className="w-8 h-8 text-green-600" />
                </div>
                <p className="text-lg font-semibold text-gray-900">Thank you!</p>
                <p className="text-sm text-gray-600 mt-1">Your feedback has been received</p>
              </div>
            ) : (
              <>
                {/* Feedback Type Selector */}
                <div className="flex gap-2 mb-4">
                  <button
                    onClick={() => setFeedbackType('feedback')}
                    className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                      feedbackType === 'feedback'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <MessageCircle className="w-4 h-4 inline mr-1" />
                    Feedback
                  </button>
                  <button
                    onClick={() => setFeedbackType('bug')}
                    className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                      feedbackType === 'bug'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <Bug className="w-4 h-4 inline mr-1" />
                    Bug
                  </button>
                  <button
                    onClick={() => setFeedbackType('feature')}
                    className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                      feedbackType === 'feature'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <Lightbulb className="w-4 h-4 inline mr-1" />
                    Feature
                  </button>
                </div>

                {/* Message Input */}
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={
                    feedbackType === 'bug' 
                      ? 'Describe the bug you encountered...'
                      : feedbackType === 'feature'
                      ? 'Suggest a new feature...'
                      : 'Share your feedback...'
                  }
                  className="w-full h-32 p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />

                {/* User Info */}
                <div className="mt-3 text-xs text-gray-500">
                  Submitting as: {user.username}
                </div>

                {/* Submit Button */}
                <button
                  onClick={handleSubmit}
                  disabled={!message.trim() || sending}
                  className="mt-4 w-full py-2 px-4 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-medium rounded-lg hover:from-amber-600 hover:to-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center"
                >
                  {sending ? (
                    'Sending...'
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Send Feedback
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}