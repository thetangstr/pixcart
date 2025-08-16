import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Oil Painting App - Core Features', () => {
  
  test('Homepage loads with all sections', async ({ page }) => {
    await page.goto('/');
    
    // Check hero section
    await expect(page.locator('h1')).toContainText('Turn Your Photos Into');
    await expect(page.locator('text=Beautiful Oil Paintings')).toBeVisible();
    
    // Check CTA buttons
    await expect(page.locator('text=Start Creating')).toBeVisible();
    await expect(page.locator('text=View Gallery')).toBeVisible();
    
    // Check features section
    await expect(page.locator('text=Lightning Fast')).toBeVisible();
    await expect(page.locator('text=Secure & Private')).toBeVisible();
    await expect(page.locator('text=Museum Quality')).toBeVisible();
    
    // Check how it works section
    await expect(page.locator('text=Upload Your Photo')).toBeVisible();
    await expect(page.locator('text=AI Magic Happens')).toBeVisible();
    await expect(page.locator('text=Download & Enjoy')).toBeVisible();
  });

  test('Upload page functionality', async ({ page }) => {
    await page.goto('/upload');
    
    // Check upload area exists
    const uploadArea = page.locator('text=Click to upload or drag and drop');
    await expect(uploadArea).toBeVisible();
    
    // Upload a test image
    const fileInput = page.locator('input[type="file"]');
    const testImagePath = path.join(process.cwd(), 'public/evaluation-images/real_task_1_original.jpg');
    
    // Upload file
    await fileInput.setInputFiles(testImagePath);
    
    // Wait for image preview
    await page.waitForTimeout(2000);
    
    // Check if style selection appears
    await expect(page.locator('text=Choose Your Style')).toBeVisible({ timeout: 10000 });
    
    // Check style options
    await expect(page.locator('text=Classic')).toBeVisible();
    await expect(page.locator('text=Impressionist')).toBeVisible();
    await expect(page.locator('text=Modern')).toBeVisible();
  });

  test('Style comparison dashboard loads', async ({ page }) => {
    await page.goto('/style-comparison');
    
    // Check page title
    await expect(page.locator('h1')).toContainText('Three-Style Oil Painting Comparison');
    
    // Check for evaluation sections
    await expect(page.locator('text=Classic Oil Portrait')).toBeVisible();
    await expect(page.locator('text=Impressionist Style')).toBeVisible();
    await expect(page.locator('text=Modern Expressive')).toBeVisible();
    
    // Check for score buttons
    const scoreButtons = page.locator('button:has-text("1"), button:has-text("2"), button:has-text("3"), button:has-text("4"), button:has-text("5")');
    await expect(scoreButtons.first()).toBeVisible();
  });

  test('Evaluation dashboard functionality', async ({ page }) => {
    await page.goto('/evaluation-dashboard');
    
    // Check dashboard loads
    await expect(page.locator('h1')).toContainText('AI vs Human Evaluation Dashboard');
    
    // Check statistics section
    await expect(page.locator('text=Total Tasks')).toBeVisible();
    await expect(page.locator('text=AI Evaluated')).toBeVisible();
    await expect(page.locator('text=Human Evaluated')).toBeVisible();
    
    // Check filter buttons
    await expect(page.locator('button:has-text("All Tasks")')).toBeVisible();
    await expect(page.locator('button:has-text("Needs Human Eval")')).toBeVisible();
    
    // Check items per page selector
    const itemsSelector = page.locator('select').first();
    await expect(itemsSelector).toBeVisible();
  });

  test('Checkout flow - Customer Information', async ({ page }) => {
    await page.goto('/checkout');
    
    // Check progress bar
    await expect(page.locator('text=Customer Info')).toBeVisible();
    await expect(page.locator('text=Shipping')).toBeVisible();
    await expect(page.locator('text=Order Details')).toBeVisible();
    await expect(page.locator('text=Payment')).toBeVisible();
    
    // Fill customer information
    await page.fill('input[type="text"]', 'John');
    await page.fill('input[type="text"] >> nth=1', 'Doe');
    await page.fill('input[type="email"]', 'john.doe@example.com');
    await page.fill('input[type="tel"]', '555-1234');
    
    // Continue to shipping
    await page.click('text=Continue to Shipping');
    
    // Check we're on shipping step
    await expect(page.locator('h2')).toContainText('Shipping Address');
  });

  test('Checkout flow - Shipping Address', async ({ page }) => {
    await page.goto('/checkout');
    
    // Fill customer info and continue
    await page.fill('input[type="text"]', 'John');
    await page.fill('input[type="text"] >> nth=1', 'Doe');
    await page.fill('input[type="email"]', 'john@example.com');
    await page.fill('input[type="tel"]', '555-1234');
    await page.click('text=Continue to Shipping');
    
    // Fill shipping address
    await page.fill('input[type="text"]', '123 Main St');
    await page.fill('input[type="text"] >> nth=2', 'New York');
    await page.fill('input[type="text"] >> nth=3', 'NY');
    await page.fill('input[type="text"] >> nth=4', '10001');
    
    // Check country selector
    const countrySelect = page.locator('select');
    await expect(countrySelect).toBeVisible();
    await expect(countrySelect).toHaveValue('US');
    
    // Continue to order details
    await page.click('text=Continue to Order Details');
    
    // Check we're on order details step
    await expect(page.locator('h2')).toContainText('Order Details');
  });

  test('Checkout flow - Order Details', async ({ page }) => {
    await page.goto('/checkout');
    
    // Navigate to order details step
    await page.fill('input[type="text"]', 'John');
    await page.fill('input[type="text"] >> nth=1', 'Doe');
    await page.fill('input[type="email"]', 'john@example.com');
    await page.fill('input[type="tel"]', '555-1234');
    await page.click('text=Continue to Shipping');
    
    await page.fill('input[type="text"]', '123 Main St');
    await page.fill('input[type="text"] >> nth=2', 'New York');
    await page.fill('input[type="text"] >> nth=3', 'NY');
    await page.fill('input[type="text"] >> nth=4', '10001');
    await page.click('text=Continue to Order Details');
    
    // Check print size selector
    const sizeSelect = page.locator('select').first();
    await expect(sizeSelect).toBeVisible();
    await expect(sizeSelect).toContainText('16" × 20"');
    
    // Check frame style selector
    const frameSelect = page.locator('select').nth(1);
    await expect(frameSelect).toBeVisible();
    await expect(frameSelect).toContainText('No Frame');
    
    // Check total price is displayed
    await expect(page.locator('text=Total:')).toBeVisible();
    await expect(page.locator('text=$')).toBeVisible();
    
    // Continue to payment
    await page.click('text=Continue to Payment');
    
    // Check we're on payment step
    await expect(page.locator('h2')).toContainText('Payment Information');
  });

  test('Navigation links work', async ({ page }) => {
    await page.goto('/');
    
    // Test navigation to upload
    await page.click('text=Start Creating');
    await expect(page).toHaveURL(/.*upload/);
    
    // Go back home
    await page.goto('/');
    
    // Test navigation to gallery (if exists)
    const galleryLink = page.locator('text=View Gallery');
    if (await galleryLink.isVisible()) {
      await galleryLink.click();
      await expect(page).toHaveURL(/.*gallery/);
    }
  });

  test('Mobile responsiveness', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto('/');
    
    // Check hero section is responsive
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('text=Start Creating')).toBeVisible();
    
    // Check features stack vertically on mobile
    const features = page.locator('.grid > div');
    const firstFeature = features.first();
    const secondFeature = features.nth(1);
    
    if (await firstFeature.isVisible() && await secondFeature.isVisible()) {
      const firstBox = await firstFeature.boundingBox();
      const secondBox = await secondFeature.boundingBox();
      
      if (firstBox && secondBox) {
        // On mobile, features should stack (second should be below first)
        expect(secondBox.y).toBeGreaterThan(firstBox.y);
      }
    }
  });

  test('Order confirmation page', async ({ page }) => {
    // Navigate with a mock order ID
    await page.goto('/order-confirmation?orderId=TEST-123');
    
    // Check success message
    await expect(page.locator('h1')).toContainText('Order Confirmed!');
    await expect(page.locator('text=Thank you for your order')).toBeVisible();
    
    // Check order number display
    await expect(page.locator('text=TEST-123')).toBeVisible();
    
    // Check timeline
    await expect(page.locator('text=Order Received')).toBeVisible();
    await expect(page.locator('text=Printing')).toBeVisible();
    await expect(page.locator('text=Shipping')).toBeVisible();
    
    // Check estimated delivery
    await expect(page.locator('text=Estimated Delivery')).toBeVisible();
    
    // Check action buttons
    await expect(page.locator('text=Back to Home')).toBeVisible();
    await expect(page.locator('text=Create Another Painting')).toBeVisible();
  });

  test('API endpoints are accessible', async ({ request }) => {
    // Test evaluation dashboard API
    const evalResponse = await request.get('/api/evaluation-dashboard/load-tasks');
    expect(evalResponse.ok()).toBeTruthy();
    
    // Test style comparison API
    const styleResponse = await request.get('/api/style-comparison/load-tasks');
    expect(styleResponse.ok()).toBeTruthy();
  });
});

test.describe('Performance Tests', () => {
  test('Homepage loads quickly', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;
    
    // Page should load in under 3 seconds
    expect(loadTime).toBeLessThan(3000);
  });

  test('Images are optimized', async ({ page }) => {
    await page.goto('/');
    
    // Check that images are not too large
    const images = await page.locator('img').all();
    
    for (const img of images.slice(0, 5)) { // Check first 5 images
      const src = await img.getAttribute('src');
      if (src && !src.startsWith('data:')) {
        const response = await page.request.get(src);
        const size = (await response.body()).length;
        
        // Images should be under 500KB
        expect(size).toBeLessThan(500 * 1024);
      }
    }
  });
});