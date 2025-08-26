'use client'

import { useState, useEffect } from 'react'
import { Cpu, Zap, Settings, CheckCircle, XCircle } from 'lucide-react'

export type SDBackend = 'a1111' | 'comfyui'

interface BackendSelectorProps {
  selectedBackend: SDBackend
  onBackendChange: (backend: SDBackend) => void
  className?: string
}

interface BackendStatus {
  a1111: boolean
  comfyui: boolean
}

export default function BackendSelector({ 
  selectedBackend, 
  onBackendChange, 
  className = '' 
}: BackendSelectorProps) {
  const [status, setStatus] = useState<BackendStatus>({ a1111: false, comfyui: false })
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    checkBackendStatus()
  }, [])

  const checkBackendStatus = async () => {
    setChecking(true)
    try {
      const [a1111Response, comfyResponse] = await Promise.allSettled([
        fetch('/api/check-backend?type=a1111'),
        fetch('/api/check-backend?type=comfyui')
      ])

      setStatus({
        a1111: a1111Response.status === 'fulfilled' && a1111Response.value.ok,
        comfyui: comfyResponse.status === 'fulfilled' && comfyResponse.value.ok
      })
    } catch (error) {
      console.error('Failed to check backend status:', error)
    } finally {
      setChecking(false)
    }
  }

  const backends = [
    {
      id: 'a1111' as SDBackend,
      name: 'Automatic1111',
      description: 'Stable, well-tested SD interface',
      icon: Cpu,
      color: 'blue',
      features: ['ControlNet', 'Extensions', 'Proven stable']
    },
    {
      id: 'comfyui' as SDBackend,
      name: 'ComfyUI',
      description: 'Node-based, highly customizable',
      icon: Zap,
      color: 'purple',
      features: ['Node workflow', 'Fast inference', 'Advanced control']
    }
  ]

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          AI Backend Selection
        </h3>
        <button
          onClick={checkBackendStatus}
          disabled={checking}
          className="flex items-center gap-2 px-3 py-1 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
        >
          <Settings className={`h-4 w-4 ${checking ? 'animate-spin' : ''}`} />
          Check Status
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {backends.map((backend) => {
          const Icon = backend.icon
          const isSelected = selectedBackend === backend.id
          const isAvailable = status[backend.id]
          const StatusIcon = isAvailable ? CheckCircle : XCircle
          
          return (
            <div
              key={backend.id}
              className={`relative p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 ${
                isSelected
                  ? backend.color === 'blue' 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-purple-500 bg-purple-50'
                  : 'border-gray-200 hover:border-gray-300'
              } ${!isAvailable ? 'opacity-60' : ''}`}
              onClick={() => isAvailable && onBackendChange(backend.id)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Icon className={`h-6 w-6 ${
                    isSelected 
                      ? backend.color === 'blue' ? 'text-blue-600' : 'text-purple-600'
                      : 'text-gray-600'
                  }`} />
                  <h4 className="font-semibold text-gray-900">{backend.name}</h4>
                </div>
                <StatusIcon className={`h-5 w-5 ${
                  isAvailable ? 'text-green-500' : 'text-red-500'
                }`} />
              </div>
              
              <p className="text-sm text-gray-600 mb-3">{backend.description}</p>
              
              <div className="space-y-1">
                {backend.features.map((feature, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div className={`h-1.5 w-1.5 rounded-full ${
                      isSelected ? `bg-${backend.color}-500` : 'bg-gray-400'
                    }`} />
                    <span className="text-xs text-gray-600">{feature}</span>
                  </div>
                ))}
              </div>

              {!isAvailable && (
                <div className="absolute inset-0 bg-gray-100 bg-opacity-50 rounded-lg flex items-center justify-center">
                  <div className="bg-white px-3 py-1 rounded-full shadow-sm">
                    <span className="text-sm font-medium text-gray-700">Unavailable</span>
                  </div>
                </div>
              )}

              {isSelected && isAvailable && (
                <div className={`absolute top-2 right-2 w-3 h-3 bg-${backend.color}-500 rounded-full`} />
              )}
            </div>
          )
        })}
      </div>

      {!status.a1111 && !status.comfyui && !checking && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center gap-2 text-yellow-800">
            <XCircle className="h-5 w-5" />
            <span className="font-medium">No AI backends available</span>
          </div>
          <p className="text-sm text-yellow-700 mt-1">
            Please ensure either Automatic1111 (port 7860) or ComfyUI (port 8188) is running.
          </p>
        </div>
      )}
    </div>
  )
}