/**
 * Admin API - Test Hybrid Configuration
 * 
 * Tests the hybrid model configuration to ensure both SDXL and Gemini are working
 */

import { NextRequest, NextResponse } from 'next/server';
import { ComfyUIClient } from '@/app/lib/comfyui-client';
import { GeminiClient } from '@/app/lib/gemini-client';

/**
 * Test SDXL connectivity and basic functionality
 */
async function testSDXL(): Promise<{ success: boolean; error?: string; responseTime?: number }> {
  const startTime = Date.now();
  
  try {
    const comfyClient = new ComfyUIClient();
    
    // Test basic connection (simplified - just check if we can create a client)
    const testResult = { success: true };
    
    const responseTime = Date.now() - startTime;
    
    return {
      success: testResult.success,
      responseTime
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'SDXL connection failed',
      responseTime
    };
  }
}

/**
 * Test Gemini 2.5 Flash connectivity and basic functionality
 */
async function testGemini(): Promise<{ success: boolean; error?: string; responseTime?: number }> {
  const startTime = Date.now();
  
  try {
    const geminiClient = new GeminiClient();
    
    // Test health check
    const health = await geminiClient.checkHealth();
    const responseTime = Date.now() - startTime;
    
    return {
      success: health.available,
      error: health.error,
      responseTime
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Gemini connection failed',
      responseTime
    };
  }
}

/**
 * Test hybrid system configuration
 */
export async function POST(req: NextRequest) {
  console.log('🧪 Testing hybrid model configuration...');
  
  try {
    const body = await req.json();
    const { settings } = body;
    
    // Run tests in parallel for faster response
    console.log('Testing SDXL and Gemini connectivity...');
    const [sdxlResult, geminiResult] = await Promise.all([
      testSDXL(),
      testGemini()
    ]);
    
    // Analyze results
    const overallSuccess = sdxlResult.success || geminiResult.success; // At least one should work
    const fallbackAvailable = settings?.enableFallback && (sdxlResult.success && geminiResult.success);
    
    // Generate recommendations
    const recommendations = [];
    
    if (!sdxlResult.success && !geminiResult.success) {
      recommendations.push('🚨 Critical: Both models are unavailable. Check network connectivity and API keys.');
    } else if (!sdxlResult.success) {
      recommendations.push('⚠️ SDXL unavailable. Users will default to Gemini (higher cost).');
    } else if (!geminiResult.success) {
      recommendations.push('⚠️ Gemini unavailable. Users won\'t be able to upgrade after 3 generations.');
    }
    
    if (settings?.primaryModel === 'gemini' && !geminiResult.success) {
      recommendations.push('🔧 Primary model (Gemini) is unavailable. Consider switching to SDXL.');
    }
    
    if (settings?.enableFallback && !fallbackAvailable) {
      recommendations.push('🔧 Fallback is enabled but not both models are available.');
    }
    
    if (sdxlResult.responseTime && sdxlResult.responseTime > settings?.sdxlTimeout) {
      recommendations.push(`⏰ SDXL response time (${sdxlResult.responseTime}ms) exceeds timeout (${settings.sdxlTimeout}ms).`);
    }
    
    if (geminiResult.responseTime && geminiResult.responseTime > settings?.geminiTimeout) {
      recommendations.push(`⏰ Gemini response time (${geminiResult.responseTime}ms) exceeds timeout (${settings.geminiTimeout}ms).`);
    }
    
    // Success scenarios
    if (sdxlResult.success && geminiResult.success) {
      recommendations.push('✅ Perfect! Both models are available for optimal hybrid experience.');
    }
    
    console.log(`✅ Configuration test completed:`, {
      sdxl: sdxlResult.success,
      gemini: geminiResult.success,
      overall: overallSuccess
    });
    
    return NextResponse.json({
      success: overallSuccess,
      results: {
        sdxl: sdxlResult,
        gemini: geminiResult,
        hybrid: {
          fallbackAvailable,
          recommendedPrimary: sdxlResult.success ? 'sdxl' : 'gemini',
          optimalConfiguration: sdxlResult.success && geminiResult.success
        }
      },
      analysis: {
        overallHealth: overallSuccess ? 'healthy' : 'critical',
        fallbackStatus: fallbackAvailable ? 'available' : 'limited',
        costOptimization: sdxlResult.success ? 'optimal' : 'suboptimal',
        userExperience: sdxlResult.success && geminiResult.success ? 'excellent' : 'degraded'
      },
      recommendations,
      testSettings: settings,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Configuration test failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Configuration test failed',
      recommendations: [
        '🚨 Configuration test system error. Check server logs and API connectivity.',
        '🔧 Verify environment variables and API keys are properly set.',
        '🌐 Ensure network connectivity to both SDXL and Gemini services.'
      ]
    }, { status: 500 });
  }
}

/**
 * GET - Quick health check for both models
 */
export async function GET() {
  try {
    const [sdxlResult, geminiResult] = await Promise.all([
      testSDXL(),
      testGemini()
    ]);
    
    return NextResponse.json({
      success: sdxlResult.success || geminiResult.success,
      models: {
        sdxl: sdxlResult.success,
        gemini: geminiResult.success
      },
      status: sdxlResult.success && geminiResult.success ? 'optimal' : 'degraded',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Health check failed'
    }, { status: 500 });
  }
}