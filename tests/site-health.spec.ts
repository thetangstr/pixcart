import { test, expect } from '@playwright/test';

test.describe('Site Health Checks', () => {
  test('check for console errors and warnings', async ({ page }) => {
    const consoleMessages: string[] = [];
    const errors: string[] = [];
    
    // Listen for console messages
    page.on('console', (msg) => {
      const type = msg.type();
      const text = msg.text();
      
      if (type === 'error') {
        errors.push(text);
        console.error('❌ Console Error:', text);
      } else if (type === 'warning') {
        consoleMessages.push(`⚠️ Warning: ${text}`);
      }
      
      // Log all console messages for debugging
      console.log(`[${type}] ${text}`);
    });

    // Listen for page errors
    page.on('pageerror', (error) => {
      errors.push(error.message);
      console.error('❌ Page Error:', error.message);
    });

    console.log('📍 Testing homepage...');
    await page.goto('http://localhost:5174/', { waitUntil: 'networkidle' });
    
    // Check page load time
    const homeLoadTime = await page.evaluate(() => {
      const perfData = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      return perfData.loadEventEnd - perfData.fetchStart;
    });
    console.log(`⏱️ Homepage load time: ${homeLoadTime}ms`);
    
    console.log('\n📍 Testing upload page...');
    await page.goto('http://localhost:5174/upload', { waitUntil: 'networkidle' });
    
    const uploadLoadTime = await page.evaluate(() => {
      const perfData = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      return perfData.loadEventEnd - perfData.fetchStart;
    });
    console.log(`⏱️ Upload page load time: ${uploadLoadTime}ms`);
    
    // Check for the Replicate toggle
    const replicateToggle = await page.locator('text=AI Model').isVisible();
    expect(replicateToggle).toBeTruthy();
    console.log('✅ Replicate toggle found');
    
    // Report findings
    console.log('\n📊 Summary:');
    console.log(`Total errors found: ${errors.length}`);
    console.log(`Total warnings found: ${consoleMessages.filter(m => m.includes('Warning')).length}`);
    
    if (errors.length > 0) {
      console.log('\n🔴 Errors found:');
      errors.forEach(err => console.log(`  - ${err}`));
    }
    
    // Performance warnings
    if (homeLoadTime > 3000) {
      console.log(`\n⚠️ Homepage is slow (${homeLoadTime}ms > 3000ms)`);
    }
    if (uploadLoadTime > 3000) {
      console.log(`⚠️ Upload page is slow (${uploadLoadTime}ms > 3000ms)`);
    }
  });

  test('check API endpoints health', async ({ request }) => {
    console.log('\n🔍 Checking API endpoints...');
    
    // Check Replicate API status
    const replicateStatus = await request.get('http://localhost:5174/api/convert-replicate');
    console.log(`Replicate API status: ${replicateStatus.status()}`);
    
    if (replicateStatus.ok()) {
      const data = await replicateStatus.json();
      console.log('✅ Replicate API configured:', data.configured);
      if (data.configured) {
        console.log('   Available qualities:', data.availableQualities.join(', '));
        console.log('   Available styles:', data.availableStyles.join(', '));
      }
    }
    
    // Check auth endpoints
    const authSession = await request.get('http://localhost:5174/api/auth/session');
    console.log(`Auth session status: ${authSession.status()}`);
    
    // Check for slow endpoints
    const startTime = Date.now();
    await request.get('http://localhost:5174/api/auth/current');
    const authTime = Date.now() - startTime;
    
    if (authTime > 1000) {
      console.log(`⚠️ Auth endpoint is slow: ${authTime}ms`);
    }
  });
});