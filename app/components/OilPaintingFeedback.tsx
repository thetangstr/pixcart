'use client'

import { useState } from 'react'
import { Star, ThumbsUp, ThumbsDown, Send, X, Palette, Brush, Eye, Heart } from 'lucide-react'

interface OilPaintingFeedbackProps {
  imageId?: string
  style?: string
  processingTime?: number
  onClose?: () => void
  sessionId?: string
}

export default function OilPaintingFeedback({ 
  imageId, 
  style, 
  processingTime,
  onClose,
  sessionId = 'anonymous'
}: OilPaintingFeedbackProps) {
  const [quality, setQuality] = useState(0)
  const [brushstroke, setBrushstroke] = useState(0)
  const [preservation, setPreservation] = useState(0)
  const [artistic, setArtistic] = useState(0)
  const [wouldOrder, setWouldOrder] = useState<boolean | null>(null)
  const [issues, setIssues] = useState<string[]>([])
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const issueOptions = [
    'Brushstrokes too fine',
    'Looks too digital',
    'Subject changed too much',
    'Colors are off',
    'Processing too slow',
    'Style not as expected',
    'Lost important details',
    'Too smooth/not painterly'
  ]

  const handleIssueToggle = (issue: string) => {
    setIssues(prev => 
      prev.includes(issue) 
        ? prev.filter(i => i !== issue)
        : [...prev, issue]
    )
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    
    try {
      const response = await fetch('/api/feedback-v01', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          category: 'oil-painting',
          oilPaintingFeedback: {
            quality,
            brushstrokeVisibility: brushstroke,
            subjectPreservation: preservation,
            artisticAppeal: artistic,
            wouldOrder: wouldOrder || false,
            issues: issues.length > 0 ? issues : undefined,
            imageId,
            style,
            processingTime
          },
          message,
          userAgent: navigator.userAgent,
          screenResolution: `${window.screen.width}x${window.screen.height}`,
          deviceType: window.innerWidth < 768 ? 'mobile' : 
                     window.innerWidth < 1024 ? 'tablet' : 'desktop'
        })
      })
      
      if (response.ok) {
        setSubmitted(true)
        setTimeout(() => {
          onClose?.()
        }, 2000)
      }
    } catch (error) {
      console.error('Failed to submit feedback:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const StarRating = ({ 
    value, 
    onChange, 
    label, 
    icon: Icon 
  }: { 
    value: number
    onChange: (v: number) => void
    label: string
    icon: any
  }) => (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-700 flex items-center gap-2">
          <Icon className="w-4 h-4" />
          {label}
        </span>
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
              <Star className="w-5 h-5 fill-current" />
            </button>
          ))}
        </div>
      </div>
    </div>
  )

  if (submitted) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Send className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="text-xl font-semibold text-gray-800 mb-2">Thank You!</h3>
          <p className="text-gray-600">Your feedback helps us improve the oil painting quality.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Rate Your Oil Painting</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Star Ratings */}
        <div className="space-y-2 mb-6">
          <StarRating 
            value={quality} 
            onChange={setQuality} 
            label="Overall Quality"
            icon={Palette}
          />
          <StarRating 
            value={brushstroke} 
            onChange={setBrushstroke} 
            label="Brushstroke Visibility"
            icon={Brush}
          />
          <StarRating 
            value={preservation} 
            onChange={setPreservation} 
            label="Subject Preservation"
            icon={Eye}
          />
          <StarRating 
            value={artistic} 
            onChange={setArtistic} 
            label="Artistic Appeal"
            icon={Heart}
          />
        </div>

        {/* Would Order */}
        <div className="mb-6">
          <p className="text-sm font-medium text-gray-700 mb-3">
            Would you order a hand-painted version?
          </p>
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => setWouldOrder(true)}
              className={`flex-1 py-3 px-4 rounded-lg border-2 transition-all flex items-center justify-center gap-2 ${
                wouldOrder === true
                  ? 'border-green-500 bg-green-50 text-green-700'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <ThumbsUp className="w-5 h-5" />
              Yes, I would!
            </button>
            <button
              type="button"
              onClick={() => setWouldOrder(false)}
              className={`flex-1 py-3 px-4 rounded-lg border-2 transition-all flex items-center justify-center gap-2 ${
                wouldOrder === false
                  ? 'border-red-500 bg-red-50 text-red-700'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <ThumbsDown className="w-5 h-5" />
              Not yet
            </button>
          </div>
        </div>

        {/* Issues */}
        <div className="mb-6">
          <p className="text-sm font-medium text-gray-700 mb-3">
            Any specific issues? (Optional)
          </p>
          <div className="grid grid-cols-2 gap-2">
            {issueOptions.map(issue => (
              <button
                key={issue}
                type="button"
                onClick={() => handleIssueToggle(issue)}
                className={`py-2 px-3 rounded-lg text-sm transition-all ${
                  issues.includes(issue)
                    ? 'bg-amber-100 text-amber-800 border-2 border-amber-300'
                    : 'bg-gray-50 text-gray-600 border-2 border-gray-200 hover:border-gray-300'
                }`}
              >
                {issue}
              </button>
            ))}
          </div>
        </div>

        {/* Additional Comments */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Additional Comments (Optional)
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
            rows={3}
            placeholder="Tell us more about what you liked or what could be improved..."
          />
        </div>

        {/* Submit Button */}
        <button
          onClick={handleSubmit}
          disabled={isSubmitting || (quality === 0 && brushstroke === 0 && preservation === 0 && artistic === 0)}
          className="w-full py-3 px-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold rounded-lg hover:from-amber-600 hover:to-orange-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              <Send className="w-5 h-5" />
              Submit Feedback
            </>
          )}
        </button>

        <p className="text-xs text-gray-500 text-center mt-4">
          Your feedback is anonymous and helps improve our AI model
        </p>
      </div>
    </div>
  )
}