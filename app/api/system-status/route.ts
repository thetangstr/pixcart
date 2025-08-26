/**
 * System Status API - Comprehensive health check for all services
 */

import { NextRequest, NextResponse } from 'next/server'

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

async function checkService(name: string, url: string, timeout: number = 5000): Promise<ServiceStatus> {
  const startTime = Date.now()
  const service: ServiceStatus = {
    name,
    status: 'checking',
    lastChecked: new Date()
  }

  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(timeout),
      headers: { 'Cache-Control': 'no-cache' }
    })
    
    const responseTime = Date.now() - startTime
    service.responseTime = responseTime
    
    if (response.ok) {
      service.status = responseTime > 2000 ? 'degraded' : 'healthy'
      
      // Try to get additional details
      try {
        const data = await response.json()
        service.details = data
      } catch {
        // JSON parse failed, but service is responding
      }
    } else {
      service.status = 'down'
      service.error = `HTTP ${response.status}: ${response.statusText}`
    }
  } catch (error) {
    service.status = 'down'
    service.error = error instanceof Error ? error.message : 'Connection failed'
  }

  return service
}

async function checkComfyUIQueue(): Promise<{ running: number, pending: number, lastActivity?: Date }> {
  try {
    const response = await fetch('http://localhost:8188/queue', {
      signal: AbortSignal.timeout(3000)
    })
    
    if (response.ok) {
      const data = await response.json()
      return {
        running: data.queue_running?.length || 0,
        pending: data.queue_pending?.length || 0,
        lastActivity: data.queue_running?.length > 0 ? new Date() : undefined
      }
    }
  } catch (error) {
    console.error('Failed to check ComfyUI queue:', error)
  }
  
  return { running: 0, pending: 0 }
}

export async function GET(request: NextRequest) {
  const startTime = Date.now()
  
  // Check all services in parallel
  const [replicateStatus, comfyuiStatus, queueStatus] = await Promise.all([
    checkService('Replicate API', `${request.nextUrl.origin}/api/check-replicate`, 8000),
    checkService('ComfyUI', 'http://localhost:8188/system_stats', 5000),
    checkComfyUIQueue()
  ])
  
  const services: ServiceStatus[] = [replicateStatus, comfyuiStatus]
  
  // Add A1111 check if configured
  const a1111Url = process.env.A1111_BASE_URL || 'http://localhost:7860'
  const a1111Status = await checkService('Automatic1111', `${a1111Url}/sdapi/v1/memory`, 3000)
  services.push(a1111Status)
  
  // Calculate overall system health
  const healthyServices = services.filter(s => s.status === 'healthy').length
  const totalServices = services.length
  const degradedServices = services.filter(s => s.status === 'degraded').length
  
  let overall: 'healthy' | 'degraded' | 'down'
  if (healthyServices === totalServices) {
    overall = 'healthy'
  } else if (healthyServices > 0 || degradedServices > 0) {
    overall = 'degraded'
  } else {
    overall = 'down'
  }
  
  // Calculate performance metrics
  const validResponseTimes = services
    .filter(s => s.responseTime !== undefined)
    .map(s => s.responseTime!)
    
  const avgResponseTime = validResponseTimes.length > 0 
    ? validResponseTimes.reduce((a, b) => a + b, 0) / validResponseTimes.length 
    : 0
    
  const errorRate = services.filter(s => s.status === 'down').length / totalServices
  
  const systemStatus: SystemStatus = {
    overall,
    services,
    queue: {
      comfyui: queueStatus
    },
    performance: {
      avgResponseTime: Math.round(avgResponseTime),
      errorRate: Math.round(errorRate * 100)
    }
  }
  
  const totalTime = Date.now() - startTime
  console.log(`🔍 System status check completed in ${totalTime}ms`)
  console.log(`📊 Overall: ${overall}, Services: ${healthyServices}/${totalServices} healthy`)
  console.log(`🏃 ComfyUI Queue: ${queueStatus.running} running, ${queueStatus.pending} pending`)
  
  return NextResponse.json(systemStatus, {
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    }
  })
}