'use client'

import { useState } from 'react'
import { X, Play, ChevronRight, Upload, Palette, MessageSquare, HelpCircle } from 'lucide-react'

interface TutorialStep {
  id: number
  title: string
  description: string
  icon: React.ReactNode
  highlight?: string
}

const tutorialSteps: TutorialStep[] = [
  {
    id: 1,
    title: "Upload Your Photo",
    description: "Click 'Choose Image' or drag and drop any photo you want to transform into an oil painting. Works best with high-quality images of people, pets, or landscapes.",
    icon: <Upload className="w-6 h-6" />,
    highlight: "upload-area"
  },
  {
    id: 2,
    title: "Choose Your Style",
    description: "Select from 3 distinct oil painting styles:\n• Classic Portrait - Renaissance elegance\n• Thick & Textured - Van Gogh's bold strokes\n• Soft & Dreamy - Monet's impressionist touch",
    icon: <Palette className="w-6 h-6" />,
    highlight: "style-selector"
  },
  {
    id: 3,
    title: "Convert & Download",
    description: "Click 'Convert to Oil Painting' and wait about 30 seconds. Once complete, you can download your masterpiece or try another style with the same photo!",
    icon: <Play className="w-6 h-6" />,
    highlight: "convert-button"
  },
  {
    id: 4,
    title: "Beta Tester Feedback",
    description: "As a beta tester, you'll see a feedback button in the corner. Click it to report bugs, suggest features, or share your experience. Your input shapes the future of this app!",
    icon: <MessageSquare className="w-6 h-6" />,
    highlight: "feedback-button"
  }
]

export default function VideoTutorial() {
  const [isOpen, setIsOpen] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)

  const handleNext = () => {
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      setIsOpen(false)
      setCurrentStep(0)
    }
  }

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-20 right-4 z-40 bg-blue-500 text-white rounded-full p-3 shadow-lg hover:bg-blue-600 transition-all hover:scale-110"
        title="How to use this app"
      >
        <HelpCircle className="w-6 h-6" />
      </button>
    )
  }

  const step = tutorialSteps[currentStep]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-4 relative animate-fadeIn">
        {/* Close button */}
        <button
          onClick={() => {
            setIsOpen(false)
            setCurrentStep(0)
          }}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
              {step.icon}
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Step {step.id} of {tutorialSteps.length}
              </h2>
              <h3 className="text-lg font-semibold text-gray-700">
                {step.title}
              </h3>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-gray-600 whitespace-pre-line leading-relaxed">
            {step.description}
          </p>

          {/* Visual hint */}
          {step.id === 1 && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
              <div className="flex items-center justify-center text-gray-400">
                <Upload className="w-8 h-8 mr-2" />
                <span>Your photo goes here</span>
              </div>
            </div>
          )}

          {step.id === 2 && (
            <div className="mt-4 grid grid-cols-3 gap-2">
              <div className="p-2 bg-amber-50 rounded text-center text-xs">
                <div className="text-2xl mb-1">👤</div>
                Classic
              </div>
              <div className="p-2 bg-orange-50 rounded text-center text-xs">
                <div className="text-2xl mb-1">🎨</div>
                Textured
              </div>
              <div className="p-2 bg-purple-50 rounded text-center text-xs">
                <div className="text-2xl mb-1">☁️</div>
                Dreamy
              </div>
            </div>
          )}

          {step.id === 4 && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
              <strong>Beta Tester Tip:</strong> Your feedback is invaluable! Please report any issues or suggestions, no matter how small.
            </div>
          )}
        </div>

        {/* Progress dots */}
        <div className="flex justify-center space-x-2 pb-2">
          {tutorialSteps.map((_, index) => (
            <div
              key={index}
              className={`w-2 h-2 rounded-full transition-all ${
                index === currentStep 
                  ? 'bg-blue-500 w-8' 
                  : index < currentStep 
                  ? 'bg-blue-300' 
                  : 'bg-gray-300'
              }`}
            />
          ))}
        </div>

        {/* Navigation */}
        <div className="p-6 border-t border-gray-200 flex justify-between">
          <button
            onClick={handlePrevious}
            disabled={currentStep === 0}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              currentStep === 0
                ? 'text-gray-400 cursor-not-allowed'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Previous
          </button>
          
          <button
            onClick={handleNext}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors flex items-center space-x-2"
          >
            <span>{currentStep === tutorialSteps.length - 1 ? 'Get Started' : 'Next'}</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}