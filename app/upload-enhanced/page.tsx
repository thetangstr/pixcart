'use client'

import { useState, useRef, useCallback } from 'react'
import Image from 'next/image'
import { Upload, X, Download, Loader2, ImageIcon, Sparkles, ArrowRight, GitCompare } from 'lucide-react'
import { oilPaintingStyles, type OilPaintingStyle } from '../lib/oilPaintingStyles'
import StyleSelector from '../components/StyleSelector'
import BackendSelector, { type SDBackend } from '../components/BackendSelector'
import ComparisonView from '../components/ComparisonView'

interface ConvertedImage {
  original: string
  converted: string
  originalName: string
  style: OilPaintingStyle
  backend: SDBackend
}

interface ComparisonResults {
  a1111: {
    success: boolean
    image: string | null
    error: string | null
  }
  comfyui: {
    success: boolean
    image: string | null
    error: string | null
  }
}

export default function EnhancedUploadPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isConverting, setIsConverting] = useState(false)
  const [convertedImages, setConvertedImages] = useState<ConvertedImage[]>([])
  const [comparisonResults, setComparisonResults] = useState<ComparisonResults | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const [selectedStyle, setSelectedStyle] = useState<OilPaintingStyle>(oilPaintingStyles[0])
  const [selectedBackend, setSelectedBackend] = useState<SDBackend>('comfyui')
  const [compareMode, setCompareMode] = useState(false)
  const [conversionProgress, setConversionProgress] = useState(0)
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
      setComparisonResults(null)
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
    setComparisonResults(null)
    const progressInterval = simulateProgress()
    
    try {
      const formData = new FormData()
      formData.append('image', selectedFile)
      formData.append('style', selectedStyle.id)
      formData.append('backend', selectedBackend)
      formData.append('compareMode', compareMode.toString())

      // Try the real API first, fallback to demo if backends not available
      let response = await fetch('/api/convert-dual', {
        method: 'POST',
        body: formData,
      })

      // If real backends fail, use demo mode
      if (!response.ok) {
        console.log('Real backends not available, using demo mode')
        response = await fetch('/api/demo-convert', {
          method: 'POST',
          body: formData,
        })
      }

      clearInterval(progressInterval)
      setConversionProgress(100)

      if (response.ok) {
        const data = await response.json()
        
        if (data.compareMode) {
          // Comparison mode - show results from both backends
          setComparisonResults(data.results)
        } else {
          // Single backend mode - add to converted images
          const newConvertedImage: ConvertedImage = {
            original: URL.createObjectURL(selectedFile),
            converted: data.image,
            originalName: selectedFile.name,
            style: selectedStyle,
            backend: data.backend
          }
          setConvertedImages(prev => [newConvertedImage, ...prev])
        }
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Conversion failed')
      }
    } catch (error) {
      console.error('Conversion error:', error)
      alert(`Conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      clearInterval(progressInterval)
      setIsConverting(false)
      setConversionProgress(0)
    }
  }

  const downloadImage = (backend: SDBackend, imageData: string) => {
    const link = document.createElement('a')
    link.download = `oil-painting-${selectedStyle.name.toLowerCase().replace(/\s+/g, '-')}-${backend}.png`
    link.href = imageData
    link.click()
  }

  const clearAll = () => {
    setSelectedFile(null)
    setPreviewUrl(null)
    setConvertedImages([])
    setComparisonResults(null)
    setConversionProgress(0)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
            Enhanced Oil Painting Converter
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Compare A1111 vs ComfyUI results or convert with your preferred backend
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Panel - Upload & Controls */}
          <div className="lg:col-span-1 space-y-6">
            {/* File Upload */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Upload Image</h2>
              
              <div
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 ${
                  dragActive
                    ? 'border-amber-400 bg-amber-50'
                    : 'border-gray-300 hover:border-amber-400 hover:bg-amber-50'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                {previewUrl ? (
                  <div className="space-y-4">
                    <div className="relative w-32 h-32 mx-auto rounded-lg overflow-hidden">
                      <Image
                        src={previewUrl}
                        alt="Preview"
                        fill
                        className="object-cover"
                        sizes="128px"
                      />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{selectedFile?.name}</p>
                      <button
                        onClick={clearAll}
                        className="text-sm text-red-600 hover:text-red-700 flex items-center gap-1 mx-auto mt-2"
                      >
                        <X className="h-4 w-4" />
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 mb-2">Drop your image here or</p>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="text-amber-600 hover:text-amber-700 font-medium"
                    >
                      browse files
                    </button>
                  </div>
                )}
              </div>
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileInputChange}
                className="hidden"
              />
            </div>

            {/* Backend Selection */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <BackendSelector
                selectedBackend={selectedBackend}
                onBackendChange={setSelectedBackend}
              />
            </div>

            {/* Comparison Mode Toggle */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">Comparison Mode</h3>
                  <p className="text-sm text-gray-600">Run both backends and compare results</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={compareMode}
                    onChange={(e) => setCompareMode(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-amber-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
                </label>
              </div>
            </div>

            {/* Style Selection */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Select Style</h3>
              <StyleSelector
                styles={oilPaintingStyles}
                selectedStyle={selectedStyle}
                onStyleSelect={setSelectedStyle}
                triedStyles={new Set()}
              />
            </div>

            {/* Convert Button */}
            <button
              onClick={convertImage}
              disabled={!selectedFile || isConverting}
              className="w-full bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold py-4 px-6 rounded-xl hover:from-amber-600 hover:to-orange-700 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
            >
              {isConverting ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  {compareMode ? 'Comparing Backends...' : 'Converting...'}
                </>
              ) : (
                <>
                  {compareMode ? <GitCompare className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}
                  {compareMode ? 'Compare Both Backends' : `Convert with ${selectedBackend.toUpperCase()}`}
                  <ArrowRight className="h-5 w-5" />
                </>
              )}
            </button>

            {/* Progress */}
            {isConverting && (
              <div className="bg-white rounded-xl shadow-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">
                    {compareMode ? 'Processing both backends...' : 'Processing...'}
                  </span>
                  <span className="text-sm text-gray-500">{Math.round(conversionProgress)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-amber-500 to-orange-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${conversionProgress}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Right Panel - Results */}
          <div className="lg:col-span-2">
            {comparisonResults ? (
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <ComparisonView
                  originalImage={previewUrl!}
                  results={comparisonResults}
                  styleName={selectedStyle.name}
                  onDownload={downloadImage}
                />
              </div>
            ) : convertedImages.length > 0 ? (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900">Converted Images</h2>
                {convertedImages.map((image, index) => (
                  <div key={index} className="bg-white rounded-2xl shadow-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {image.style.name} - {image.backend.toUpperCase()}
                      </h3>
                      <button
                        onClick={() => downloadImage(image.backend, image.converted)}
                        className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
                      >
                        <Download className="h-4 w-4" />
                        Download
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Original</h4>
                        <div className="relative w-full h-64 bg-gray-100 rounded-lg overflow-hidden">
                          <Image
                            src={image.original}
                            alt="Original"
                            fill
                            className="object-contain"
                            sizes="(max-width: 768px) 100vw, 50vw"
                          />
                        </div>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Oil Painting</h4>
                        <div className="relative w-full h-64 bg-gray-100 rounded-lg overflow-hidden">
                          <Image
                            src={image.converted}
                            alt="Converted"
                            fill
                            className="object-contain"
                            sizes="(max-width: 768px) 100vw, 50vw"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
                <ImageIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-700 mb-2">
                  Ready to Create Art
                </h3>
                <p className="text-gray-500">
                  Upload an image and select your preferences to get started
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}