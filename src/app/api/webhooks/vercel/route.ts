import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

// Webhook handler for Vercel deployment events
// This enables real-time deployment monitoring without polling

interface VercelWebhookEvent {
  id: string;
  type: 'deployment.created' | 'deployment.succeeded' | 'deployment.failed' | 'deployment.canceled';
  createdAt: number;
  data: {
    deployment: {
      id: string;
      url: string;
      name: string;
      source: string;
      state: 'BUILDING' | 'ERROR' | 'INITIALIZING' | 'QUEUED' | 'READY' | 'CANCELED';
      type: 'LAMBDAS';
      createdAt: number;
      buildingAt?: number;
      readyAt?: number;
      creator: {
        uid: string;
        email: string;
        username: string;
      };
      target: 'production' | 'preview';
      projectId: string;
    };
  };
}

// Verify webhook signature for security
function verifyWebhookSignature(body: string, signature: string, secret: string): boolean {
  try {
    const expectedSignature = crypto
      .createHmac('sha1', secret)
      .update(body, 'utf8')
      .digest('hex');
    
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  } catch (error) {
    console.error('Webhook signature verification failed:', error);
    return false;
  }
}

// Trigger automated monitoring based on deployment events
async function triggerMonitoring(event: VercelWebhookEvent): Promise<void> {
  const { deployment } = event.data;
  
  console.log(`🔔 Webhook received: ${event.type} for deployment ${deployment.id}`);
  
  // Log deployment details
  const deploymentInfo = {
    id: deployment.id,
    url: deployment.url,
    state: deployment.state,
    target: deployment.target,
    creator: deployment.creator.username,
    timestamp: new Date(deployment.createdAt).toISOString()
  };
  
  console.log('📊 Deployment Info:', deploymentInfo);
  
  switch (event.type) {
    case 'deployment.created':
      console.log('🚀 New deployment started, beginning monitoring...');
      // Deployment started - we can log this but wait for completion
      break;
      
    case 'deployment.succeeded':
      console.log('✅ Deployment succeeded, triggering health checks...');
      
      // Only run comprehensive monitoring for production deployments
      if (deployment.target === 'production') {
        try {
          // Trigger comprehensive health checks
          await runHealthChecks(deployment.url);
          
          // Log success metrics
          await logDeploymentMetrics({
            deploymentId: deployment.id,
            status: 'success',
            url: deployment.url,
            buildTime: deployment.readyAt ? deployment.readyAt - deployment.createdAt : null,
            timestamp: deployment.readyAt || deployment.createdAt
          });
          
        } catch (error) {
          console.error('❌ Post-deployment health checks failed:', error);
        }
      }
      break;
      
    case 'deployment.failed':
      console.log('❌ Deployment failed, logging failure...');
      
      await logDeploymentMetrics({
        deploymentId: deployment.id,
        status: 'failed',
        url: deployment.url,
        buildTime: null,
        timestamp: deployment.createdAt,
        error: 'Deployment failed during build process'
      });
      break;
      
    case 'deployment.canceled':
      console.log('⚠️ Deployment canceled');
      
      await logDeploymentMetrics({
        deploymentId: deployment.id,
        status: 'canceled',
        url: deployment.url,
        buildTime: null,
        timestamp: deployment.createdAt
      });
      break;
  }
}

// Run health checks against the deployed URL
async function runHealthChecks(deploymentUrl: string): Promise<void> {
  const baseUrl = `https://${deploymentUrl}`;
  
  console.log(`🏥 Running health checks for: ${baseUrl}`);
  
  // Basic health check endpoints
  const endpoints = [
    { path: '/', name: 'Homepage' },
    { path: '/api/auth/callback', name: 'Auth API' },
    { path: '/api/generate', name: 'Generate API' }
  ];
  
  const results = [];
  
  for (const endpoint of endpoints) {
    try {
      const startTime = Date.now();
      const response = await fetch(`${baseUrl}${endpoint.path}`, {
        method: 'GET',
        timeout: 10000, // 10 second timeout
        headers: {
          'User-Agent': 'PixCart-Webhook-Health-Check/1.0'
        }
      });
      
      const responseTime = Date.now() - startTime;
      const status = response.status;
      
      results.push({
        endpoint: endpoint.name,
        path: endpoint.path,
        status,
        responseTime,
        success: status < 500 // Consider 4xx as success for auth-protected endpoints
      });
      
      console.log(`  ✓ ${endpoint.name}: ${status} (${responseTime}ms)`);
      
    } catch (error) {
      console.error(`  ❌ ${endpoint.name}: ${error}`);
      results.push({
        endpoint: endpoint.name,
        path: endpoint.path,
        status: 0,
        responseTime: 0,
        success: false,
        error: error.message
      });
    }
  }
  
  // Calculate overall health score
  const successfulChecks = results.filter(r => r.success).length;
  const healthScore = (successfulChecks / results.length) * 100;
  
  console.log(`📊 Health Score: ${healthScore}% (${successfulChecks}/${results.length} checks passed)`);
  
  // Log health check results
  await logHealthCheckResults({
    url: baseUrl,
    results,
    healthScore,
    timestamp: Date.now()
  });
}

// Log deployment metrics for monitoring
async function logDeploymentMetrics(metrics: {
  deploymentId: string;
  status: 'success' | 'failed' | 'canceled';
  url: string;
  buildTime: number | null;
  timestamp: number;
  error?: string;
}): Promise<void> {
  try {
    // In a real application, you would store this in a database
    // For now, we'll just log to console and optionally send to external service
    
    console.log('📈 Deployment Metrics:', metrics);
    
    // You could integrate with monitoring services here:
    // - DataDog
    // - New Relic  
    // - Custom analytics
    // - Database logging
    
    // Example: Send to external monitoring service
    if (process.env.MONITORING_WEBHOOK_URL) {
      await fetch(process.env.MONITORING_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'deployment_metric',
          data: metrics,
          source: 'pixcart-webhook'
        })
      });
    }
    
  } catch (error) {
    console.error('Failed to log deployment metrics:', error);
  }
}

// Log health check results
async function logHealthCheckResults(results: {
  url: string;
  results: any[];
  healthScore: number;
  timestamp: number;
}): Promise<void> {
  try {
    console.log('🏥 Health Check Results:', results);
    
    // Send to monitoring service if configured
    if (process.env.MONITORING_WEBHOOK_URL) {
      await fetch(process.env.MONITORING_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'health_check',
          data: results,
          source: 'pixcart-webhook'
        })
      });
    }
    
  } catch (error) {
    console.error('Failed to log health check results:', error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    
    // Verify webhook signature if secret is provided
    const webhookSecret = process.env.VERCEL_WEBHOOK_SECRET;
    if (webhookSecret) {
      const signature = request.headers.get('x-vercel-signature');
      
      if (!signature || !verifyWebhookSignature(body, signature, webhookSecret)) {
        console.error('❌ Invalid webhook signature');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    }
    
    // Parse the webhook event
    const event: VercelWebhookEvent = JSON.parse(body);
    
    // Validate required fields
    if (!event.type || !event.data?.deployment) {
      console.error('❌ Invalid webhook payload');
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }
    
    // Process the webhook event
    await triggerMonitoring(event);
    
    console.log(`✅ Webhook processed successfully: ${event.type}`);
    
    return NextResponse.json({ 
      success: true, 
      processed: event.type,
      deploymentId: event.data.deployment.id 
    });
    
  } catch (error) {
    console.error('❌ Webhook processing failed:', error);
    return NextResponse.json({ 
      error: 'Webhook processing failed',
      details: error.message 
    }, { status: 500 });
  }
}

// Handle GET requests for webhook verification
export async function GET() {
  return NextResponse.json({
    service: 'PixCart Vercel Webhook Handler',
    status: 'active',
    version: '1.0.0',
    endpoints: {
      webhook: '/api/webhooks/vercel'
    },
    timestamp: new Date().toISOString()
  });
}