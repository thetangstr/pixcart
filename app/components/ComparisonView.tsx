'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Download, Zap, Cpu, Star, Clock, CheckCircle, AlertCircle } from 'lucide-react'

interface ComparisonResult {
  success: boolean
  image: string | null
  error: string | null
  processingTime?: number
}

interface ComparisonViewProps {
  originalImage: string
  results: {
    a1111: ComparisonResult
    comfyui: ComparisonResult
  }
  styleName: string
  onDownload: (backend: 'a1111' | 'comfyui', image: string) => void
}

export default function ComparisonView({ 
  originalImage, 
  results, 
  styleName, 
  onDownload 
}: ComparisonViewProps) {
  const [selectedResult, setSelectedResult] = useState<'a1111' | 'comfyui' | null>(null)

  const downloadImage = (backend: 'a1111' | 'comfyui') => {
    const result = results[backend]
    if (result.success && result.image) {
      onDownload(backend, result.image)
    }
  }

  const backends = [
    {
      id: 'a1111' as const,
      name: 'Automatic1111',
      icon: Cpu,
      color: 'blue',
      result: results.a1111
    },
    {
      id: 'comfyui' as const,
      name: 'ComfyUI',
      icon: Zap,
      color: 'purple',
      result: results.comfyui
    }
  ]

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-2xl font-bold text-gray-900 mb-2">
          Backend Comparison: {styleName}
        </h3>
        <p className="text-gray-600">
          Compare results from different AI backends side by side
        </p>
      </div>

      {/* Original Image */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Star className="h-5 w-5 text-yellow-500" />
          Original Image
        </h4>
        <div className="relative w-full h-64 bg-gray-100 rounded-lg overflow-hidden">
          <Image
            src={originalImage}
            alt="Original"
            fill
            className="object-contain"
            sizes="(max-width: 768px) 100vw, 50vw"
          />
        </div>
      </div>

      {/* Comparison Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {backends.map((backend) => {
          const Icon = backend.icon
          const isSelected = selectedResult === backend.id
          
          return (
            <div
              key={backend.id}
              className={`bg-white rounded-lg border-2 transition-all duration-200 ${
                isSelected
                  ? `border-${backend.color}-500 shadow-lg`
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              {/* Header */}
              <div className="p-4 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className={`h-6 w-6 text-${backend.color}-600`} />
                    <h4 className="font-semibold text-gray-900">{backend.name}</h4>
                  </div>
                  <div className="flex items-center gap-2">
                    {backend.result.success ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-red-500" />
                    )}
                    {backend.result.processingTime && (
                      <div className="flex items-center gap-1 text-sm text-gray-500">
                        <Clock className="h-4 w-4" />
                        {backend.result.processingTime}s
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-4">
                {backend.result.success && backend.result.image ? (
                  <div className="space-y-4">
                    <div 
                      className={`relative w-full h-64 bg-gray-100 rounded-lg overflow-hidden cursor-pointer transition-transform hover:scale-105 ${
                        isSelected ? 'ring-2 ring-' + backend.color + '-500' : ''
                      }`}
                      onClick={() => setSelectedResult(isSelected ? null : backend.id)}
                    >
                      <Image
                        src={backend.result.image}
                        alt={`${backend.name} result`}
                        fill
                        className="object-contain"
                        sizes="(max-width: 768px) 100vw, 50vw"
                      />
                    </div>
                    
                    <button
                      onClick={() => downloadImage(backend.id)}
                      className={`w-full flex items-center justify-center gap-2 px-4 py-2 bg-${backend.color}-600 text-white rounded-lg hover:bg-${backend.color}-700 transition-colors`}
                    >
                      <Download className="h-4 w-4" />
                      Download {backend.name} Result
                    </button>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <AlertCircle className="h-12 w-12 text-red-300 mx-auto mb-4" />
                    <h5 className="font-medium text-gray-900 mb-2">
                      {backend.name} Failed
                    </h5>
                    <p className="text-sm text-red-600">
                      {backend.result.error || 'Unknown error occurred'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Comparison Notes */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h5 className="font-semibold text-blue-900 mb-2">Comparison Tips</h5>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Click on images to select and compare them side by side</li>
          <li>• A1111 typically offers more extensions and community support</li>
          <li>• ComfyUI often provides faster inference and more flexible workflows</li>
          <li>• Both backends use the same style parameters but may produce different results</li>
        </ul>
      </div>

      {/* Results Summary */}
      {(results.a1111.success || results.comfyui.success) && (
        <div className="text-center">
          <p className="text-sm text-gray-600">
            {results.a1111.success && results.comfyui.success 
              ? 'Both backends completed successfully! Compare the results above.'
              : results.a1111.success 
                ? 'Automatic1111 completed successfully. ComfyUI encountered an error.'
                : 'ComfyUI completed successfully. Automatic1111 encountered an error.'
            }
          </p>
        </div>
      )}
    </div>
  )
}