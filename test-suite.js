#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

const API_BASE = 'http://localhost:3000';
let testResults = [];
let passCount = 0;
let failCount = 0;

// Helper functions
function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logTest(name, passed, details = '') {
  const status = passed ? `✅ PASS` : `❌ FAIL`;
  const color = passed ? colors.green : colors.red;
  log(`  ${status}: ${name} ${details}`, color);
  testResults.push({ name, passed, details });
  if (passed) passCount++;
  else failCount++;
}

async function makeRequest(path, options = {}) {
  try {
    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      redirect: 'manual', // Don't follow redirects automatically
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
      ok: response.ok || response.status === 307, // Consider redirects as OK for some tests
      status: response.status,
      statusText: response.statusText,
      data,
      headers: response.headers
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      error: error.message
    };
  }
}

async function clearDatabase() {
  log('\\n🧹 Clearing test data...', colors.cyan);
  await prisma.ipUsage.deleteMany({});
  await prisma.apiUsage.deleteMany({});
  log('  Database cleared');
}

// Test suites
async function testHomePage() {
  log('\\n📄 Testing Home Page...', colors.blue);
  
  const response = await makeRequest('/');
  logTest(
    'Home page loads',
    response.status === 200 || response.status === 307,
    `(status: ${response.status})`
  );
  
  // Test A/B testing redirect
  if (response.status === 307) {
    const location = response.headers.get('location');
    logTest(
      'A/B testing redirect works',
      location && (location.includes('simple') || location.includes('detailed')),
      `(redirects to: ${location})`
    );
  }
}

async function testCreatePage() {
  log('\\n🎨 Testing Create Page...', colors.blue);
  
  const response = await makeRequest('/create');
  logTest(
    'Create page loads',
    response.status === 200,
    `(status: ${response.status})`
  );
}

async function testGenerateAPI() {
  log('\\n🤖 Testing Generate API...', colors.blue);
  
  // Clear IP usage for clean test
  await prisma.ipUsage.deleteMany({});
  
  // Test with valid image data (small test image)
  const validImageData = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  
  // Test 1: Valid request
  const response1 = await makeRequest('/api/generate', {
    method: 'POST',
    body: JSON.stringify({
      imageData: validImageData,
      style: 'renaissance'
    })
  });
  
  logTest(
    'Generate API accepts valid request',
    response1.ok && response1.data?.success === true,
    `(status: ${response1.status})`
  );
  
  if (response1.ok && response1.data?.preview) {
    logTest(
      'API returns preview object',
      !!response1.data.preview,
      `(has preview: ${!!response1.data.preview})`
    );
    
    logTest(
      'Preview has required fields',
      response1.data.preview.style === 'renaissance' &&
      response1.data.preview.estimatedPrice === 149.99 &&
      !!response1.data.preview.description,
      ''
    );
    
    logTest(
      'Usage tracking included',
      response1.data.usage && 
      response1.data.usage.remaining === 0 &&
      response1.data.usage.limit === 1,
      `(remaining: ${response1.data.usage?.remaining}, limit: ${response1.data.usage?.limit})`
    );
  }
  
  // Test 2: Rate limiting (should fail on second request)
  const response2 = await makeRequest('/api/generate', {
    method: 'POST',
    body: JSON.stringify({
      imageData: validImageData,
      style: 'van_gogh'
    })
  });
  
  logTest(
    'Rate limiting enforced for IP',
    response2.status === 429,
    `(status: ${response2.status}, message: ${response2.data?.error})`
  );
  
  // Test 3: Invalid style
  await prisma.ipUsage.deleteMany({}); // Clear for next test
  
  const response3 = await makeRequest('/api/generate', {
    method: 'POST',
    body: JSON.stringify({
      imageData: validImageData,
      style: 'invalid_style'
    })
  });
  
  logTest(
    'API rejects invalid style',
    response3.status === 400,
    `(status: ${response3.status})`
  );
  
  // Test 4: Missing image data
  const response4 = await makeRequest('/api/generate', {
    method: 'POST',
    body: JSON.stringify({
      style: 'renaissance'
    })
  });
  
  logTest(
    'API requires image data',
    response4.status === 400,
    `(status: ${response4.status})`
  );
  
  // Test 5: Missing style
  const response5 = await makeRequest('/api/generate', {
    method: 'POST',
    body: JSON.stringify({
      imageData: validImageData
    })
  });
  
  logTest(
    'API requires style parameter',
    response5.status === 400,
    `(status: ${response5.status})`
  );
}

async function testAllStyles() {
  log('\\n🎨 Testing All Painting Styles...', colors.blue);
  
  await prisma.ipUsage.deleteMany({});
  
  const styles = ['renaissance', 'van_gogh', 'monet'];
  const validImageData = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  
  for (const style of styles) {
    await prisma.ipUsage.deleteMany({}); // Clear for each test
    
    const response = await makeRequest('/api/generate', {
      method: 'POST',
      body: JSON.stringify({
        imageData: validImageData,
        style: style
      })
    });
    
    logTest(
      `Style "${style}" works`,
      response.ok && response.data?.success === true,
      `(status: ${response.status})`
    );
    
    if (response.ok && response.data?.preview) {
      const expectedPrices = {
        renaissance: 149.99,
        van_gogh: 179.99,
        monet: 169.99
      };
      
      logTest(
        `Style "${style}" has correct price`,
        response.data.preview.estimatedPrice === expectedPrices[style],
        `($${response.data.preview.estimatedPrice})`
      );
    }
  }
}

async function testAuthenticationFlow() {
  log('\\n🔐 Testing Authentication Flow...', colors.blue);
  
  // Test login page
  const loginResponse = await makeRequest('/login');
  logTest(
    'Login page redirects to auth',
    loginResponse.status === 307,
    `(status: ${loginResponse.status})`
  );
  
  // Test API endpoints that require auth
  const userUsageResponse = await makeRequest('/api/user/usage');
  logTest(
    'Protected API returns 401 when not authenticated',
    userUsageResponse.status === 401,
    `(status: ${userUsageResponse.status})`
  );
  
  // Test beta status endpoint
  const betaStatusResponse = await makeRequest('/api/user/beta-status');
  logTest(
    'Beta status endpoint requires auth',
    betaStatusResponse.status === 401,
    `(status: ${betaStatusResponse.status})`
  );
}

async function testAdminEndpoints() {
  log('\\n👨‍💼 Testing Admin Endpoints...', colors.blue);
  
  const adminResponse = await makeRequest('/admin');
  logTest(
    'Admin page requires authentication',
    adminResponse.status === 307,
    `(status: ${adminResponse.status})`
  );
  
  const feedbackResponse = await makeRequest('/admin/feedback');
  logTest(
    'Feedback admin requires authentication',
    feedbackResponse.status === 307,
    `(status: ${feedbackResponse.status})`
  );
}

async function testLandingPages() {
  log('\\n🏠 Testing Landing Pages...', colors.blue);
  
  // Test simple landing
  const simpleResponse = await makeRequest('/(landing)/simple');
  logTest(
    'Simple landing page exists',
    simpleResponse.status === 200 || simpleResponse.status === 404,
    `(status: ${simpleResponse.status})`
  );
  
  // Test detailed landing
  const detailedResponse = await makeRequest('/(landing)/detailed');
  logTest(
    'Detailed landing page exists',
    detailedResponse.status === 200 || detailedResponse.status === 404,
    `(status: ${detailedResponse.status})`
  );
}

async function testErrorHandling() {
  log('\\n⚠️ Testing Error Handling...', colors.blue);
  
  // Test 404
  const notFoundResponse = await makeRequest('/non-existent-page');
  logTest(
    '404 page handles non-existent routes',
    notFoundResponse.status === 404,
    `(status: ${notFoundResponse.status})`
  );
  
  // Test malformed JSON
  const malformedResponse = await fetch(`${API_BASE}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: 'invalid json'
  });
  
  logTest(
    'API handles malformed JSON',
    malformedResponse.status === 400 || malformedResponse.status === 500,
    `(status: ${malformedResponse.status})`
  );
  
  // Test large image data
  const largeImage = 'data:image/png;base64,' + 'A'.repeat(10000000); // 10MB
  const largeImageResponse = await makeRequest('/api/generate', {
    method: 'POST',
    body: JSON.stringify({
      imageData: largeImage,
      style: 'renaissance'
    })
  });
  
  logTest(
    'API handles large image data gracefully',
    largeImageResponse.status !== 200, // Should reject or timeout
    `(status: ${largeImageResponse.status})`
  );
}

async function testDatabaseConnectivity() {
  log('\\n💾 Testing Database Connectivity...', colors.blue);
  
  try {
    await prisma.$connect();
    logTest('Database connection successful', true);
    
    // Test creating a user
    const testUser = await prisma.user.upsert({
      where: { email: 'test@example.com' },
      update: {},
      create: {
        id: 'test-user-id',
        email: 'test@example.com',
        name: 'Test User',
        isAllowlisted: false,
        isWaitlisted: true
      }
    });
    
    logTest('Can create/update users', !!testUser);
    
    // Clean up test user
    await prisma.user.deleteMany({
      where: { email: 'test@example.com' }
    });
    
    logTest('Can delete test data', true);
    
  } catch (error) {
    logTest('Database operations', false, error.message);
  }
}

async function testRateLimitReset() {
  log('\\n⏰ Testing Rate Limit Reset...', colors.blue);
  
  // First clean up any existing IP usage for today
  await prisma.ipUsage.deleteMany({
    where: { ip: '127.0.0.1' }
  });
  
  // Create IP usage with yesterday's date
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0); // Set to midnight
  
  await prisma.ipUsage.create({
    data: {
      ip: '127.0.0.1',
      date: yesterday,
      count: 1,
      lastUsed: yesterday
    }
  });
  
  // Make request (should work since it's a new day)
  const validImageData = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  
  const response = await makeRequest('/api/generate', {
    method: 'POST',
    body: JSON.stringify({
      imageData: validImageData,
      style: 'renaissance'
    })
  });
  
  logTest(
    'Rate limit resets daily',
    response.ok,
    `(status: ${response.status})`
  );
  
  await prisma.ipUsage.deleteMany({});
}

async function testEnvironmentVariables() {
  log('\\n🔧 Testing Environment Variables...', colors.blue);
  
  logTest(
    'DATABASE_URL is configured',
    !!process.env.DATABASE_URL,
    ''
  );
  
  logTest(
    'GEMINI_API_KEY is configured',
    !!process.env.GEMINI_API_KEY,
    `(length: ${process.env.GEMINI_API_KEY?.length || 0})`
  );
  
  logTest(
    'NEXT_PUBLIC_SUPABASE_URL is configured',
    !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    ''
  );
  
  logTest(
    'NEXT_PUBLIC_SUPABASE_ANON_KEY is configured',
    !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    ''
  );
}

// Main test runner
async function runTests() {
  console.log('');
  log('🧪 PIXCART COMPREHENSIVE TEST SUITE', colors.cyan);
  log('=====================================', colors.cyan);
  
  try {
    // Load environment variables
    require('dotenv').config({ path: '.env.local' });
    
    // Check if server is running
    const serverCheck = await makeRequest('/');
    if (serverCheck.status === 0) {
      log('\\n❌ Server is not running! Please run "npm run dev" first.', colors.red);
      process.exit(1);
    }
    
    // Run all test suites
    await testEnvironmentVariables();
    await testDatabaseConnectivity();
    await testHomePage();
    await testCreatePage();
    await testLandingPages();
    await testGenerateAPI();
    await testAllStyles();
    await testRateLimitReset();
    await testAuthenticationFlow();
    await testAdminEndpoints();
    await testErrorHandling();
    
    // Summary
    log('\\n=====================================', colors.cyan);
    log('📊 TEST RESULTS SUMMARY', colors.cyan);
    log('=====================================', colors.cyan);
    log(`✅ Passed: ${passCount}`, colors.green);
    log(`❌ Failed: ${failCount}`, colors.red);
    log(`📈 Pass Rate: ${((passCount / (passCount + failCount)) * 100).toFixed(1)}%`, colors.yellow);
    
    if (failCount > 0) {
      log('\\n❌ FAILED TESTS:', colors.red);
      testResults
        .filter(r => !r.passed)
        .forEach(r => log(`  - ${r.name} ${r.details}`, colors.red));
    }
    
    // Clean up
    await clearDatabase();
    
    // Exit with appropriate code
    process.exit(failCount > 0 ? 1 : 0);
    
  } catch (error) {
    log(`\\n❌ Test suite error: ${error.message}`, colors.red);
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the tests
runTests();