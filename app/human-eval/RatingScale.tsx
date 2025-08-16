import React from 'react'

interface RatingScaleProps {
  label: string
  value: 1 | 2 | 3 | 4 | 5
  onChange: (value: 1 | 2 | 3 | 4 | 5) => void
  descriptions: {
    1: { emoji: string; label: string; desc: string }
    2: { emoji: string; label: string; desc: string }
    3: { emoji: string; label: string; desc: string }
    4: { emoji: string; label: string; desc: string }
    5: { emoji: string; label: string; desc: string }
  }
}

export default function RatingScale({ label, value, onChange, descriptions }: RatingScaleProps) {
  const getColorClasses = (score: number, isActive: boolean) => {
    if (!isActive) return 'border-gray-200 hover:border-gray-300 bg-white'
    
    switch (score) {
      case 5: return 'border-green-500 bg-green-50'
      case 4: return 'border-lime-500 bg-lime-50'
      case 3: return 'border-yellow-500 bg-yellow-50'
      case 2: return 'border-orange-500 bg-orange-50'
      case 1: return 'border-red-500 bg-red-50'
      default: return 'border-gray-200 bg-white'
    }
  }
  
  const getTextColor = (score: number) => {
    switch (score) {
      case 5: return 'text-green-600'
      case 4: return 'text-lime-600'
      case 3: return 'text-yellow-600'
      case 2: return 'text-orange-600'
      case 1: return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  return (
    <div className="mb-6">
      <label className="block text-sm font-medium text-gray-700 mb-3">
        {label}
      </label>
      <div className="grid grid-cols-5 gap-2">
        {([1, 2, 3, 4, 5] as const).map((score) => {
          const desc = descriptions[score]
          const isActive = value === score
          
          return (
            <button
              key={score}
              onClick={() => onChange(score)}
              className={`relative p-3 rounded-lg border-2 transition-all transform hover:scale-105 ${
                getColorClasses(score, isActive)
              }`}
            >
              <div className="text-2xl mb-1">{desc.emoji}</div>
              <div className={`text-lg font-bold ${isActive ? getTextColor(score) : 'text-gray-400'}`}>
                {score}
              </div>
              <div className="text-xs font-medium text-gray-700 mt-1">{desc.label}</div>
              <div className="text-xs text-gray-500">{desc.desc}</div>
              
              {/* Active indicator */}
              {isActive && (
                <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full ${
                  score >= 4 ? 'bg-green-500' : score === 3 ? 'bg-yellow-500' : 'bg-red-500'
                }`} />
              )}
            </button>
          )
        })}
      </div>
      
      {/* Visual scale indicator */}
      <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
        <span>← Worse</span>
        <div className="flex-1 mx-4 h-1 bg-gradient-to-r from-red-400 via-yellow-400 to-green-400 rounded-full" />
        <span>Better →</span>
      </div>
    </div>
  )
}