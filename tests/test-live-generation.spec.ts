import { test, expect } from '@playwright/test';

const PRODUCTION_URL = 'https://oil-painting-app.vercel.app';

test.describe('Live Generation Test', () => {
  test('Check API errors in console', async ({ page }) => {
    console.log('\n🔍 Testing Live Generation Flow...\n');
    
    // Set up console monitoring
    const consoleErrors: string[] = [];
    const networkErrors: string[] = [];
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
        console.log('❌ Console Error:', msg.text());
      }
    });
    
    page.on('response', response => {
      if (response.status() >= 500) {
        networkErrors.push(`${response.status()} - ${response.url()}`);
        console.log(`❌ Network Error: ${response.status()} - ${response.url()}`);
      }
    });
    
    // Go to the simple page
    console.log('1. Navigating to /simple page...');
    await page.goto(`${PRODUCTION_URL}/simple`);
    await page.waitForLoadState('networkidle');
    
    // Check if page loaded correctly
    const title = await page.locator('h1').first().textContent();
    console.log(`   Page title: ${title}`);
    
    // Check for file upload component
    const fileInput = page.locator('input[type="file"]');
    const isFileInputVisible = await fileInput.count() > 0;
    console.log(`   File input present: ${isFileInputVisible}`);
    
    // Check API calls
    console.log('\n2. Checking API calls...');
    
    // Intercept API calls
    const apiCalls: any[] = [];
    page.on('response', async response => {
      if (response.url().includes('/api/')) {
        const url = response.url();
        const status = response.status();
        let body = null;
        
        try {
          if (response.headers()['content-type']?.includes('json')) {
            body = await response.json();
          }
        } catch (e) {
          // Ignore parse errors
        }
        
        apiCalls.push({ url, status, body });
        console.log(`   API Call: ${url.replace(PRODUCTION_URL, '')} - Status: ${status}`);
        if (body?.error) {
          console.log(`     Error: ${body.error}`);
        }
      }
    });
    
    // Try navigating to create page
    console.log('\n3. Navigating to /create page...');
    await page.goto(`${PRODUCTION_URL}/create`);
    await page.waitForLoadState('networkidle');
    
    // Wait a bit for any API calls
    await page.waitForTimeout(2000);
    
    // Summary
    console.log('\n📊 SUMMARY:');
    console.log(`   Console Errors: ${consoleErrors.length}`);
    consoleErrors.forEach(err => console.log(`     - ${err}`));
    
    console.log(`   Network 5xx Errors: ${networkErrors.length}`);
    networkErrors.forEach(err => console.log(`     - ${err}`));
    
    console.log(`   API Calls Made: ${apiCalls.length}`);
    apiCalls.forEach(call => {
      console.log(`     - ${call.url.replace(PRODUCTION_URL, '')} [${call.status}]`);
      if (call.body?.error) {
        console.log(`       Error: ${call.body.error}`);
      }
    });
    
    // Check for specific issues
    const hasUsageError = apiCalls.some(c => c.url.includes('/api/user/usage') && c.status === 500);
    const hasGenerateError = apiCalls.some(c => c.url.includes('/api/generate') && c.status === 500);
    
    if (hasUsageError) {
      console.log('\n⚠️  /api/user/usage returning 500 - Database connection issue likely');
    }
    if (hasGenerateError) {
      console.log('\n⚠️  /api/generate returning 500 - Check Gemini API or database');
    }
  });
  
  test('Test authenticated flow', async ({ page, context }) => {
    console.log('\n🔐 Testing Authenticated Flow...\n');
    
    // Try to set auth cookie (if we had a valid session)
    // This is just to test the authenticated flow
    
    await page.goto(`${PRODUCTION_URL}`);
    
    // Click sign in
    const signInButton = page.locator('button:has-text("Sign In"), a:has-text("Sign In")').first();
    if (await signInButton.isVisible()) {
      console.log('Clicking Sign In...');
      await signInButton.click();
      await page.waitForLoadState('networkidle');
      
      const currentUrl = page.url();
      console.log(`Redirected to: ${currentUrl}`);
    }
  });
});