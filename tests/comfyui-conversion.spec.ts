import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

test.describe('ComfyUI Oil Painting Conversion', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to upload page
    await page.goto('http://localhost:5174/upload');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
  });

  test('should convert image to oil painting style', async ({ page }) => {
    // Create a test image if it doesn't exist
    const testImagePath = path.join(__dirname, 'test-dog.jpg');
    
    // Find or use an existing test image
    const inputDir = '/Volumes/home/Projects_Hosted/pixcart_v2/ComfyUI/input';
    const testImages = fs.readdirSync(inputDir).filter(f => f.endsWith('.png') || f.endsWith('.jpg'));
    
    if (testImages.length > 0) {
      const sourceImage = path.join(inputDir, testImages[0]);
      
      // Upload the image
      const fileInput = await page.locator('input[type="file"]');
      await fileInput.setInputFiles(sourceImage);
      
      // Wait for preview to appear
      await page.waitForSelector('img[alt="Preview"]', { timeout: 5000 });
      
      // Select a style
      const styleButtons = await page.locator('button').filter({ hasText: /impressionist|classic|soft/i });
      if (await styleButtons.count() > 0) {
        await styleButtons.first().click();
      }
      
      // Click convert button
      const convertButton = await page.locator('button').filter({ hasText: /convert/i });
      await convertButton.click();
      
      // Wait for conversion with longer timeout
      await page.waitForSelector('text=/Download|Converted|Complete/i', { 
        timeout: 180000 // 3 minutes for conversion
      });
      
      // Check for errors
      const errors = await page.locator('.error, [role="alert"]').count();
      expect(errors).toBe(0);
      
      // Check if converted image appears
      const convertedImages = await page.locator('img').filter({ hasNot: page.locator('[alt="Preview"]') });
      expect(await convertedImages.count()).toBeGreaterThan(0);
    }
  });

  test('should check ComfyUI connection', async ({ page }) => {
    // Test ComfyUI API directly
    const response = await page.request.get('http://localhost:8188/system_stats');
    expect(response.ok()).toBeTruthy();
    
    const stats = await response.json();
    expect(stats.system).toBeDefined();
    expect(stats.devices).toBeDefined();
  });

  test('should handle API errors gracefully', async ({ page }) => {
    // Monitor console for errors
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    // Navigate to upload page
    await page.goto('http://localhost:5174/upload');
    await page.waitForTimeout(2000);
    
    // Log all console errors for debugging
    if (consoleErrors.length > 0) {
      console.log('Console errors found:');
      consoleErrors.forEach(error => console.log(' -', error));
    }
    
    // Check for specific error patterns
    const criticalErrors = consoleErrors.filter(error => 
      error.includes('Failed to queue prompt') ||
      error.includes('500') ||
      error.includes('TypeError')
    );
    
    // Report critical errors
    if (criticalErrors.length > 0) {
      console.log('Critical errors detected:');
      criticalErrors.forEach(error => console.log(' ❌', error));
    }
    
    expect(criticalErrors.length).toBe(0);
  });
});