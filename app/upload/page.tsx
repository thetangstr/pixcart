'use client'

import { useState, useRef, useCallback } from 'react'
import Image from 'next/image'
import { Upload, X, Download, Loader2, ImageIcon, Sparkles, ArrowRight, CheckCircle } from 'lucide-react'
import { getAllComfyUIStyles } from '../lib/comfyui-styles'
import { oilPaintingStyles, type OilPaintingStyle } from '../lib/oilPaintingStyles'
import StyleSelector from '../components/StyleSelector'
import VideoTutorial from '../components/VideoTutorial'

interface ConvertedImage {
  original: string
  converted: string
  originalName: string
  style: OilPaintingStyle
}

export default function UploadPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isConverting, setIsConverting] = useState(false)
  const [convertedImages, setConvertedImages] = useState<ConvertedImage[]>([])
  const [dragActive, setDragActive] = useState(false)
  const [selectedStyle, setSelectedStyle] = useState<OilPaintingStyle>(oilPaintingStyles[0])
  const [conversionProgress, setConversionProgress] = useState(0)
  const [triedStyles, setTriedStyles] = useState<Set<string>>(new Set())
  const [useReplicate, setUseReplicate] = useState(true) // Default to Replicate for better quality
  const [preservationMode, setPreservationMode] = useState<'low' | 'medium' | 'high' | 'extreme'>('high')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0])
    }
  }, [])

  const handleFileSelect = (file: File) => {
    if (file && file.type.startsWith('image/')) {
      setSelectedFile(file)
      const url = URL.createObjectURL(file)
      setPreviewUrl(url)
      setConversionProgress(0)
    }
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0])
    }
  }

  const simulateProgress = () => {
    setConversionProgress(10)
    const interval = setInterval(() => {
      setConversionProgress(prev => {
        if (prev >= 90) {
          clearInterval(interval)
          return 90
        }
        return prev + Math.random() * 15
      })
    }, 1000)
    return interval
  }

  const convertImage = async () => {
    if (!selectedFile) return

    setIsConverting(true)
    const progressInterval = simulateProgress()
    
    try {
      const formData = new FormData()
      formData.append('image', selectedFile)
      
      let response
      
      // Use optimized production pipeline (local SDXL with expert settings)
      formData.append('style', selectedStyle.id === 'impressionist' ? 'impressionist' : 
                               selectedStyle.id === 'van_gogh' ? 'vangogh' : 
                               selectedStyle.id === 'modern' ? 'modern' : 'classic')
      formData.append('subject', 'general') // Auto-detect or let user specify
      formData.append('mode', 'local') // Use optimized local SDXL
      
      response = await fetch('/api/convert-production-optimized', {
        method: 'POST',
        body: formData,
      })

      clearInterval(progressInterval)
      setConversionProgress(100)

      if (response.ok) {
        const data = await response.json()
        
        const newConvertedImage: ConvertedImage = {
          original: previewUrl!,
          converted: data.bestResult?.image || data.image, // Use best result from production pipeline
          originalName: selectedFile.name,
          style: selectedStyle
        }
        
        setConvertedImages(prev => [newConvertedImage, ...prev])
        setTriedStyles(prev => {
          const newSet = new Set(prev)
          newSet.add(selectedStyle.id)
          return newSet
        })
        
        // Don't clear the selection - allow user to try another style
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        console.error('Conversion failed:', errorData)
        
        let errorMessage = 'Conversion failed. Please try again.'
        if (errorData.error) {
          errorMessage = errorData.error
        }
        if (errorData.details) {
          errorMessage += `\n\nDetails: ${errorData.details}`
        }
        if (errorData.suggestion) {
          errorMessage += `\n\n💡 ${errorData.suggestion}`
        }
        
        // Show user-friendly error messages
        if (errorMessage.includes('cannot identify image file')) {
          errorMessage = '❌ Image format not supported.\n\n💡 Try uploading a different image format (JPG, PNG) or a smaller file size.'
        } else if (errorMessage.includes('too large')) {
          errorMessage = '❌ Image is too large for processing.\n\n💡 Please resize your image to under 2MB and try again.'
        }
        
        alert(errorMessage)
      }
    } catch (error) {
      console.error('Error converting image:', error)
      alert('An error occurred during conversion. Please try again.')
    } finally {
      clearInterval(progressInterval)
      setIsConverting(false)
      setConversionProgress(0)
    }
  }

  const downloadImage = (url: string, filename: string) => {
    const link = document.createElement('a')
    link.href = url
    link.download = `oil-painting-${filename}`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const clearSelection = () => {
    setSelectedFile(null)
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
    }
    setPreviewUrl(null)
    setConversionProgress(0)
    setTriedStyles(new Set())
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <VideoTutorial />
      <div className="max-w-6xl mx-auto">
        {/* Development Tools */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mb-4 flex justify-end">
            <a
              href="/test-models"
              className="text-sm text-blue-600 hover:text-blue-800 underline"
            >
              🧪 Model Testing Page
            </a>
          </div>
        )}
        
        {/* Compact Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Transform Your Photo
          </h1>
          <p className="text-gray-600">
            Upload an image and select an oil painting style
          </p>
        </div>

        {/* Enhanced Style Selector with Integrated Tips */}
        <div className="mb-6 bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
          <StyleSelector
            styles={oilPaintingStyles}
            selectedStyle={selectedStyle}
            onStyleSelect={setSelectedStyle}
            triedStyles={triedStyles}
          />
          
          {/* Backend Toggle */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-900">AI Model</h3>
                <p className="text-xs text-gray-500 mt-1">
                  {useReplicate ? 'Premium quality with SDXL (Replicate)' : 'Local processing with ComfyUI'}
                </p>
              </div>
              <button
                onClick={() => setUseReplicate(!useReplicate)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  useReplicate ? 'bg-amber-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    useReplicate ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
            
            {/* Preservation Mode (only for Replicate) */}
            {useReplicate && (
              <div className="mt-4">
                <h3 className="text-sm font-medium text-gray-900 mb-2">Object Preservation</h3>
                <div className="grid grid-cols-4 gap-2">
                  {(['extreme', 'high', 'medium', 'low'] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setPreservationMode(mode)}
                      className={`px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                        preservationMode === mode
                          ? 'bg-amber-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <div className="capitalize">{mode}</div>
                      <div className="text-[10px] opacity-75 mt-0.5">
                        {mode === 'extreme' && 'Max preserve'}
                        {mode === 'high' && 'Recommended'}
                        {mode === 'medium' && 'Balanced'}
                        {mode === 'low' && 'More artistic'}
                      </div>
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Higher preservation keeps objects more recognizable but less painterly
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Upload Area */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden mb-8">
          {!selectedFile ? (
            <div
              className={`relative p-12 border-2 border-dashed rounded-2xl transition-all duration-300 ${
                dragActive
                  ? 'border-amber-500 bg-amber-50'
                  : 'border-gray-300 hover:border-amber-400 hover:bg-amber-50/50'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <div className="text-center">
                <div className="p-4 bg-gradient-to-br from-amber-500 to-orange-600 rounded-full w-fit mx-auto mb-6">
                  <Upload className="h-12 w-12 text-white" />
                </div>
                <h3 className="text-2xl font-semibold text-gray-900 mb-4">
                  Drop your image here
                </h3>
                <p className="text-gray-500 mb-6 text-lg">
                  or click to browse your files
                </p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold rounded-full hover:from-amber-600 hover:to-orange-700 transform hover:scale-105 transition-all duration-200 shadow-lg"
                >
                  <ImageIcon className="h-5 w-5 mr-2" />
                  Choose Image
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileInputChange}
                  className="hidden"
                />
                <p className="text-sm text-gray-400 mt-4">
                  Supports: JPG, PNG, GIF, WebP (Max 10MB)
                </p>
              </div>
            </div>
          ) : (
            <div className="p-6">
              <div className="relative">
                {!isConverting && (
                  <button
                    onClick={clearSelection}
                    className="absolute top-4 right-4 z-10 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-lg"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
                
                <div className="relative aspect-video bg-gray-100 rounded-xl overflow-hidden">
                  {previewUrl && (
                    <Image
                      src={previewUrl}
                      alt="Preview"
                      fill
                      className="object-contain"
                    />
                  )}
                  
                  {/* Progress Overlay */}
                  {isConverting && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <div className="bg-white rounded-xl p-6 max-w-sm w-full mx-4">
                        <div className="flex items-center justify-center mb-4">
                          <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">
                          Creating Your Masterpiece
                        </h3>
                        <p className="text-sm text-gray-600 text-center mb-4">
                          Applying {selectedStyle.name} style...
                        </p>
                        <div className="relative bg-gray-200 rounded-full h-2 overflow-hidden">
                          <div 
                            className="absolute inset-y-0 left-0 bg-gradient-to-r from-amber-500 to-orange-600 transition-all duration-500"
                            style={{ width: `${conversionProgress}%` }}
                          />
                        </div>
                        <p className="text-xs text-gray-500 text-center mt-2">
                          {conversionProgress.toFixed(0)}% Complete
                        </p>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-gray-900">{selectedFile.name}</h3>
                      <p className="text-sm text-gray-500">
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB • {selectedStyle.name} Style
                      </p>
                    </div>
                    {convertedImages.length > 0 && (
                      <button
                        onClick={clearSelection}
                        className="text-sm text-gray-600 hover:text-gray-900 underline"
                      >
                        Upload Different Image
                      </button>
                    )}
                  </div>
                  
                  {!isConverting && (
                    <div className="flex gap-3">
                      <button
                        onClick={convertImage}
                        disabled={isConverting}
                        className="flex-1 inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold rounded-full hover:from-amber-600 hover:to-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 transition-all duration-200 shadow-lg"
                      >
                        <Sparkles className="h-5 w-5 mr-2" />
                        {convertedImages.length > 0 ? 'Try This Style' : 'Convert to Oil Painting'}
                        <ArrowRight className="h-5 w-5 ml-2" />
                      </button>
                    </div>
                  )}
                  
                  {convertedImages.length > 0 && !isConverting && (
                    <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-sm text-green-800 flex items-center">
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Success! Select a different style above to create another version, or scroll down to see your gallery.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Converted Images Gallery */}
        {convertedImages.length > 0 && (
          <div className="space-y-8">
            <h2 className="text-3xl font-bold text-gray-900 text-center">
              Your Oil Painting Result
            </h2>
            
            {convertedImages.map((image, index) => (
              <div key={index} className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      <span className="text-2xl">{image.style.icon}</span>
                      <div>
                        <h3 className="font-semibold text-gray-900">{image.style.name} Style</h3>
                        <p className="text-sm text-gray-500">{image.originalName}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => downloadImage(image.converted, image.originalName)}
                      className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold rounded-lg hover:from-amber-600 hover:to-orange-700 transition-all duration-200 shadow-lg text-lg"
                    >
                      <Download className="h-5 w-5 mr-2" />
                      Download Oil Painting
                    </button>
                  </div>
                  
                  {/* Large Result Display */}
                  <div className="relative aspect-[4/3] bg-gray-100 rounded-xl overflow-hidden shadow-inner">
                    <Image
                      src={image.converted}
                      alt="Oil Painting Result"
                      fill
                      className="object-contain"
                      priority
                      sizes="(max-width: 1280px) 100vw, 1280px"
                    />
                  </div>
                  
                  {/* Small original reference */}
                  <div className="mt-4 flex items-center space-x-2 text-sm text-gray-500">
                    <span>Original photo: {image.originalName}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  )
}