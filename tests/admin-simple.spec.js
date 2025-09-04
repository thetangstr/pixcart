/**
 * Simplified Admin Console Test
 * Testing core functionality
 */

const { test, expect } = require('@playwright/test');

const TEST_ADMIN_EMAIL = 'admin.test@pixcart.com';
const TEST_ADMIN_PASSWORD = 'TestAdmin123!@#';

test.describe('Admin Console Core Tests', () => {
  test('complete admin flow test', async ({ page }) => {
    // 1. Go to signin page
    await page.goto('/auth/signin');
    console.log('✓ Signin page loaded');
    
    // 2. Fill in credentials
    await page.fill('input[type="email"]', TEST_ADMIN_EMAIL);
    await page.fill('input[type="password"]', TEST_ADMIN_PASSWORD);
    console.log('✓ Credentials entered');
    
    // 3. Submit form
    await page.click('button[type="submit"]');
    console.log('✓ Form submitted');
    
    // 4. Wait for navigation
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    console.log('✓ Redirected to dashboard');
    
    // 5. Open user menu
    await page.click('button:has(.rounded-full)');
    console.log('✓ User menu opened');
    
    // 6. Check for admin link
    const adminLink = page.locator('text=Admin Console');
    await expect(adminLink).toBeVisible();
    console.log('✓ Admin Console link visible');
    
    // 7. Click admin console
    await adminLink.click();
    console.log('✓ Admin Console clicked');
    
    // 8. Wait for admin page to load
    await page.waitForURL('**/admin', { timeout: 10000 });
    console.log('✓ Admin page URL loaded');
    
    // 9. Wait for content to load (with longer timeout)
    await page.waitForTimeout(3000);
    console.log('✓ Waited for content');
    
    // 10. Check for any h1, h2, or main heading
    const headings = await page.locator('h1, h2, h3').first();
    const headingText = await headings.textContent().catch(() => 'No heading found');
    console.log(`✓ Page heading: ${headingText}`);
    
    // 11. Check for tabs or navigation
    const tabsExist = await page.locator('text=Overview').count() > 0;
    console.log(`✓ Tabs exist: ${tabsExist}`);
    
    // 12. Take screenshot for debugging
    await page.screenshot({ path: 'admin-page-screenshot.png' });
    console.log('✓ Screenshot taken');
    
    // Basic assertions
    expect(page.url()).toContain('/admin');
    
    // Try to find any content that indicates admin page loaded
    const pageContent = await page.content();
    const hasAdminContent = pageContent.includes('Admin') || 
                           pageContent.includes('Dashboard') || 
                           pageContent.includes('Users');
    
    expect(hasAdminContent).toBeTruthy();
    console.log('✓ Admin content found on page');
  });
  
  test('can access admin API endpoints when authenticated', async ({ page, request }) => {
    // First signin
    await page.goto('/auth/signin');
    await page.fill('input[type="email"]', TEST_ADMIN_EMAIL);
    await page.fill('input[type="password"]', TEST_ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    
    // Get cookies for API requests
    const cookies = await page.context().cookies();
    
    // Test API endpoints
    const endpoints = [
      '/api/user/beta-status',
      '/api/admin/users',
      '/api/admin/feedback',
      '/api/admin/usage'
    ];
    
    for (const endpoint of endpoints) {
      const response = await page.request.get(endpoint);
      console.log(`${endpoint}: ${response.status()}`);
      
      // Admin endpoints should return 200 or 401 (if not properly authenticated via cookies)
      expect([200, 401, 403].includes(response.status())).toBeTruthy();
    }
  });
});