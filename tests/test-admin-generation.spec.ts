import { test, expect } from '@playwright/test';

const PRODUCTION_URL = 'https://oil-painting-app.vercel.app';

// You need to run: npx playwright test tests/test-admin-generation --headed
// This will open a browser where you can manually sign in

test.describe('Admin Generation Test', () => {
  test('Test generation as admin user', async ({ page, context }) => {
    // Increase timeout for manual login
    test.setTimeout(180000); // 3 minutes
    
    console.log('\n🔐 ADMIN GENERATION TEST\n');
    console.log('='*50);
    
    // Go to app
    await page.goto(PRODUCTION_URL);
    
    // Check initial state
    const signInBtn = page.locator('button:has-text("Sign In")').first();
    if (await signInBtn.isVisible()) {
      console.log('📝 Please sign in as admin (thetangstr@gmail.com)');
      await signInBtn.click();
      
      // Wait for auth redirect
      await page.waitForURL(/auth|signin|accounts\.google/, { timeout: 10000 }).catch(() => {});
      
      console.log('\n⚠️  MANUAL ACTION REQUIRED:');
      console.log('   1. Sign in with thetangstr@gmail.com');
      console.log('   2. The test will continue automatically after sign in\n');
      
      // Wait for redirect back to app after successful auth
      await page.waitForURL(url => !url.toString().includes('auth') && !url.toString().includes('accounts.google'), {
        timeout: 120000
      });
      
      console.log('✅ Signed in successfully!');
    }
    
    // Now navigate to create page
    console.log('\n📸 Testing image generation...');
    await page.goto(`${PRODUCTION_URL}/create`);
    await page.waitForLoadState('networkidle');
    
    // Monitor API responses
    const apiResponses = [];
    page.on('response', async response => {
      if (response.url().includes('/api/')) {
        const endpoint = response.url().replace(PRODUCTION_URL, '');
        const status = response.status();
        let body = null;
        
        try {
          if (response.headers()['content-type']?.includes('json')) {
            body = await response.json();
          }
        } catch (e) {}
        
        apiResponses.push({ endpoint, status, body });
        console.log(`   API: ${endpoint} -> ${status}`);
        if (body?.error) {
          console.log(`     Error: ${body.error}`);
        }
      }
    });
    
    // Check for file input
    const fileInput = page.locator('input[type="file"]');
    const hasFileInput = await fileInput.count() > 0;
    console.log(`   File input available: ${hasFileInput}`);
    
    if (hasFileInput) {
      // Create a test image file
      const buffer = Buffer.from('/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAAQABADASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=', 'base64');
      
      console.log('   Uploading test image...');
      await fileInput.setInputFiles({
        name: 'test-pet.jpg',
        mimeType: 'image/jpeg',
        buffer: buffer
      });
      
      // Wait a moment for upload to process
      await page.waitForTimeout(1000);
      
      // Select style
      const styleButton = page.locator('button:has-text("Renaissance"), [data-style="renaissance"]').first();
      if (await styleButton.isVisible()) {
        console.log('   Selecting Renaissance style...');
        await styleButton.click();
      }
      
      // Find and click generate button
      const generateButton = page.locator('button:has-text("Generate"), button:has-text("Create"), button:has-text("Transform")').first();
      if (await generateButton.isVisible()) {
        console.log('   Clicking Generate...');
        
        // Set up promise to wait for generate response
        const responsePromise = page.waitForResponse(
          resp => resp.url().includes('/api/generate'),
          { timeout: 30000 }
        );
        
        await generateButton.click();
        
        // Wait for the response
        const response = await responsePromise;
        const responseData = await response.json();
        
        console.log(`\n📊 GENERATION RESULT:`);
        console.log(`   Status: ${response.status()}`);
        
        if (response.status() === 200) {
          console.log('   ✅ SUCCESS! Generation worked!');
          console.log(`   Has preview: ${!!responseData.preview}`);
          console.log(`   Description length: ${responseData.preview?.description?.length || 0}`);
          console.log(`   Remaining uses: ${responseData.usage?.remaining}`);
        } else {
          console.log(`   ❌ Generation failed!`);
          console.log(`   Error: ${responseData.error}`);
          console.log(`   Code: ${responseData.code}`);
          
          if (responseData.error?.includes('API key')) {
            console.log('\n   🔧 FIX: GEMINI_API_KEY issue in Vercel');
          }
          if (responseData.error?.includes('allowlist')) {
            console.log('\n   🔧 FIX: User not on allowlist');
          }
          if (responseData.error?.includes('rate limit')) {
            console.log('\n   ℹ️  Rate limited (but API works)');
          }
        }
      } else {
        console.log('   ❌ No generate button found');
      }
    }
    
    // Summary
    console.log('\n' + '='*50);
    console.log('API CALLS SUMMARY:');
    apiResponses.forEach(r => {
      const status = r.status === 200 ? '✅' : r.status >= 500 ? '❌' : '⚠️';
      console.log(`   ${status} ${r.endpoint}: ${r.status}`);
      if (r.body?.error) {
        console.log(`      Error: ${r.body.error}`);
      }
    });
    
    // Keep page open for debugging
    await page.waitForTimeout(5000);
  });
});