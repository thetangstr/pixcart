#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const API_BASE = 'http://localhost:3000';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

async function makeRequest(path, options = {}) {
  try {
    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    });
    
    const text = await response.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch (e) {
      data = text;
    }
    
    return {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      data,
      headers: response.headers,
      text
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      error: error.message
    };
  }
}

async function testSpecificIssues() {
  log('\\n🔍 TESTING SPECIFIC ISSUES', colors.cyan);
  log('=====================================\\n', colors.cyan);
  
  // Test 1: Check what's on the create page
  log('1. Testing Create Page Rendering...', colors.blue);
  const createResponse = await makeRequest('/create');
  if (createResponse.status === 200) {
    const hasUploadSection = createResponse.text.includes('Upload');
    const hasStyleSection = createResponse.text.includes('style');
    const hasGenerateButton = createResponse.text.includes('Generate');
    
    log(`  ✅ Page loads successfully`, colors.green);
    log(`  ${hasUploadSection ? '✅' : '❌'} Has upload section`, hasUploadSection ? colors.green : colors.red);
    log(`  ${hasStyleSection ? '✅' : '❌'} Has style selection`, hasStyleSection ? colors.green : colors.red);
    log(`  ${hasGenerateButton ? '✅' : '❌'} Has generate button`, hasGenerateButton ? colors.green : colors.red);
  } else {
    log(`  ❌ Failed to load (status: ${createResponse.status})`, colors.red);
  }
  
  // Test 2: Test actual image generation flow
  log('\\n2. Testing Complete Image Generation Flow...', colors.blue);
  
  // Create a more realistic test image (10x10 red square)
  const testImageBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFUlEQVR42mP8z8BQz0AEYBxVSF+FABJADveWkH6oAAAAAElFTkSuQmCC';
  
  // Clear IP usage for clean test
  await prisma.ipUsage.deleteMany({});
  
  const genResponse = await makeRequest('/api/generate', {
    method: 'POST',
    body: JSON.stringify({
      imageData: testImageBase64,
      style: 'renaissance'
    })
  });
  
  if (genResponse.status === 200 && genResponse.data?.success) {
    log(`  ✅ Image generation successful`, colors.green);
    log(`  ✅ Description length: ${genResponse.data.preview?.description?.length || 0} characters`, colors.green);
    log(`  ✅ CSS filter applied: ${genResponse.data.preview?.cssFilter || 'none'}`, colors.green);
  } else {
    log(`  ❌ Generation failed (status: ${genResponse.status})`, colors.red);
    if (genResponse.data?.error) {
      log(`     Error: ${genResponse.data.error}`, colors.red);
    }
  }
  
  // Test 3: Check authentication endpoints
  log('\\n3. Testing Authentication Endpoints...', colors.blue);
  
  const authEndpoints = [
    '/login',
    '/api/auth/callback',
    '/api/auth/signout'
  ];
  
  for (const endpoint of authEndpoints) {
    const response = await makeRequest(endpoint);
    const exists = response.status !== 404;
    log(`  ${exists ? '✅' : '❌'} ${endpoint} ${exists ? 'exists' : 'missing'} (status: ${response.status})`, 
        exists ? colors.green : colors.yellow);
  }
  
  // Test 4: Check admin pages
  log('\\n4. Testing Admin Access Control...', colors.blue);
  
  const adminResponse = await makeRequest('/admin');
  if (adminResponse.status === 200) {
    // Check if it's showing the page content or redirecting
    const hasAdminContent = adminResponse.text.includes('Admin') || adminResponse.text.includes('Dashboard');
    if (hasAdminContent) {
      log(`  ⚠️  Admin page is publicly accessible (should require auth)`, colors.yellow);
    } else {
      log(`  ✅ Admin page exists but content not shown`, colors.green);
    }
  } else if (adminResponse.status === 401 || adminResponse.status === 302) {
    log(`  ✅ Admin page properly protected (status: ${adminResponse.status})`, colors.green);
  } else {
    log(`  ❌ Unexpected admin page status: ${adminResponse.status}`, colors.red);
  }
  
  // Test 5: Check payload size limits
  log('\\n5. Testing Payload Size Limits...', colors.blue);
  
  // Test with different sizes
  const sizes = [
    { name: '100KB', size: 100 * 1024 },
    { name: '1MB', size: 1024 * 1024 },
    { name: '5MB', size: 5 * 1024 * 1024 }
  ];
  
  for (const { name, size } of sizes) {
    const largeImage = 'data:image/png;base64,' + 'A'.repeat(size);
    const response = await makeRequest('/api/generate', {
      method: 'POST',
      body: JSON.stringify({
        imageData: largeImage,
        style: 'renaissance'
      })
    });
    
    const rejected = response.status === 413 || response.status === 400 || response.status === 500;
    log(`  ${rejected ? '✅' : '⚠️'} ${name} payload ${rejected ? 'rejected' : 'accepted'} (status: ${response.status})`,
        rejected ? colors.green : colors.yellow);
  }
  
  // Test 6: Check Gemini API integration
  log('\\n6. Testing Gemini API Integration...', colors.blue);
  
  // Clear rate limit
  await prisma.ipUsage.deleteMany({});
  
  const geminiTest = await makeRequest('/api/generate', {
    method: 'POST',
    body: JSON.stringify({
      imageData: testImageBase64,
      style: 'monet'
    })
  });
  
  if (geminiTest.data?.preview?.description) {
    const desc = geminiTest.data.preview.description;
    const hasArtisticTerms = desc.includes('paint') || desc.includes('color') || desc.includes('brush') || desc.includes('artist');
    const hasStyleReference = desc.includes('Monet') || desc.includes('impressionist');
    
    log(`  ✅ Gemini returns description (${desc.length} chars)`, colors.green);
    log(`  ${hasArtisticTerms ? '✅' : '❌'} Description contains artistic terms`, 
        hasArtisticTerms ? colors.green : colors.red);
    log(`  ${hasStyleReference ? '✅' : '⚠️'} Description references the style`, 
        hasStyleReference ? colors.green : colors.yellow);
  } else {
    log(`  ❌ No description returned from Gemini`, colors.red);
  }
  
  // Test 7: Check landing pages routing
  log('\\n7. Testing Landing Page Routes...', colors.blue);
  
  const landingPaths = [
    '/simple',
    '/detailed',
    '/(landing)/simple',
    '/(landing)/detailed'
  ];
  
  for (const path of landingPaths) {
    const response = await makeRequest(path, { redirect: 'manual' });
    const accessible = response.status === 200 || response.status === 307;
    log(`  ${accessible ? '✅' : '❌'} ${path} ${accessible ? 'accessible' : 'not found'} (status: ${response.status})`,
        accessible ? colors.green : colors.red);
  }
  
  // Summary
  log('\\n=====================================', colors.cyan);
  log('📊 ISSUE ANALYSIS COMPLETE', colors.cyan);
  log('=====================================\\n', colors.cyan);
  
  await prisma.$disconnect();
}

// Run the tests
testSpecificIssues().catch(error => {
  log(`\\n❌ Test error: ${error.message}`, colors.red);
  console.error(error);
  process.exit(1);
});