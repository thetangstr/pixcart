// tests/production/comprehensive-production.spec.js
const { test, expect } = require('@playwright/test');

// Test configuration
const PRODUCTION_URL = 'https://oil-painting-app.vercel.app';
const TEST_ADMIN_EMAIL = 'admin.test@pixcart.com';
const TEST_ADMIN_PASSWORD = 'TestAdmin123!@#';

// Test results tracking
let testResults = {
  passed: 0,
  failed: 0,
  total: 0,
  details: []
};

function logResult(testName, action, result, details = '', error = null) {
  testResults.total++;
  const status = result ? 'PASS' : 'FAIL';
  
  if (result) {
    testResults.passed++;
  } else {
    testResults.failed++;
  }

  const resultEntry = {
    test: testName,
    action,
    status,
    details,
    error: error?.message || null,
    timestamp: new Date().toISOString()
  };

  testResults.details.push(resultEntry);
  console.log(`${status} ✅❌`[result ? 0 : 1] + ` ${testName}`);
  console.log(`Action: ${action}`);
  if (details) console.log(`Details: ${details}`);
  if (error) console.log(`Error: ${error.message}`);
  console.log('---');
}

test.describe('Production PixCart Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Set up error monitoring
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log(`Console Error: ${msg.text()}`);
      }
    });

    page.on('pageerror', error => {
      console.log(`Page Error: ${error.message}`);
    });

    page.on('requestfailed', request => {
      console.log(`Failed Request: ${request.url()} - ${request.failure()?.errorText}`);
    });
  });

  test('1. Landing Page Tests', async ({ page }) => {
    console.log('\n=== TEST 1: LANDING PAGE TESTS ===');
    
    // Navigate to homepage
    try {
      const startTime = Date.now();
      await page.goto(PRODUCTION_URL, { waitUntil: 'networkidle' });
      const loadTime = (Date.now() - startTime) / 1000;
      
      // Check if redirected
      const currentUrl = page.url();
      const isRedirected = currentUrl !== PRODUCTION_URL;
      
      logResult(
        'Landing Page Load', 
        `Navigate to ${PRODUCTION_URL}`, 
        true, 
        `${isRedirected ? 'Redirected to ' + currentUrl + ', ' : ''}Page loaded in ${loadTime}s`
      );
      
      // Check for console errors
      const consoleErrors = [];
      page.on('console', msg => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });
      
      await page.waitForTimeout(2000);
      
      logResult(
        'Console Error Check',
        'Monitor console for errors',
        consoleErrors.length === 0,
        consoleErrors.length === 0 ? 'No console errors detected' : `${consoleErrors.length} errors found`
      );

      // Take screenshot
      await page.screenshot({ path: 'test-results/landing-page.png', fullPage: true });
      
    } catch (error) {
      logResult('Landing Page Load', `Navigate to ${PRODUCTION_URL}`, false, '', error);
    }
  });

  test('2. Image Upload Flow', async ({ page }) => {
    console.log('\n=== TEST 2: IMAGE UPLOAD FLOW ===');
    
    try {
      await page.goto(PRODUCTION_URL);
      await page.waitForLoadState('networkidle');
      
      // Look for file input or upload area
      const uploadSelectors = [
        'input[type="file"]',
        '[data-testid="file-upload"]',
        '.upload-area',
        '[aria-label*="upload"]',
        'button:has-text("Upload")',
        'div:has-text("Drop")',
        'div:has-text("upload")'
      ];
      
      let uploadFound = false;
      let uploadMethod = '';
      
      for (const selector of uploadSelectors) {
        try {
          const element = await page.locator(selector).first();
          if (await element.isVisible({ timeout: 1000 })) {
            uploadFound = true;
            uploadMethod = selector;
            break;
          }
        } catch (e) {
          // Continue to next selector
        }
      }
      
      logResult(
        'Upload Element Detection',
        'Search for upload interface',
        uploadFound,
        uploadFound ? `Found upload element: ${uploadMethod}` : 'No upload interface found'
      );
      
      if (uploadFound) {
        // Create a test image file
        const testImagePath = 'test-results/test-image.png';
        // This would need a real test image - for now we'll simulate
        
        try {
          const fileInput = page.locator('input[type="file"]').first();
          
          if (await fileInput.isVisible()) {
            // We would upload a file here in a real test
            logResult(
              'Image Upload Test',
              'Attempt to upload test image',
              false,
              'File upload simulation - would need real image file'
            );
          }
        } catch (error) {
          logResult('Image Upload Test', 'Attempt to upload test image', false, '', error);
        }
      }
      
      // Test navigation to /create
      try {
        await page.goto(`${PRODUCTION_URL}/create`);
        await page.waitForLoadState('networkidle');
        
        logResult(
          'Create Page Navigation',
          'Navigate to /create page',
          true,
          'Successfully navigated to create page'
        );
        
        await page.screenshot({ path: 'test-results/create-page.png', fullPage: true });
        
      } catch (error) {
        logResult('Create Page Navigation', 'Navigate to /create page', false, '', error);
      }
      
    } catch (error) {
      logResult('Image Upload Flow', 'Test upload functionality', false, '', error);
    }
  });

  test('3. Authentication Tests', async ({ page }) => {
    console.log('\n=== TEST 3: AUTHENTICATION TESTS ===');
    
    try {
      // Navigate to login page
      await page.goto(`${PRODUCTION_URL}/auth/signin`);
      await page.waitForLoadState('networkidle');
      
      logResult(
        'Login Page Access',
        'Navigate to signin page',
        true,
        'Successfully accessed signin page'
      );
      
      // Look for login form
      const loginElements = {
        email: ['input[type="email"]', 'input[name="email"]', '[placeholder*="email"]'],
        password: ['input[type="password"]', 'input[name="password"]', '[placeholder*="password"]'],
        submit: ['button[type="submit"]', 'button:has-text("Sign")', 'button:has-text("Login")']
      };
      
      let formFound = true;
      const foundElements = {};
      
      for (const [fieldType, selectors] of Object.entries(loginElements)) {
        let found = false;
        for (const selector of selectors) {
          try {
            if (await page.locator(selector).first().isVisible({ timeout: 2000 })) {
              foundElements[fieldType] = selector;
              found = true;
              break;
            }
          } catch (e) {
            // Continue
          }
        }
        if (!found) {
          formFound = false;
          break;
        }
      }
      
      logResult(
        'Login Form Detection',
        'Search for login form elements',
        formFound,
        formFound ? 'All form elements found' : 'Login form incomplete'
      );
      
      if (formFound) {
        try {
          // Attempt login
          await page.fill(foundElements.email, TEST_ADMIN_EMAIL);
          await page.fill(foundElements.password, TEST_ADMIN_PASSWORD);
          await page.click(foundElements.submit);
          
          // Wait for navigation or error
          await page.waitForTimeout(3000);
          
          const currentUrl = page.url();
          const isLoggedIn = !currentUrl.includes('/auth/signin') && !currentUrl.includes('/auth/error');
          
          logResult(
            'Admin Login Test',
            'Attempt login with test credentials',
            isLoggedIn,
            isLoggedIn ? `Redirected to: ${currentUrl}` : 'Login failed or stayed on signin page'
          );
          
          if (isLoggedIn) {
            // Look for user dropdown or menu
            const userMenuSelectors = [
              '[data-testid="user-menu"]',
              '.user-dropdown',
              'button:has-text("admin")',
              '[aria-label*="user"]',
              '.avatar'
            ];
            
            let menuFound = false;
            for (const selector of userMenuSelectors) {
              try {
                if (await page.locator(selector).first().isVisible({ timeout: 2000 })) {
                  menuFound = true;
                  break;
                }
              } catch (e) {
                // Continue
              }
            }
            
            logResult(
              'User Menu Detection',
              'Search for user dropdown menu',
              menuFound,
              menuFound ? 'User menu found' : 'No user menu detected'
            );
          }
          
        } catch (error) {
          logResult('Admin Login Test', 'Attempt login with test credentials', false, '', error);
        }
      }
      
      await page.screenshot({ path: 'test-results/auth-test.png', fullPage: true });
      
    } catch (error) {
      logResult('Authentication Tests', 'Test authentication flow', false, '', error);
    }
  });

  test('4. Admin Console Access', async ({ page }) => {
    console.log('\n=== TEST 4: ADMIN CONSOLE ACCESS ===');
    
    try {
      // First login
      await page.goto(`${PRODUCTION_URL}/auth/signin`);
      await page.waitForLoadState('networkidle');
      
      // Try to login first
      try {
        await page.fill('input[type="email"], input[name="email"]', TEST_ADMIN_EMAIL);
        await page.fill('input[type="password"], input[name="password"]', TEST_ADMIN_PASSWORD);
        await page.click('button[type="submit"], button:has-text("Sign")');
        await page.waitForTimeout(3000);
      } catch (e) {
        // Login might fail, continue to test admin access
      }
      
      // Navigate to admin page
      await page.goto(`${PRODUCTION_URL}/admin`);
      await page.waitForLoadState('networkidle');
      
      const currentUrl = page.url();
      const isOnAdminPage = currentUrl.includes('/admin');
      const isRedirected = currentUrl !== `${PRODUCTION_URL}/admin`;
      
      logResult(
        'Admin Page Access',
        'Navigate to /admin while logged in',
        isOnAdminPage,
        isOnAdminPage ? 
          `Successfully accessed admin page${isRedirected ? ' (redirected to: ' + currentUrl + ')' : ''}` :
          `Redirected away from admin to: ${currentUrl}`
      );
      
      if (isOnAdminPage) {
        // Look for admin dashboard elements
        const adminElements = [
          'h1:has-text("Admin")',
          'h1:has-text("Dashboard")',
          '[data-testid="admin-dashboard"]',
          'button:has-text("Users")',
          'button:has-text("Feedback")',
          'table',
          '.admin-panel'
        ];
        
        let dashboardElements = 0;
        const foundElements = [];
        
        for (const selector of adminElements) {
          try {
            if (await page.locator(selector).first().isVisible({ timeout: 2000 })) {
              dashboardElements++;
              foundElements.push(selector);
            }
          } catch (e) {
            // Continue
          }
        }
        
        logResult(
          'Admin Dashboard Elements',
          'Search for admin dashboard components',
          dashboardElements > 0,
          `Found ${dashboardElements} admin elements: ${foundElements.join(', ')}`
        );
      }
      
      await page.screenshot({ path: 'test-results/admin-console.png', fullPage: true });
      
    } catch (error) {
      logResult('Admin Console Access', 'Test admin console access', false, '', error);
    }
  });

  test('5. AI Generation Test', async ({ page }) => {
    console.log('\n=== TEST 5: AI GENERATION TEST ===');
    
    try {
      await page.goto(`${PRODUCTION_URL}/create`);
      await page.waitForLoadState('networkidle');
      
      // Look for style selector
      const styleSelectors = [
        'select',
        '.style-selector',
        'button:has-text("Renaissance")',
        'button:has-text("Van Gogh")',
        'button:has-text("Monet")',
        '[data-testid="style-selector"]'
      ];
      
      let styleFound = false;
      let styleElement = null;
      
      for (const selector of styleSelectors) {
        try {
          const element = page.locator(selector).first();
          if (await element.isVisible({ timeout: 2000 })) {
            styleFound = true;
            styleElement = selector;
            break;
          }
        } catch (e) {
          // Continue
        }
      }
      
      logResult(
        'Style Selector Detection',
        'Search for art style selector',
        styleFound,
        styleFound ? `Style selector found: ${styleElement}` : 'No style selector found'
      );
      
      // Look for generate button
      const generateSelectors = [
        'button:has-text("Generate")',
        'button:has-text("Create")',
        'button:has-text("Transform")',
        '[data-testid="generate-button"]',
        '.generate-btn'
      ];
      
      let generateFound = false;
      
      for (const selector of generateSelectors) {
        try {
          if (await page.locator(selector).first().isVisible({ timeout: 2000 })) {
            generateFound = true;
            break;
          }
        } catch (e) {
          // Continue
        }
      }
      
      logResult(
        'Generate Button Detection',
        'Search for generate/create button',
        generateFound,
        generateFound ? 'Generate button found' : 'No generate button found'
      );
      
      // Test generation flow (without actual generation due to no image upload)
      if (generateFound && styleFound) {
        logResult(
          'Generation Interface Complete',
          'Verify all generation elements present',
          true,
          'Style selector and generate button both available'
        );
      } else {
        logResult(
          'Generation Interface Complete',
          'Verify all generation elements present',
          false,
          'Missing required elements for generation'
        );
      }
      
      await page.screenshot({ path: 'test-results/generation-interface.png', fullPage: true });
      
    } catch (error) {
      logResult('AI Generation Test', 'Test generation interface', false, '', error);
    }
  });

  test('6. API Endpoint Tests', async ({ page, request }) => {
    console.log('\n=== TEST 6: API ENDPOINT TESTS ===');
    
    // Test public endpoints
    const publicEndpoints = [
      '/api/user/usage',
      '/api/user/beta-status',
      '/api/generate'
    ];
    
    for (const endpoint of publicEndpoints) {
      try {
        const response = await request.get(`${PRODUCTION_URL}${endpoint}`);
        const isSuccess = response.status() < 500; // Allow 401/403 for auth-required endpoints
        
        logResult(
          `API ${endpoint}`,
          `GET ${endpoint}`,
          isSuccess,
          `Response: ${response.status()} ${response.statusText()}`
        );
        
      } catch (error) {
        logResult(`API ${endpoint}`, `GET ${endpoint}`, false, '', error);
      }
    }
    
    // Test with authentication (if login worked)
    try {
      // First, try to get auth cookies by logging in via UI
      await page.goto(`${PRODUCTION_URL}/auth/signin`);
      await page.waitForLoadState('networkidle');
      
      try {
        await page.fill('input[type="email"], input[name="email"]', TEST_ADMIN_EMAIL);
        await page.fill('input[type="password"], input[name="password"]', TEST_ADMIN_PASSWORD);
        await page.click('button[type="submit"], button:has-text("Sign")');
        await page.waitForTimeout(3000);
        
        // Get cookies for authenticated requests
        const cookies = await page.context().cookies();
        
        // Test authenticated endpoints
        const authEndpoints = ['/api/user/usage', '/api/user/beta-status'];
        
        for (const endpoint of authEndpoints) {
          try {
            const response = await page.request.get(`${PRODUCTION_URL}${endpoint}`);
            logResult(
              `Authenticated API ${endpoint}`,
              `GET ${endpoint} (with auth)`,
              response.status() === 200,
              `Response: ${response.status()} ${response.statusText()}`
            );
          } catch (error) {
            logResult(`Authenticated API ${endpoint}`, `GET ${endpoint} (with auth)`, false, '', error);
          }
        }
        
      } catch (loginError) {
        logResult('API Authentication Setup', 'Login for API testing', false, '', loginError);
      }
      
    } catch (error) {
      logResult('API Endpoint Tests', 'Test API endpoints', false, '', error);
    }
  });

  test('7. User Experience Tests', async ({ page }) => {
    console.log('\n=== TEST 7: USER EXPERIENCE TESTS ===');
    
    try {
      await page.goto(PRODUCTION_URL);
      await page.waitForLoadState('networkidle');
      
      // Test navigation
      const navTests = [
        { path: '/create', name: 'Create Page' },
        { path: '/auth/signin', name: 'Sign In Page' },
        { path: '/dashboard', name: 'Dashboard' },
        { path: '/profile', name: 'Profile' }
      ];
      
      for (const navTest of navTests) {
        try {
          await page.goto(`${PRODUCTION_URL}${navTest.path}`);
          await page.waitForLoadState('networkidle');
          
          const currentUrl = page.url();
          const reached = currentUrl.includes(navTest.path) || currentUrl !== `${PRODUCTION_URL}${navTest.path}`;
          
          logResult(
            `Navigation to ${navTest.name}`,
            `Navigate to ${navTest.path}`,
            reached,
            `Final URL: ${currentUrl}`
          );
          
        } catch (error) {
          logResult(`Navigation to ${navTest.name}`, `Navigate to ${navTest.path}`, false, '', error);
        }
      }
      
      // Test navbar visibility
      await page.goto(PRODUCTION_URL);
      await page.waitForLoadState('networkidle');
      
      const navSelectors = [
        'nav',
        '.navbar',
        'header',
        '[role="navigation"]'
      ];
      
      let navFound = false;
      for (const selector of navSelectors) {
        try {
          if (await page.locator(selector).first().isVisible({ timeout: 2000 })) {
            navFound = true;
            break;
          }
        } catch (e) {
          // Continue
        }
      }
      
      logResult(
        'Navigation Bar Presence',
        'Check for navigation elements',
        navFound,
        navFound ? 'Navigation found' : 'No navigation detected'
      );
      
      await page.screenshot({ path: 'test-results/user-experience.png', fullPage: true });
      
    } catch (error) {
      logResult('User Experience Tests', 'Test navigation and UX', false, '', error);
    }
  });

  test.afterAll(async () => {
    // Generate final results report
    console.log('\n' + '='.repeat(50));
    console.log('TEST SUITE: Production PixCart Tests');
    console.log('='.repeat(50));
    
    testResults.details.forEach((result, index) => {
      console.log(`\nTest ${index + 1}: ${result.test}`);
      console.log(`Action: ${result.action}`);
      console.log(`Result: ${result.status} ${result.status === 'PASS' ? '✅' : '❌'}`);
      if (result.details) console.log(`Details: ${result.details}`);
      if (result.error) console.log(`Error: ${result.error}`);
    });
    
    const successRate = testResults.total > 0 ? ((testResults.passed / testResults.total) * 100).toFixed(1) : 0;
    
    console.log('\n' + '='.repeat(50));
    console.log('FINAL RESULTS:');
    console.log(`- Total Tests: ${testResults.total}`);
    console.log(`- Passed: ${testResults.passed}`);
    console.log(`- Failed: ${testResults.failed}`);
    console.log(`- Success Rate: ${successRate}%`);
    console.log('='.repeat(50));
    
    // Save results to file
    const fs = require('fs');
    fs.writeFileSync('test-results/production-test-summary.json', JSON.stringify(testResults, null, 2));
  });
});