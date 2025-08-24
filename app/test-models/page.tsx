'use client'

import { useState, useRef, useCallback } from 'react'
import Image from 'next/image'
import { Upload, X, Download, Loader2, Settings, Grid, Eye, Save } from 'lucide-react'
import dynamic from 'next/dynamic'

// Dynamically import QueueMonitor to avoid SSR issues
const QueueMonitor = dynamic(() => import('../components/QueueMonitor'), {
  ssr: false,
  loading: () => <div className="bg-white rounded-lg shadow-md p-4 animate-pulse h-64" />
})

interface ModelOption {
  id: string
  name: string
  provider: 'replicate' | 'comfyui' | 'a1111'
  model?: string
  description: string
  cost?: string
  time?: string
}

const AVAILABLE_MODELS: ModelOption[] = [
  // Replicate (Cloud API)
  {
    id: 'replicate-sdxl',
    name: 'Replicate (SDXL)',
    provider: 'replicate',
    model: 'stability-ai/sdxl',
    description: 'Cloud-based SDXL with refiner - Good quality, reliable',
    cost: '$0.02/image',
    time: '20-30s'
  },
  
  // ComfyUI with SD 1.5 (Currently Available)
  {
    id: 'comfyui-sd15',
    name: 'ComfyUI w/ SD 1.5',
    provider: 'comfyui',
    model: 'v1-5-pruned-emaonly.safetensors',
    description: 'Local SD 1.5 - Currently installed, works with 8GB GPU',
    cost: 'Free (local)',
    time: '20-40s'
  },
  
  // ComfyUI with SD 1.5 Enhanced (Uses SD 1.5 with special prompts)
  {
    id: 'comfyui-enhanced',
    name: 'ComfyUI Enhanced',
    provider: 'comfyui',
    model: 'v1-5-pruned-emaonly.safetensors',
    description: '✅ Enhanced SD 1.5 with oil painting optimization',
    cost: 'Free (local)',
    time: '20-40s'
  },
  
  // ComfyUI with SDXL (Now Available!)
  {
    id: 'comfyui-sdxl',
    name: 'ComfyUI w/ SDXL',
    provider: 'comfyui',
    model: 'sd_xl_base_1.0_0.9vae.safetensors', // SDXL is ready!
    description: '✅ SDXL 1.0 - High quality, 1024x1024 native resolution',
    cost: 'Free (local)',
    time: '30-50s'
  }
]

const STYLES = ['classic_portrait', 'soft_impressionist', 'thick_textured', 'modern_abstract']
const PRESERVATION_MODES = ['extreme', 'high', 'medium', 'low']

interface ConversionResult {
  modelId: string
  image: string
  time: number
  metadata?: any
  error?: string
}

export default function TestModelsPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [selectedModels, setSelectedModels] = useState<string[]>(['replicate-sdxl', 'comfyui-sd15'])
  const [style, setStyle] = useState('classic_portrait')
  const [preservationMode, setPreservationMode] = useState('high')
  const [strength, setStrength] = useState(0.35)
  const [isConverting, setIsConverting] = useState(false)
  const [results, setResults] = useState<ConversionResult[]>([])
  const [showSettings, setShowSettings] = useState(true)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (file: File) => {
    if (file && file.type.startsWith('image/')) {
      setSelectedFile(file)
      const url = URL.createObjectURL(file)
      setPreviewUrl(url)
      setResults([]) // Clear previous results
    }
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0])
    }
  }

  const toggleModel = (modelId: string) => {
    setSelectedModels(prev => 
      prev.includes(modelId)
        ? prev.filter(id => id !== modelId)
        : [...prev, modelId]
    )
  }

  const convertWithModel = async (model: ModelOption): Promise<ConversionResult> => {
    const startTime = Date.now()
    const formData = new FormData()
    formData.append('image', selectedFile!)
    formData.append('style', style)
    formData.append('preservationMode', preservationMode)
    formData.append('strength', strength.toString())

    try {
      let response
      
      if (model.provider === 'replicate') {
        // Map model to quality tier
        let quality = 'standard'
        if (model.model?.includes('turbo')) quality = 'quick'
        if (model.model?.includes('jiupinjia')) quality = 'premium'
        
        formData.append('quality', quality)
        response = await fetch('/api/convert-replicate', {
          method: 'POST',
          body: formData,
        })
      } else if (model.provider === 'comfyui') {
        formData.append('backend', 'comfyui')
        // Pass the specific model to use
        if (model.model) {
          formData.append('checkpoint', model.model)
        }
        response = await fetch('/api/convert-dual', {
          method: 'POST',
          body: formData,
        })
      }

      if (!response) {
        throw new Error('No response')
      }

      const data = await response.json()
      const elapsed = Date.now() - startTime

      if (response.ok && data.success) {
        return {
          modelId: model.id,
          image: data.image,
          time: elapsed,
          metadata: data.metadata
        }
      } else {
        return {
          modelId: model.id,
          image: '',
          time: elapsed,
          error: data.error || 'Conversion failed'
        }
      }
    } catch (error) {
      return {
        modelId: model.id,
        image: '',
        time: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  const runComparison = async () => {
    if (!selectedFile || selectedModels.length === 0) return
    
    setIsConverting(true)
    setResults([])
    
    const models = selectedModels
      .map(id => AVAILABLE_MODELS.find(m => m.id === id))
      .filter(Boolean) as ModelOption[]
    
    // Run conversions in parallel
    const promises = models.map(model => convertWithModel(model))
    const newResults = await Promise.all(promises)
    
    setResults(newResults)
    setIsConverting(false)
  }

  const downloadResult = (result: ConversionResult) => {
    const model = AVAILABLE_MODELS.find(m => m.id === result.modelId)
    const link = document.createElement('a')
    link.href = result.image
    link.download = `${model?.name.replace(/\s+/g, '_')}_${style}_${preservationMode}.png`
    link.click()
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Model Testing & Comparison</h1>
          <p className="text-gray-600">Compare different AI models for oil painting conversion</p>
          <div className="mt-4 p-3 bg-green-50 rounded-lg text-sm">
            <span className="font-medium">🎨 Local Models Status:</span> 
            <span className="ml-1">SD 1.5 ✅ Ready | SDXL ✅ Ready (6.5GB) | FLUX ⚠️ Partial (needs config)</span>
            <br />
            <span className="text-green-600 text-xs">Both SD 1.5 and SDXL are fully operational!</span>
          </div>
        </div>

        {/* Queue Monitor - Shows GPU usage and processing status */}
        <div className="mb-6">
          <QueueMonitor />
        </div>

        {/* Settings Panel */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Settings</h2>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <Settings className="h-5 w-5" />
            </button>
          </div>
          
          {showSettings && (
            <div className="space-y-4">
              {/* Model Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Models to Compare ({selectedModels.length} selected)
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {AVAILABLE_MODELS.map(model => (
                    <button
                      key={model.id}
                      onClick={() => toggleModel(model.id)}
                      className={`p-3 text-left rounded-lg border-2 transition-colors ${
                        selectedModels.includes(model.id)
                          ? 'border-amber-500 bg-amber-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="font-semibold text-sm text-gray-900">{model.name}</div>
                      <div className="text-xs text-gray-600 mt-1">
                        <span className="font-medium">{model.cost}</span> • <span>{model.time}</span>
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5 line-clamp-2">{model.description}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Style & Preservation */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Style</label>
                  <select
                    value={style}
                    onChange={(e) => setStyle(e.target.value)}
                    className="w-full p-2 border rounded-lg"
                  >
                    <option value="classic_portrait">Classic Portrait</option>
                    <option value="soft_impressionist">Soft Impressionist (Monet)</option>
                    <option value="thick_textured">Thick Textured (Van Gogh)</option>
                    <option value="modern_abstract">Modern Abstract</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Preservation Mode</label>
                  <select
                    value={preservationMode}
                    onChange={(e) => setPreservationMode(e.target.value)}
                    className="w-full p-2 border rounded-lg"
                  >
                    {PRESERVATION_MODES.map(mode => (
                      <option key={mode} value={mode}>{mode.charAt(0).toUpperCase() + mode.slice(1)}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Strength Slider */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Strength: {strength.toFixed(2)}
                </label>
                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.05"
                  value={strength}
                  onChange={(e) => setStrength(parseFloat(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>More preserved</span>
                  <span>More artistic</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Upload Area */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          {!selectedFile ? (
            <div
              className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-amber-400 transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Upload Test Image</h3>
              <p className="text-gray-500">Click to browse or drag and drop</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileInputChange}
                className="hidden"
              />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Original Image</h3>
                <button
                  onClick={() => {
                    setSelectedFile(null)
                    setPreviewUrl(null)
                    setResults([])
                  }}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <div className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden">
                {previewUrl && (
                  <Image
                    src={previewUrl}
                    alt="Original"
                    fill
                    className="object-contain"
                  />
                )}
              </div>
              
              <button
                onClick={runComparison}
                disabled={isConverting || selectedModels.length === 0}
                className="w-full py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:bg-gray-400 transition-colors flex items-center justify-center"
              >
                {isConverting ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    Converting with {selectedModels.length} models...
                  </>
                ) : (
                  <>
                    <Grid className="h-5 w-5 mr-2" />
                    Run Comparison
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Results Grid */}
        {results.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Results</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {results.map((result) => {
                const model = AVAILABLE_MODELS.find(m => m.id === result.modelId)
                return (
                  <div key={result.modelId} className="border-2 rounded-lg overflow-hidden shadow-md">
                    <div className="bg-gradient-to-r from-amber-50 to-amber-100 px-4 py-3 border-b-2 border-amber-200">
                      <div className="font-bold text-lg text-gray-900">{model?.name || 'Unknown Model'}</div>
                      <div className="text-sm text-gray-700 mt-1">
                        {result.error ? (
                          <span className="text-red-600 font-medium">❌ {result.error}</span>
                        ) : (
                          <div className="flex items-center justify-between">
                            <span className="text-green-700 font-medium">✅ Success</span>
                            <span className="text-gray-600">⏱️ {(result.time / 1000).toFixed(1)}s</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {result.image ? (
                      <div className="relative aspect-video bg-gray-100">
                        <Image
                          src={result.image}
                          alt={model?.name || 'Result'}
                          fill
                          className="object-contain"
                        />
                        {/* Model label overlay */}
                        <div className="absolute top-2 left-2 bg-black bg-opacity-70 text-white px-3 py-1 rounded-lg text-sm font-semibold">
                          {model?.name || 'Unknown'}
                        </div>
                        <div className="absolute top-2 right-2 flex gap-2">
                          <button
                            onClick={() => downloadResult(result)}
                            className="p-2 bg-white rounded-lg shadow-lg hover:bg-gray-100"
                            title="Download"
                          >
                            <Download className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="aspect-video bg-gray-100 flex items-center justify-center text-gray-400">
                        {result.error ? 'Failed' : 'No image'}
                      </div>
                    )}
                    
                    {result.metadata && (
                      <div className="p-3 bg-gray-50 text-xs">
                        <details>
                          <summary className="cursor-pointer font-medium">Metadata</summary>
                          <pre className="mt-2 overflow-x-auto">
                            {JSON.stringify(result.metadata, null, 2)}
                          </pre>
                        </details>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}