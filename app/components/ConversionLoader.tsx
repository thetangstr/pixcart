'use client'

import { useEffect, useState } from 'react'
import { Palette, Sparkles, Brush, Heart } from 'lucide-react'

interface ConversionLoaderProps {
  styleName: string
  progress: number
}

const loadingMessages = [
  "Analyzing your pet's unique features...",
  "Selecting the perfect brushstrokes...",
  "Mixing oil paint colors...",
  "Applying artistic style...",
  "Adding texture and depth...",
  "Enhancing details...",
  "Creating your masterpiece...",
  "Almost there, adding final touches..."
]

const funFacts = [
  "Did you know? Oil paintings can last over 500 years!",
  "Van Gogh created over 900 paintings in just 10 years!",
  "The Mona Lisa is only 30 x 21 inches in size.",
  "Oil paint was first used in the 7th century.",
  "Most famous paintings took months to complete by hand.",
  "Your pet deserves to be immortalized in art!",
  "Professional pet portraits can cost $500-$5000.",
  "AI helps us preview your painting in seconds!"
]

export default function ConversionLoader({ styleName, progress }: ConversionLoaderProps) {
  const [currentMessage, setCurrentMessage] = useState(0)
  const [funFact, setFunFact] = useState('')
  const [dots, setDots] = useState('.')
  
  useEffect(() => {
    // Change message based on progress
    const messageIndex = Math.min(
      Math.floor((progress / 100) * loadingMessages.length),
      loadingMessages.length - 1
    )
    setCurrentMessage(messageIndex)
  }, [progress])
  
  useEffect(() => {
    // Set a random fun fact on mount
    setFunFact(funFacts[Math.floor(Math.random() * funFacts.length)])
  }, [])
  
  useEffect(() => {
    // Animate dots
    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '.' : prev + '.')
    }, 500)
    return () => clearInterval(interval)
  }, [])
  
  return (
    <div className="absolute inset-0 bg-gradient-to-br from-amber-50/95 to-orange-50/95 backdrop-blur-sm flex items-center justify-center p-4" data-testid="conversion-loader">
      <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full">
        {/* Animated Icon */}
        <div className="relative mb-6">
          <div className="w-24 h-24 mx-auto relative">
            {/* Spinning background circle */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 animate-spin-slow opacity-20" />
            
            {/* Main icon container */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative">
                <Palette className="w-12 h-12 text-amber-600 animate-pulse" />
                
                {/* Floating elements */}
                <Sparkles className="absolute -top-2 -right-2 w-4 h-4 text-orange-500 animate-bounce" />
                <Brush className="absolute -bottom-2 -left-2 w-4 h-4 text-amber-500 animate-bounce delay-150" />
                <Heart className="absolute -top-2 -left-2 w-3 h-3 text-red-500 animate-pulse" />
              </div>
            </div>
          </div>
        </div>
        
        {/* Title */}
        <h3 className="text-2xl font-bold text-center mb-2 bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
          Creating Your Pet's Portrait
        </h3>
        
        {/* Style name */}
        <p className="text-center text-gray-600 mb-4">
          {styleName} Style
        </p>
        
        {/* Current action */}
        <div className="mb-6">
          <p className="text-sm text-gray-700 text-center font-medium">
            {loadingMessages[currentMessage]}{dots}
          </p>
        </div>
        
        {/* Progress bar */}
        <div className="mb-4">
          <div className="relative bg-gray-200 rounded-full h-3 overflow-hidden">
            <div 
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-amber-500 to-orange-600 transition-all duration-700 ease-out rounded-full"
              style={{ width: `${progress}%` }}
            >
              {/* Shimmer effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
            </div>
          </div>
          <div className="flex justify-between mt-2">
            <span className="text-xs text-gray-500">Processing</span>
            <span className="text-sm font-bold text-amber-600">{progress.toFixed(0)}%</span>
          </div>
        </div>
        
        {/* Fun fact */}
        <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
          <div className="flex items-start space-x-2">
            <Sparkles className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs font-semibold text-amber-700 mb-1">Fun Fact</p>
              <p className="text-xs text-gray-700">{funFact}</p>
            </div>
          </div>
        </div>
        
        {/* Estimated time */}
        <p className="text-xs text-center text-gray-500 mt-4">
          Estimated time: 15-30 seconds
        </p>
      </div>
    </div>
  )
}