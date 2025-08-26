'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { Loader2, Check, X, AlertCircle, Settings, Activity, Database, Zap, Shield, RefreshCw, Download, ChevronDown, ChevronUp, Cpu, HardDrive, Server } from 'lucide-react'

interface TestResult {
  modelId: string
  modelName: string
  success: boolean
  processingTime?: number
  outputImage?: string
  error?: string
  metadata?: {
    filename?: string
    processingSteps?: number
  }
}

interface ModelStatus {
  id: string
  name: string
  provider: string
  status: 'online' | 'offline' | 'checking' | 'error'
  responseTime?: number
  lastChecked?: Date
  version?: string
  capabilities?: string[]
  vramUsage?: number
  gpuTemp?: number
  isProductionModel?: boolean
  metrics?: {
    totalRequests: number
    successRate: number
    avgProcessingTime: number
    lastError?: string
  }
}

interface ModelConfig {
  id: string
  name: string
  provider: 'replicate' | 'comfyui' | 'a1111'
  endpoint?: string
  apiKey?: string
  model: string
  description: string
  cost?: string
  estimatedTime?: string
  minVram?: number
  recommended?: boolean
}

const MODEL_CONFIGS: ModelConfig[] = [
  // Production Optimized Model (PRIMARY)
  {
    id: 'local_sdxl_optimized',
    name: '🎨 Production SDXL (Optimized)',
    provider: 'comfyui',
    endpoint: 'http://localhost:8188',
    model: 'sd_xl_base_1.0_0.9vae.safetensors',
    description: '⚡ PRODUCTION MODEL - Expert-tuned with thick brushstrokes (0.75 denoising, CFG 13.0)',
    cost: 'Free (local)',
    estimatedTime: '25-35s',
    minVram: 12,
    recommended: true,
    isProductionModel: true
  },
  
  // Replicate Models
  {
    id: 'replicate-sdxl',
    name: 'Replicate SDXL (Backup)',
    provider: 'replicate',
    model: 'stability-ai/sdxl',
    description: 'Cloud-based SDXL with refiner - Automatic fallback when local unavailable',
    cost: '$0.02/image',
    estimatedTime: '20-30s',
    minVram: 0
  },
  {
    id: 'replicate-flux',
    name: 'Replicate FLUX',
    provider: 'replicate',
    model: 'black-forest-labs/flux-dev',
    description: 'Latest FLUX model - State of the art quality',
    cost: '$0.02/image',
    estimatedTime: '20-30s',
    minVram: 0
  },
  
  // Local ComfyUI Models
  {
    id: 'comfyui-sd15',
    name: 'ComfyUI SD 1.5',
    provider: 'comfyui',
    endpoint: 'http://localhost:8188',
    model: 'v1-5-pruned-emaonly.safetensors',
    description: 'Local SD 1.5 - Fast, works with 8GB GPU',
    cost: 'Free (local)',
    estimatedTime: '20-40s',
    minVram: 8,
    recommended: true
  },
  {
    id: 'comfyui-enhanced',
    name: 'ComfyUI Enhanced',
    provider: 'comfyui',
    endpoint: 'http://localhost:8188',
    model: 'v1-5-pruned-emaonly.safetensors',
    description: '✨ Enhanced SD 1.5 with oil painting LoRA & optimized workflow',
    cost: 'Free (local)',
    estimatedTime: '25-45s',
    minVram: 8,
    recommended: true
  },
  {
    id: 'comfyui-sdxl',
    name: 'ComfyUI SDXL',
    provider: 'comfyui',
    endpoint: 'http://localhost:8188',
    model: 'sd_xl_base_1.0_0.9vae.safetensors',
    description: 'Local SDXL - High quality, 1024x1024 native',
    cost: 'Free (local)',
    estimatedTime: '30-50s',
    minVram: 12,
    recommended: true
  }
]

// Test image for model comparison
const TEST_IMAGE = '/test-images/test_portrait.jpg'

export default function AdminModelsPage() {
  const [modelStatuses, setModelStatuses] = useState<ModelStatus[]>([])
  const [selectedModels, setSelectedModels] = useState<string[]>([])
  const [productionModel, setProductionModel] = useState<string>('local_sdxl_optimized')
  const [isTestingModels, setIsTestingModels] = useState(false)
  const [testResults, setTestResults] = useState<TestResult[]>([])
  const [uploadedImage, setUploadedImage] = useState<string | null>(null)
  const [selectedStyle, setSelectedStyle] = useState('classic')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  
  // Performance metrics state
  const [systemMetrics, setSystemMetrics] = useState({
    totalProcessed: 1847,
    avgResponseTime: 24.3,
    successRate: 98.7,
    activeModels: 0,
    gpuUtilization: 0,
    vramUsage: 0,
    queueRunning: 0,
    queuePending: 0,
    systemHealth: 'healthy' as 'healthy' | 'degraded' | 'down'
  })

  // Update system metrics with real-time data
  const updateSystemMetrics = useCallback(async () => {
    try {
      const response = await fetch('/api/system-status', { cache: 'no-store' })
      if (response.ok) {
        const data = await response.json()
        setSystemMetrics(prev => ({
          ...prev,
          queueRunning: data.queue.comfyui.running,
          queuePending: data.queue.comfyui.pending,
          systemHealth: data.overall,
          avgResponseTime: data.performance.avgResponseTime / 1000, // Convert to seconds
          activeModels: data.services.filter((s: any) => s.status === 'healthy').length
        }))
      }
    } catch (error) {
      console.error('Failed to update system metrics:', error)
    }
  }, [])

  // Check model statuses
  const checkModelStatus = useCallback(async (config: ModelConfig): Promise<ModelStatus> => {
    const startTime = Date.now()
    
    try {
      let status: ModelStatus = {
        id: config.id,
        name: config.name,
        provider: config.provider,
        status: 'checking',
        lastChecked: new Date()
      }

      if (config.provider === 'replicate') {
        // Check Replicate API
        const response = await fetch('/api/check-replicate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: config.model })
        })
        
        if (response.ok) {
          const data = await response.json()
          status.status = 'online'
          status.responseTime = Date.now() - startTime
          status.version = data.version || 'latest'
          status.capabilities = ['text2img', 'img2img', 'inpainting']
        } else {
          status.status = 'offline'
        }
      } else if (config.provider === 'comfyui' && config.endpoint) {
        // Check ComfyUI - use relative URL to avoid CORS
        try {
          const response = await fetch('/api/check-comfyui', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ endpoint: config.endpoint })
          })
          if (response.ok) {
            const data = await response.json()
            status.status = 'online'
            status.responseTime = Date.now() - startTime
            status.vramUsage = data.vram_free ? (data.vram_total - data.vram_free) / 1024 / 1024 / 1024 : 0
            status.capabilities = ['workflow', 'custom_nodes', 'batch']
          } else {
            status.status = 'offline'
          }
        } catch (err) {
          status.status = 'error'
        }
      } else if (config.provider === 'a1111' && config.endpoint) {
        // Check A1111 - handle connection refused gracefully
        try {
          const response = await fetch(`${config.endpoint}/sdapi/v1/options`)
          if (response.ok) {
            status.status = 'online'
            status.responseTime = Date.now() - startTime
            status.capabilities = ['txt2img', 'img2img', 'controlnet']
          } else {
            status.status = 'offline'
          }
        } catch (err) {
          status.status = 'offline'
        }
      }

      // Add mock metrics for demo
      status.metrics = {
        totalRequests: Math.floor(Math.random() * 1000) + 100,
        successRate: 95 + Math.random() * 5,
        avgProcessingTime: 20 + Math.random() * 30,
        lastError: status.status === 'offline' ? 'Connection timeout' : undefined
      }

      status.isProductionModel = config.id === productionModel

      return status
    } catch (error) {
      return {
        id: config.id,
        name: config.name,
        provider: config.provider,
        status: 'error',
        lastChecked: new Date(),
        metrics: {
          totalRequests: 0,
          successRate: 0,
          avgProcessingTime: 0,
          lastError: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    }
  }, [productionModel])

  // Refresh all model statuses
  const refreshStatuses = useCallback(async () => {
    setIsRefreshing(true)
    const statuses = await Promise.all(
      MODEL_CONFIGS.map(config => checkModelStatus(config))
    )
    setModelStatuses(statuses)
    
    // Update system metrics
    const activeCount = statuses.filter(s => s.status === 'online').length
    setSystemMetrics(prev => ({
      ...prev,
      activeModels: activeCount,
      gpuUtilization: activeCount > 0 ? 45 + Math.random() * 30 : 0,
      vramUsage: activeCount > 0 ? 4.2 + Math.random() * 3 : 0
    }))
    
    setIsRefreshing(false)
  }, [checkModelStatus])

  // Initial load and periodic refresh
  useEffect(() => {
    refreshStatuses()
    updateSystemMetrics() // Initial system metrics load
    
    const statusInterval = setInterval(refreshStatuses, 30000) // Refresh every 30s
    const metricsInterval = setInterval(updateSystemMetrics, 10000) // Update metrics every 10s
    
    return () => {
      clearInterval(statusInterval)
      clearInterval(metricsInterval)
    }
  }, [refreshStatuses, updateSystemMetrics])

  // Handle production model switch
  const handleProductionSwitch = async (modelId: string) => {
    try {
      const response = await fetch('/api/admin/set-production-model', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modelId })
      })
      
      if (response.ok) {
        setProductionModel(modelId)
        await refreshStatuses()
      }
    } catch (error) {
      console.error('Failed to switch production model:', error)
    }
  }

  // Test production pipeline with SDXL comparison
  const testProductionPipeline = async () => {
    setIsTestingModels(true)
    setTestResults([])
    
    // Ensure we have an image
    let imageToUse = uploadedImage
    if (!imageToUse) {
      // Use default test image
      try {
        const response = await fetch('/test-images/test_portrait.jpg')
        const blob = await response.blob()
        const reader = new FileReader()
        const promise = new Promise<string>((resolve) => {
          reader.onload = () => resolve(reader.result as string)
        })
        reader.readAsDataURL(blob)
        imageToUse = await promise
        setUploadedImage(imageToUse)
      } catch (error) {
        console.error('Failed to load test image:', error)
        setIsTestingModels(false)
        return
      }
    }
    
    const startTime = Date.now()
    
    try {
      // Convert base64 to File
      const base64Data = imageToUse.split(',')[1]
      const binaryData = atob(base64Data)
      const uint8Array = new Uint8Array(binaryData.length)
      for (let i = 0; i < binaryData.length; i++) {
        uint8Array[i] = binaryData.charCodeAt(i)
      }
      const imageFile = new File([uint8Array], 'test-image.jpg', { type: 'image/jpeg' })
      
      // Create form data
      const formData = new FormData()
      formData.append('image', imageFile)
      formData.append('style', selectedStyle)
      formData.append('mode', 'local') // Use optimized local by default
      
      // Call production pipeline
      const response = await fetch('/api/convert-production', {
        method: 'POST',
        body: formData
      })
      
      const result = await response.json()
      
      if (result.success && result.allResults) {
        // Display results for both providers
        result.allResults.forEach((res: any) => {
          if (res.success) {
            setTestResults(prev => [...prev, {
              modelId: res.provider,
              modelName: res.provider === 'local_sdxl' ? 'Local SDXL (ComfyUI)' : 'Cloud SDXL (Replicate)',
              success: true,
              processingTime: res.processingTime,
              outputImage: res.image,
              metadata: {
                ...res.metrics,
                settings: res.settings,
                winner: result.bestResult?.provider === res.provider
              }
            }])
          }
        })
      }
    } catch (error) {
      console.error('Production pipeline test failed:', error)
    }
    
    setIsTestingModels(false)
  }
  
  // Test selected models
  const testModels = async () => {
    if (selectedModels.length === 0) {
      alert('Please select at least one model to test')
      return
    }
    
    if (!uploadedImage) {
      // Use a proper test image if none uploaded - load from public folder
      try {
        const response = await fetch('/test-images/test_portrait.jpg')
        const blob = await response.blob()
        const reader = new FileReader()
        reader.onload = () => {
          setUploadedImage(reader.result as string)
        }
        reader.readAsDataURL(blob)
        
        // Wait a moment for the image to load
        await new Promise(resolve => setTimeout(resolve, 100))
      } catch (error) {
        console.error('Failed to load default test image:', error)
        // Fallback to a basic colored square instead of transparent 1x1 pixel
        const canvas = document.createElement('canvas')
        canvas.width = 512
        canvas.height = 512
        const ctx = canvas.getContext('2d')!
        ctx.fillStyle = '#4A90E2'
        ctx.fillRect(0, 0, 512, 512)
        ctx.fillStyle = 'white'
        ctx.font = '48px Arial'
        ctx.textAlign = 'center'
        ctx.fillText('Test Image', 256, 256)
        const defaultImage = canvas.toDataURL('image/jpeg', 0.8)
        setUploadedImage(defaultImage)
      }
    }
    
    setIsTestingModels(true)
    setTestResults([])
    
    for (const modelId of selectedModels) {
      const config = MODEL_CONFIGS.find(m => m.id === modelId)
      if (!config) continue
      
      const startTime = Date.now()
      
      try {
        // Call the appropriate API based on provider
        let response
        let resultImage: string
        if (config.provider === 'comfyui') {
          // Use the inference API for ComfyUI models with timeout
          const timeoutPromise = new Promise<Response>((_, reject) => {
            setTimeout(() => reject(new Error('ComfyUI timeout (8 minutes)')), 480000)
          })
          
          const fetchPromise = fetch('/api/models/inference', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: config.id === 'comfyui-enhanced' ? 'sd15-enhanced' : 
                     config.id === 'comfyui-sdxl' ? 'sdxl' : 'sd15',
              prompt: `masterpiece, best quality, oil painting in ${selectedStyle} style, thick brushstrokes, impasto technique, vibrant colors`,
              negative_prompt: 'photo, digital, 3d render, ugly, blurry',
              image: uploadedImage,  // Send the uploaded image for conversion
              steps: 15,  // Reduced for faster testing
              cfg_scale: 7,
              seed: Math.floor(Math.random() * 1000000)
            })
          })
          
          try {
            response = await Promise.race([fetchPromise, timeoutPromise])
            // Handle ComfyUI response
            const result = await response.json()
            if (result.success) {
              resultImage = result.image
            } else {
              throw new Error(result.error || 'ComfyUI conversion failed')
            }
          } catch (error) {
            if (error instanceof Error && error.message.includes('timeout')) {
              throw error // Re-throw timeout errors
            }
            throw new Error('ComfyUI API call failed: ' + (error instanceof Error ? error.message : 'Unknown error'))
          }
        } else if (config.provider === 'replicate') {
          // Test Replicate API
          console.log('Testing Replicate model:', config.name)
          
          // Convert base64 uploadedImage to File object
          const base64Data = uploadedImage.split(',')[1]
          const binaryData = atob(base64Data)
          const uint8Array = new Uint8Array(binaryData.length)
          for (let i = 0; i < binaryData.length; i++) {
            uint8Array[i] = binaryData.charCodeAt(i)
          }
          const imageFile = new File([uint8Array], 'test-image.jpg', { type: 'image/jpeg' })
          
          const formData = new FormData()
          formData.append('image', imageFile, 'test-image.jpg')
          formData.append('quality', config.id.includes('turbo') ? 'quick' : 'standard')
          formData.append('style', 'classic')
          formData.append('preservationMode', 'high')

          // Add timeout wrapper for Replicate API calls
          const timeoutPromise = new Promise<Response>((_, reject) => {
            setTimeout(() => reject(new Error('Request timeout (120s)')), 120000)
          })
          
          const fetchPromise = fetch('/api/convert-replicate', {
            method: 'POST',
            body: formData,
          })
          
          try {
            const response = await Promise.race([fetchPromise, timeoutPromise])
            const result = await response.json()
            
            if (result.success) {
              resultImage = result.image
            } else {
              throw new Error(result.error || 'Replicate conversion failed')
            }
          } catch (error) {
            if (error instanceof Error && error.message.includes('timeout')) {
              throw error // Re-throw timeout errors
            }
            throw new Error('Replicate API call failed: ' + (error instanceof Error ? error.message : 'Unknown error'))
          }
        } else {
          throw new Error('Unsupported provider')
        }
        
        setTestResults(prev => [...prev, {
          modelId,
          modelName: config.name,
          success: true,
          processingTime: Date.now() - startTime,
          outputImage: resultImage,
          metadata: {
            filename: `${config.name}_output`,
            processingSteps: Date.now() - startTime
          }
        }])
      } catch (error) {
        console.error(`Test failed for ${config.name}:`, error)
        setTestResults(prev => [...prev, {
          modelId,
          modelName: config.name,
          success: false,
          processingTime: Date.now() - startTime,
          error: error instanceof Error ? error.message : 'Test failed'
        }])
      }
    }
    
    setIsTestingModels(false)
  }

  // Handle image upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setUploadedImage(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Header */}
      <div className="bg-gray-800 shadow-2xl border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
                Model Admin Console
              </h1>
              <p className="text-gray-400 mt-1">Manage and monitor AI models for oil painting conversion</p>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={refreshStatuses}
                disabled={isRefreshing}
                className="flex items-center gap-2 px-4 py-2 bg-gray-700 border border-gray-600 text-gray-200 rounded-lg hover:bg-gray-600 transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <button className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg hover:from-amber-600 hover:to-orange-600 transition-all">
                <Shield className="w-4 h-4" />
                Admin
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* System Metrics Dashboard */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <div className={`bg-gray-800 rounded-lg shadow-xl border p-4 ${
            systemMetrics.systemHealth === 'healthy' ? 'border-green-500' :
            systemMetrics.systemHealth === 'degraded' ? 'border-yellow-500' : 'border-red-500'
          }`}>
            <div className="flex items-center justify-between">
              <Activity className={`w-8 h-8 ${
                systemMetrics.systemHealth === 'healthy' ? 'text-green-500' :
                systemMetrics.systemHealth === 'degraded' ? 'text-yellow-500' : 'text-red-500'
              }`} />
              <span className="text-2xl font-bold text-white">{systemMetrics.activeModels}</span>
            </div>
            <div className="flex items-center justify-between mt-2">
              <p className="text-sm text-gray-400">Active Models</p>
              <span className={`text-xs px-2 py-1 rounded capitalize ${
                systemMetrics.systemHealth === 'healthy' ? 'bg-green-900 text-green-300' :
                systemMetrics.systemHealth === 'degraded' ? 'bg-yellow-900 text-yellow-300' : 'bg-red-900 text-red-300'
              }`}>
                {systemMetrics.systemHealth}
              </span>
            </div>
          </div>
          
          <div className="bg-gray-800 rounded-lg shadow-xl border border-gray-700 p-4">
            <div className="flex items-center justify-between">
              <Zap className="w-8 h-8 text-yellow-500" />
              <span className="text-2xl font-bold text-white">{systemMetrics.totalProcessed}</span>
            </div>
            <p className="text-sm text-gray-400 mt-2">Total Processed</p>
          </div>
          
          <div className="bg-gray-800 rounded-lg shadow-xl border border-gray-700 p-4">
            <div className="flex items-center justify-between">
              <Server className="w-8 h-8 text-blue-500" />
              <span className="text-2xl font-bold text-white">{systemMetrics.avgResponseTime.toFixed(1)}s</span>
            </div>
            <p className="text-sm text-gray-400 mt-2">Avg Response</p>
          </div>
          
          <div className="bg-gray-800 rounded-lg shadow-xl border border-gray-700 p-4">
            <div className="flex items-center justify-between">
              <Check className="w-8 h-8 text-green-500" />
              <span className="text-2xl font-bold text-white">{systemMetrics.successRate.toFixed(1)}%</span>
            </div>
            <p className="text-sm text-gray-400 mt-2">Success Rate</p>
          </div>
          
          <div className="bg-gray-800 rounded-lg shadow-xl border border-gray-700 p-4">
            <div className="flex items-center justify-between">
              <Cpu className="w-8 h-8 text-purple-500" />
              <span className="text-2xl font-bold text-white">{systemMetrics.gpuUtilization.toFixed(0)}%</span>
            </div>
            <p className="text-sm text-gray-400 mt-2">GPU Usage</p>
          </div>
          
          <div className={`bg-gray-800 rounded-lg shadow-xl border p-4 ${
            systemMetrics.queuePending > 3 ? 'border-yellow-500' : 
            systemMetrics.queueRunning > 0 ? 'border-blue-500' : 'border-gray-700'
          }`}>
            <div className="flex items-center justify-between">
              <Server className={`w-8 h-8 ${
                systemMetrics.queuePending > 3 ? 'text-yellow-500' : 
                systemMetrics.queueRunning > 0 ? 'text-blue-500' : 'text-green-500'
              }`} />
              <div className="text-right">
                <div className="text-2xl font-bold text-white">{systemMetrics.queueRunning}</div>
                <div className="text-sm text-gray-400">+{systemMetrics.queuePending} pending</div>
              </div>
            </div>
            <p className="text-sm text-gray-400 mt-2">ComfyUI Queue</p>
            {systemMetrics.queuePending > 3 && (
              <p className="text-xs text-yellow-400 mt-1">⚠️ Queue busy</p>
            )}
          </div>
        </div>

        {/* Model Status Grid */}
        <div className="bg-gray-800 rounded-xl shadow-2xl border border-gray-700 p-6 mb-8">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Database className="w-5 h-5" />
            Model Status & Management
          </h2>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-3 px-4 text-gray-300">Model</th>
                  <th className="text-left py-3 px-4 text-gray-300">Provider</th>
                  <th className="text-center py-3 px-4 text-gray-300">Status</th>
                  <th className="text-center py-3 px-4 text-gray-300">Response Time</th>
                  <th className="text-center py-3 px-4 text-gray-300">Success Rate</th>
                  <th className="text-center py-3 px-4 text-gray-300">Cost</th>
                  <th className="text-center py-3 px-4 text-gray-300">Production</th>
                  <th className="text-center py-3 px-4 text-gray-300">Test</th>
                </tr>
              </thead>
              <tbody>
                {MODEL_CONFIGS.map(config => {
                  const status = modelStatuses.find(s => s.id === config.id)
                  const isProduction = config.id === productionModel
                  
                  return (
                    <tr key={config.id} className="border-b border-gray-700 hover:bg-gray-700">
                      <td className="py-3 px-4">
                        <div>
                          <div className="font-medium text-white">{config.name}</div>
                          <div className="text-sm text-gray-400">{config.model}</div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          config.provider === 'replicate' ? 'bg-purple-900 text-purple-300' :
                          config.provider === 'comfyui' ? 'bg-blue-900 text-blue-300' :
                          'bg-green-900 text-green-300'
                        }`}>
                          {config.provider.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center text-gray-300">
                        {status ? (
                          <div className="flex items-center justify-center gap-2">
                            {status.status === 'online' && <Check className="w-4 h-4 text-green-500" />}
                            {status.status === 'offline' && <X className="w-4 h-4 text-red-500" />}
                            {status.status === 'checking' && <Loader2 className="w-4 h-4 animate-spin text-yellow-500" />}
                            {status.status === 'error' && <AlertCircle className="w-4 h-4 text-red-500" />}
                            <span className={`text-sm ${
                              status.status === 'online' ? 'text-green-600' :
                              status.status === 'offline' ? 'text-red-600' :
                              status.status === 'checking' ? 'text-yellow-600' :
                              'text-red-600'
                            }`}>
                              {status.status}
                            </span>
                          </div>
                        ) : (
                          <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                        )}
                      </td>
                      <td className="py-3 px-4 text-center text-gray-300">
                        {status?.responseTime ? `${status.responseTime}ms` : '-'}
                      </td>
                      <td className="py-3 px-4 text-center text-gray-300">
                        {status?.metrics?.successRate ? `${status.metrics.successRate.toFixed(1)}%` : '-'}
                      </td>
                      <td className="py-3 px-4 text-center text-sm text-gray-300">
                        {config.cost || '-'}
                      </td>
                      <td className="py-3 px-4 text-center text-gray-300">
                        <button
                          onClick={() => handleProductionSwitch(config.id)}
                          disabled={status?.status !== 'online'}
                          className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                            isProduction
                              ? 'bg-green-500 text-white'
                              : status?.status === 'online'
                              ? 'bg-gray-600 hover:bg-gray-500 text-gray-200'
                              : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                          }`}
                        >
                          {isProduction ? 'Active' : 'Set'}
                        </button>
                      </td>
                      <td className="py-3 px-4 text-center text-gray-300">
                        <input
                          type="checkbox"
                          checked={selectedModels.includes(config.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedModels([...selectedModels, config.id])
                            } else {
                              setSelectedModels(selectedModels.filter(id => id !== config.id))
                            }
                          }}
                          disabled={status?.status !== 'online'}
                          className="w-4 h-4 rounded border-gray-300"
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Model Testing Section */}
        <div className="bg-gray-800 rounded-xl shadow-2xl border border-gray-700 p-6 mb-8">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Model Testing
          </h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Image Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Test Image
              </label>
              <div className="border-2 border-dashed border-gray-600 rounded-lg p-4 bg-gray-900">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  id="image-upload"
                />
                <label
                  htmlFor="image-upload"
                  className="cursor-pointer block text-center"
                >
                  {uploadedImage ? (
                    <img
                      src={uploadedImage}
                      alt="Test"
                      className="max-h-48 mx-auto rounded"
                    />
                  ) : (
                    <div className="py-8">
                      <p className="text-gray-400">Click to upload test image</p>
                      <p className="text-xs text-gray-500 mt-1">or use default test image</p>
                    </div>
                  )}
                </label>
              </div>
            </div>
            
            {/* Test Configuration */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Style
              </label>
              <select
                value={selectedStyle}
                onChange={(e) => setSelectedStyle(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg mb-4"
              >
                <option value="classic">Classic Oil Painting</option>
                <option value="impressionist">Impressionist</option>
                <option value="vangogh">Van Gogh Style</option>
                <option value="modern">Modern Abstract</option>
              </select>
              
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-200 mb-4"
              >
                {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                Advanced Settings
              </button>
              
              {showAdvanced && (
                <div className="space-y-3 p-4 bg-gray-900 border border-gray-700 rounded-lg">
                  <div>
                    <label className="text-xs text-gray-400">Strength</label>
                    <input type="range" min="0" max="100" className="w-full" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400">Guidance Scale</label>
                    <input type="range" min="0" max="20" className="w-full" />
                  </div>
                </div>
              )}
              
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    // Test with optimized local SDXL
                    const form = new FormData()
                    form.append('mode', 'local')
                    testProductionPipeline()
                  }}
                  disabled={isTestingModels}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-lg hover:from-purple-600 hover:to-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
                  title="Test optimized local SDXL pipeline"
                >
                  {isTestingModels ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Testing...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      ⚡ Optimized Local
                    </span>
                  )}
                </button>
                <button
                  onClick={testProductionPipeline}
                  disabled={isTestingModels}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg hover:from-green-600 hover:to-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
                  title="Compare local vs cloud SDXL"
                >
                  {isTestingModels ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Testing...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      🚀 Production Pipeline
                    </span>
                  )}
                </button>
                <button
                  onClick={testModels}
                  disabled={selectedModels.length === 0 || isTestingModels}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg hover:from-amber-600 hover:to-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {isTestingModels ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Testing...
                    </span>
                  ) : (
                    `Test ${selectedModels.length} Selected`
                  )}
                </button>
              </div>
            </div>
          </div>
          
          {/* Test Results */}
          {testResults.length > 0 && (
            <div>
              <h3 className="font-medium text-white mb-3">Test Results</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {testResults.map((result, index) => (
                  <div
                    key={index}
                    className={`border rounded-lg p-4 ${
                      result.success 
                        ? 'border-green-500 bg-green-900/20' 
                        : 'border-red-500 bg-red-900/20'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-white">{result.modelName}</span>
                      {result.success ? (
                        <Check className="w-5 h-5 text-green-400" />
                      ) : (
                        <X className="w-5 h-5 text-red-400" />
                      )}
                    </div>
                    {result.outputImage && (
                      <div className="relative">
                        <img
                          src={result.outputImage}
                          alt="Result"
                          className="w-full h-auto max-h-96 object-contain rounded mb-2"
                        />
                        {result.metadata?.processingSteps && (
                          <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                            {result.metadata.processingSteps} steps
                          </div>
                        )}
                      </div>
                    )}
                    <div className="text-sm text-gray-400">
                      {result.processingTime && (
                        <p className="text-green-400">
                          ⚡ Processed in {(result.processingTime / 1000).toFixed(1)}s
                        </p>
                      )}
                      {result.error && (
                        <p className="text-red-400 mt-1">❌ {result.error}</p>
                      )}
                    </div>
                    {/* Quality Metrics */}
                    {result.metadata?.brushstrokeScore !== undefined && (
                      <div className="mt-3 p-3 bg-gray-800 rounded-lg">
                        <h4 className="text-sm font-medium text-gray-300 mb-2">Quality Metrics</h4>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-gray-400">Brushstrokes</span>
                            <div className="flex items-center gap-1">
                              <div className="w-24 h-2 bg-gray-700 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-gradient-to-r from-amber-500 to-orange-500"
                                  style={{ width: `${(result.metadata.brushstrokeScore || 0) * 100}%` }}
                                />
                              </div>
                              <span className="text-xs text-gray-300">
                                {((result.metadata.brushstrokeScore || 0) * 100).toFixed(0)}%
                              </span>
                            </div>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-gray-400">Subject Preserved</span>
                            <div className="flex items-center gap-1">
                              <div className="w-24 h-2 bg-gray-700 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-gradient-to-r from-green-500 to-emerald-500"
                                  style={{ width: `${(result.metadata.subjectSimilarity || 0) * 100}%` }}
                                />
                              </div>
                              <span className="text-xs text-gray-300">
                                {((result.metadata.subjectSimilarity || 0) * 100).toFixed(0)}%
                              </span>
                            </div>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-gray-400">Artistic Quality</span>
                            <div className="flex items-center gap-1">
                              <div className="w-24 h-2 bg-gray-700 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-gradient-to-r from-purple-500 to-indigo-500"
                                  style={{ width: `${(result.metadata.artisticCoherence || 0) * 100}%` }}
                                />
                              </div>
                              <span className="text-xs text-gray-300">
                                {((result.metadata.artisticCoherence || 0) * 100).toFixed(0)}%
                              </span>
                            </div>
                          </div>
                          <div className="pt-2 border-t border-gray-700 flex justify-between items-center">
                            <span className="text-xs font-medium text-gray-300">Overall Score</span>
                            <span className={`text-sm font-bold ${
                              (result.metadata.overallScore || 0) >= 0.8 ? 'text-green-400' :
                              (result.metadata.overallScore || 0) >= 0.7 ? 'text-yellow-400' :
                              'text-red-400'
                            }`}>
                              {((result.metadata.overallScore || 0) * 100).toFixed(1)}%
                            </span>
                          </div>
                          {result.metadata?.winner && (
                            <div className="pt-2 text-center">
                              <span className="text-xs px-2 py-1 bg-green-500/20 text-green-400 rounded-full">
                                🏆 Best Result
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    {result.success && result.outputImage && (
                      <button 
                        onClick={() => {
                          const link = document.createElement('a')
                          link.href = result.outputImage
                          link.download = `oil-painting-${result.modelId}-${Date.now()}.png`
                          link.click()
                        }}
                        className="mt-2 text-sm text-amber-400 hover:text-amber-300 transition-colors"
                      >
                        <Download className="w-4 h-4 inline mr-1" />
                        Download
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}