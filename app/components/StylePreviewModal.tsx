'use client'

import { useState } from 'react'
import { X, ChevronLeft, ChevronRight, Eye } from 'lucide-react'
import Image from 'next/image'
import { OilPaintingStyle } from '../lib/oilPaintingStyles'

interface StylePreviewModalProps {
  isOpen: boolean
  onClose: () => void
  style: OilPaintingStyle
}

const styleExamples = {
  classic_portrait: [
    { before: '/examples/portrait-before-1.jpg', after: '/examples/classic-portrait-1.jpg', description: 'Professional headshot with Renaissance elegance' },
    { before: '/examples/portrait-before-2.jpg', after: '/examples/classic-portrait-2.jpg', description: 'Family photo with classical refinement' }
  ],
  thick_textured: [
    { before: '/examples/landscape-before-1.jpg', after: '/examples/thick-textured-1.jpg', description: 'Landscape with Van Gogh-style bold strokes' },
    { before: '/examples/pet-before-1.jpg', after: '/examples/thick-textured-2.jpg', description: 'Pet portrait with dramatic texture' }
  ],
  soft_impressionist: [
    { before: '/examples/nature-before-1.jpg', after: '/examples/soft-impressionist-1.jpg', description: 'Garden scene with Monet-style lighting' },
    { before: '/examples/couple-before-1.jpg', after: '/examples/soft-impressionist-2.jpg', description: 'Romantic portrait with dreamy atmosphere' }
  ]
}

export default function StylePreviewModal({ isOpen, onClose, style }: StylePreviewModalProps) {
  const [currentExample, setCurrentExample] = useState(0)
  const [showComparison, setShowComparison] = useState(true)
  
  if (!isOpen) return null
  
  const examples = styleExamples[style.id as keyof typeof styleExamples] || []
  const example = examples[currentExample]
  
  if (!example) return null

  const nextExample = () => {
    setCurrentExample((prev) => (prev + 1) % examples.length)
  }
  
  const prevExample = () => {
    setCurrentExample((prev) => (prev - 1 + examples.length) % examples.length)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{style.icon}</span>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{style.name} Style</h2>
              <p className="text-gray-600 text-sm">{style.description}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="h-5 w-5 text-gray-600" />
          </button>
        </div>
        
        {/* Content */}
        <div className="p-6">
          {/* Toggle Controls */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowComparison(!showComparison)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  showComparison 
                    ? 'bg-amber-100 text-amber-700' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Eye className="h-4 w-4" />
                {showComparison ? 'Hide Comparison' : 'Show Before/After'}
              </button>
            </div>
            
            {/* Example Navigation */}
            {examples.length > 1 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={prevExample}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-sm text-gray-600">
                  {currentExample + 1} of {examples.length}
                </span>
                <button
                  onClick={nextExample}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
          
          {/* Image Display */}
          <div className="space-y-4">
            {showComparison ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Before */}
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Original Photo</h3>
                  <div className="relative aspect-[4/3] rounded-lg overflow-hidden bg-gray-100">
                    <Image
                      src={example.before}
                      alt="Original photo"
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 50vw"
                    />
                  </div>
                </div>
                
                {/* After */}
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Oil Painting Result</h3>
                  <div className="relative aspect-[4/3] rounded-lg overflow-hidden bg-gray-100">
                    <Image
                      src={example.after}
                      alt="Oil painting result"
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 50vw"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Oil Painting Result</h3>
                <div className="relative aspect-[4/3] rounded-lg overflow-hidden bg-gray-100 max-w-2xl mx-auto">
                  <Image
                    src={example.after}
                    alt="Oil painting result"
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 66vw"
                  />
                </div>
              </div>
            )}
            
            {/* Description */}
            <p className="text-center text-gray-600 text-sm italic">
              {example.description}
            </p>
          </div>
        </div>
        
        {/* Footer */}
        <div className="border-t border-gray-200 p-6 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              <strong>Pro tip:</strong> This style works best with {style.name.toLowerCase()} subjects
            </div>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors font-medium"
            >
              Got it!
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}