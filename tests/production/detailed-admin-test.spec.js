// tests/production/detailed-admin-test.spec.js
const { test, expect } = require('@playwright/test');

const PRODUCTION_URL = 'https://oil-painting-app.vercel.app';
const TEST_ADMIN_EMAIL = 'admin.test@pixcart.com';
const TEST_ADMIN_PASSWORD = 'TestAdmin123!@#';

test.describe('Detailed Admin Access Test', () => {
  test('Admin Access with Authentication State', async ({ page }) => {
    console.log('\n=== DETAILED ADMIN ACCESS TEST ===');
    
    // Step 1: Login first
    await page.goto(`${PRODUCTION_URL}/auth/signin`);
    await page.waitForLoadState('networkidle');
    
    try {
      // Fill login form
      await page.fill('input[type="email"]', TEST_ADMIN_EMAIL);
      await page.fill('input[type="password"]', TEST_ADMIN_PASSWORD);
      await page.click('button[type="submit"]');
      
      // Wait for login to complete
      await page.waitForURL(/dashboard|auth/, { timeout: 10000 });
      console.log('✅ Login completed, current URL:', page.url());
      
      // Check if we're logged in (should be on dashboard)
      const isLoggedIn = page.url().includes('/dashboard');
      console.log('✅ Login status:', isLoggedIn ? 'SUCCESS' : 'FAILED');
      
      if (isLoggedIn) {
        // Step 2: Now try to access admin
        console.log('🔍 Attempting to access /admin...');
        await page.goto(`${PRODUCTION_URL}/admin`);
        await page.waitForLoadState('networkidle');
        
        const adminUrl = page.url();
        console.log('🎯 Admin access result URL:', adminUrl);
        
        if (adminUrl.includes('/admin')) {
          console.log('✅ Successfully accessed admin panel');
          
          // Look for admin-specific elements
          const adminElements = await page.locator('h1, h2, [data-testid*="admin"], .admin').all();
          console.log('📊 Found', adminElements.length, 'potential admin elements');
          
          // Check for specific admin functionality
          const hasUserManagement = await page.locator('text=Users').isVisible().catch(() => false);
          const hasFeedback = await page.locator('text=Feedback').isVisible().catch(() => false);
          const hasAnalytics = await page.locator('text=Analytics').isVisible().catch(() => false);
          
          console.log('🔧 Admin features found:');
          console.log('  - User Management:', hasUserManagement ? '✅' : '❌');
          console.log('  - Feedback:', hasFeedback ? '✅' : '❌');
          console.log('  - Analytics:', hasAnalytics ? '✅' : '❌');
          
        } else {
          console.log('❌ Admin access denied, redirected to:', adminUrl);
          
          // Check if it's an auth issue
          if (adminUrl.includes('/auth/signin')) {
            console.log('🔐 Reason: Authentication required (user might not have admin privileges)');
          } else if (adminUrl.includes('/dashboard')) {
            console.log('🚫 Reason: Redirected to dashboard (insufficient privileges)');
          } else {
            console.log('❓ Reason: Unknown redirect');
          }
        }
        
        await page.screenshot({ path: 'test-results/detailed-admin-access.png', fullPage: true });
        
      } else {
        console.log('❌ Login failed, cannot test admin access');
      }
      
    } catch (error) {
      console.log('❌ Test failed:', error.message);
    }
  });

  test('Test Generation Interface Elements', async ({ page }) => {
    console.log('\n=== DETAILED GENERATION INTERFACE TEST ===');
    
    await page.goto(`${PRODUCTION_URL}/create`);
    await page.waitForLoadState('networkidle');
    
    console.log('📍 Current URL:', page.url());
    
    // Test upload area
    const uploadArea = page.locator('[data-testid="file-upload"], .upload-area, div:has-text("Upload your photo")').first();
    const hasUpload = await uploadArea.isVisible().catch(() => false);
    console.log('📤 Upload area present:', hasUpload ? '✅' : '❌');
    
    if (hasUpload) {
      const uploadText = await uploadArea.textContent();
      console.log('📝 Upload area text:', uploadText);
    }
    
    // Look for style selection after scrolling
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1000);
    
    // Check for different style selector patterns
    const styleSelectors = [
      'select[name*="style"]',
      'select[id*="style"]',
      '.style-selector select',
      'button:has-text("Renaissance")',
      'div:has-text("Renaissance")',
      'label:has-text("Renaissance")',
      '[data-testid*="style"]'
    ];
    
    let styleFound = false;
    let foundSelector = '';
    
    for (const selector of styleSelectors) {
      try {
        const element = page.locator(selector).first();
        if (await element.isVisible({ timeout: 1000 })) {
          styleFound = true;
          foundSelector = selector;
          break;
        }
      } catch (e) {
        // Continue
      }
    }
    
    console.log('🎨 Style selector found:', styleFound ? '✅' : '❌');
    if (styleFound) {
      console.log('🎯 Using selector:', foundSelector);
    }
    
    // Look for generate button
    const generateSelectors = [
      'button:has-text("Generate")',
      'button:has-text("Create")',
      'button:has-text("Transform")',
      'button[type="submit"]',
      'input[type="submit"]',
      '.generate-btn, .create-btn'
    ];
    
    let generateFound = false;
    let generateSelector = '';
    
    for (const selector of generateSelectors) {
      try {
        const element = page.locator(selector).first();
        if (await element.isVisible({ timeout: 1000 })) {
          generateFound = true;
          generateSelector = selector;
          break;
        }
      } catch (e) {
        // Continue
      }
    }
    
    console.log('⚡ Generate button found:', generateFound ? '✅' : '❌');
    if (generateFound) {
      console.log('🎯 Using selector:', generateSelector);
    }
    
    // Take screenshot of the create page
    await page.screenshot({ path: 'test-results/detailed-create-page.png', fullPage: true });
    
    // Summary
    const interfaceComplete = hasUpload && (styleFound || generateFound);
    console.log('\n📊 GENERATION INTERFACE SUMMARY:');
    console.log('  Upload Area: ', hasUpload ? '✅' : '❌');
    console.log('  Style Selector: ', styleFound ? '✅' : '❌');
    console.log('  Generate Button: ', generateFound ? '✅' : '❌');
    console.log('  Interface Complete: ', interfaceComplete ? '✅' : '❌');
  });
});