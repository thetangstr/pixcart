'use client'

import { useState, useEffect } from 'react'
import { AlertCircle, CheckCircle, Clock, XCircle, Activity, Server, Zap, RefreshCw } from 'lucide-react'

interface ServiceStatus {
  name: string
  status: 'healthy' | 'degraded' | 'down' | 'checking'
  responseTime?: number
  lastChecked: Date
  error?: string
  details?: Record<string, any>
}

interface SystemStatus {
  overall: 'healthy' | 'degraded' | 'down'
  services: ServiceStatus[]
  queue: {
    comfyui: {
      running: number
      pending: number
      lastActivity?: Date
    }
  }
  performance: {
    avgResponseTime: number
    errorRate: number
  }
}

export default function SystemStatusDashboard() {
  const [status, setStatus] = useState<SystemStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/system-status', {
        cache: 'no-store'
      })
      const data = await response.json()
      setStatus(data)
      setLastUpdate(new Date())
    } catch (error) {
      console.error('Failed to fetch system status:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStatus()
    const interval = setInterval(fetchStatus, 10000) // Update every 10 seconds
    return () => clearInterval(interval)
  }, [])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'degraded':
        return <AlertCircle className="w-4 h-4 text-yellow-500" />
      case 'down':
        return <XCircle className="w-4 h-4 text-red-500" />
      case 'checking':
        return <Clock className="w-4 h-4 text-gray-500 animate-pulse" />
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-100 border-green-200'
      case 'degraded':
        return 'bg-yellow-100 border-yellow-200'
      case 'down':
        return 'bg-red-100 border-red-200'
      default:
        return 'bg-gray-100 border-gray-200'
    }
  }

  const formatResponseTime = (time?: number) => {
    if (!time) return 'N/A'
    if (time < 1000) return `${time}ms`
    return `${(time / 1000).toFixed(1)}s`
  }

  if (loading) {
    return (
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="w-5 h-5 text-blue-500" />
          <h3 className="font-semibold">System Status</h3>
          <RefreshCw className="w-4 h-4 animate-spin text-gray-500" />
        </div>
        <p className="text-gray-500">Loading system status...</p>
      </div>
    )
  }

  if (!status) {
    return (
      <div className="bg-white p-4 rounded-lg shadow-sm border border-red-200">
        <div className="flex items-center gap-2 mb-2">
          <XCircle className="w-5 h-5 text-red-500" />
          <h3 className="font-semibold text-red-700">System Status Unavailable</h3>
        </div>
        <p className="text-red-600">Failed to load system status</p>
        <button 
          onClick={fetchStatus}
          className="mt-2 px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
        >
          Retry
        </button>
      </div>
    )
  }

  const queueStatus = status.queue.comfyui
  const isQueueBusy = queueStatus.running > 0 || queueStatus.pending > 2

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-blue-500" />
          <h3 className="font-semibold">System Status</h3>
          {getStatusIcon(status.overall)}
          <span className="text-sm font-medium capitalize">{status.overall}</span>
        </div>
        <div className="flex items-center gap-4 text-sm text-gray-500">
          <span>Avg Response: {formatResponseTime(status.performance.avgResponseTime)}</span>
          <span>Error Rate: {status.performance.errorRate}%</span>
          <button 
            onClick={fetchStatus}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
            title="Refresh status"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Queue Status */}
      <div className={`p-3 rounded-lg border mb-4 ${isQueueBusy ? 'bg-yellow-50 border-yellow-200' : 'bg-green-50 border-green-200'}`}>
        <div className="flex items-center gap-2 mb-2">
          <Server className="w-4 h-4" />
          <span className="font-medium">ComfyUI Queue</span>
          {isQueueBusy && <AlertCircle className="w-4 h-4 text-yellow-500" />}
        </div>
        <div className="flex gap-4 text-sm">
          <span>Running: <strong className={queueStatus.running > 0 ? 'text-blue-600' : 'text-gray-600'}>{queueStatus.running}</strong></span>
          <span>Pending: <strong className={queueStatus.pending > 2 ? 'text-yellow-600' : 'text-gray-600'}>{queueStatus.pending}</strong></span>
          {queueStatus.lastActivity && (
            <span className="text-gray-500">
              Last Activity: {new Date(queueStatus.lastActivity).toLocaleTimeString()}
            </span>
          )}
        </div>
        {isQueueBusy && (
          <p className="text-yellow-700 text-sm mt-1">
            ⚠️ Queue is busy - expect longer processing times ({queueStatus.pending} jobs waiting)
          </p>
        )}
      </div>

      {/* Service Status Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {status.services.map((service) => (
          <div key={service.name} className={`p-3 rounded-lg border ${getStatusColor(service.status)}`}>
            <div className="flex items-center gap-2 mb-1">
              {getStatusIcon(service.status)}
              <span className="font-medium text-sm">{service.name}</span>
            </div>
            
            <div className="text-xs text-gray-600 space-y-1">
              {service.responseTime && (
                <div className="flex justify-between">
                  <span>Response:</span>
                  <span className={service.responseTime > 2000 ? 'text-yellow-600 font-medium' : ''}>
                    {formatResponseTime(service.responseTime)}
                  </span>
                </div>
              )}
              
              {service.error && (
                <div className="text-red-600 text-xs mt-1 p-2 bg-red-50 rounded">
                  {service.error}
                </div>
              )}
              
              {service.status === 'healthy' && service.name === 'ComfyUI' && (
                <div className="text-green-600 text-xs">✓ Ready for processing</div>
              )}
              
              {service.status === 'healthy' && service.name === 'Replicate API' && (
                <div className="text-green-600 text-xs">✓ Cloud processing available</div>
              )}
              
              {service.status === 'degraded' && (
                <div className="text-yellow-600 text-xs">⚠️ Slow response times</div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Overall Status Message */}
      {status.overall === 'degraded' && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-yellow-600" />
            <span className="text-yellow-800 font-medium">System Performance Degraded</span>
          </div>
          <p className="text-yellow-700 text-sm mt-1">
            Some services are running slowly. Processing times may be longer than usual.
          </p>
        </div>
      )}

      {status.overall === 'down' && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2">
            <XCircle className="w-4 h-4 text-red-600" />
            <span className="text-red-800 font-medium">System Issues Detected</span>
          </div>
          <p className="text-red-700 text-sm mt-1">
            Critical services are down. Image processing may not be available.
          </p>
        </div>
      )}

      <div className="mt-3 text-xs text-gray-500 text-center">
        Last updated: {lastUpdate?.toLocaleTimeString() || 'Never'} • Auto-refresh every 10s
      </div>
    </div>
  )
}