import { test, expect, Page } from '@playwright/test';
import path from 'path';

// Test configuration
const BASE_URL = 'http://localhost:3000';
const TEST_IMAGE_PATH = path.join(__dirname, '..', 'test-image.png');

test.describe('Upload Functionality - Comprehensive Testing', () => {
  
  test.beforeEach(async ({ page }) => {
    // Set up console error and network monitoring
    const consoleErrors: string[] = [];
    const networkErrors: string[] = [];
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(`Console Error: ${msg.text()}`);
      }
    });

    page.on('response', response => {
      if (response.status() >= 400) {
        networkErrors.push(`Network Error: ${response.status()} - ${response.url()}`);
      }
    });

    // Store errors in page context for later access
    await page.addInitScript(() => {
      (window as any).testErrors = { console: [], network: [] };
    });
    
    await page.goto(`${BASE_URL}/upload`);
    await page.waitForLoadState('networkidle');
  });

  test('should successfully navigate to upload page and display interface', async ({ page }) => {
    // Verify page loaded correctly
    await expect(page).toHaveURL(`${BASE_URL}/upload`);
    await expect(page.locator('text=Transform Your Photos')).toBeVisible();
    
    // Verify upload interface elements
    await expect(page.locator('text=Drop your image here')).toBeVisible();
    await expect(page.locator('text=Choose Image')).toBeVisible();
    await expect(page.locator('input[type="file"]')).toBeAttached();
    
    // Take screenshot of initial state
    await page.screenshot({ 
      path: 'test-results/upload-initial-state.png', 
      fullPage: true 
    });
  });

  test('should handle file selection and show preview', async ({ page }) => {
    // Verify test image exists
    const fs = require('fs');
    const imageExists = fs.existsSync(TEST_IMAGE_PATH);
    if (!imageExists) {
      throw new Error(`Test image not found at: ${TEST_IMAGE_PATH}`);
    }

    // Upload the test image
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(TEST_IMAGE_PATH);
    
    // Wait for preview to appear
    await page.waitForTimeout(1000);
    
    // Verify file was selected and preview shows
    await expect(page.locator('img[alt="Preview"]')).toBeVisible();
    await expect(page.locator('text=test-image.png')).toBeVisible();
    
    // Verify convert button appears
    const convertButton = page.locator('text=Convert to Oil Painting');
    await expect(convertButton).toBeVisible();
    await expect(convertButton).toBeEnabled();
    
    // Take screenshot with preview
    await page.screenshot({ 
      path: 'test-results/upload-with-preview.png', 
      fullPage: true 
    });
  });

  test('should attempt conversion and capture any errors', async ({ page }) => {
    // Set up network request monitoring
    const apiRequests: any[] = [];
    
    page.on('request', request => {
      if (request.url().includes('/api/convert')) {
        apiRequests.push({
          url: request.url(),
          method: request.method(),
          headers: request.headers(),
          postData: request.postData()
        });
      }
    });

    page.on('response', response => {
      if (response.url().includes('/api/convert')) {
        console.log(`API Response: ${response.status()} - ${response.url()}`);
      }
    });

    // Upload the test image
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(TEST_IMAGE_PATH);
    
    // Wait for preview
    await page.waitForTimeout(1000);
    
    // Click convert button
    const convertButton = page.locator('text=Convert to Oil Painting');
    await convertButton.click();
    
    // Verify loading state appears
    await expect(page.locator('text=Converting...')).toBeVisible();
    
    // Wait for conversion to complete or fail
    await page.waitForTimeout(10000);
    
    // Take screenshot during/after conversion attempt
    await page.screenshot({ 
      path: 'test-results/upload-conversion-attempt.png', 
      fullPage: true 
    });
    
    // Check for any alerts or error messages
    const alertDialog = page.locator('text=Conversion failed');
    const isAlertVisible = await alertDialog.isVisible().catch(() => false);
    
    if (isAlertVisible) {
      console.log('Conversion failed alert detected');
    }
    
    // Log API request details
    if (apiRequests.length > 0) {
      console.log('API Requests made:', JSON.stringify(apiRequests, null, 2));
    } else {
      console.log('No API requests detected');
    }
  });

  test('should monitor console and network errors during upload flow', async ({ page }) => {
    const consoleErrors: string[] = [];
    const networkErrors: string[] = [];
    const networkRequests: any[] = [];

    // Monitor console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(`Console Error: ${msg.text()}`);
        console.log(`CONSOLE ERROR: ${msg.text()}`);
      }
    });

    // Monitor network requests and responses
    page.on('request', request => {
      networkRequests.push({
        url: request.url(),
        method: request.method(),
        resourceType: request.resourceType()
      });
    });

    page.on('response', response => {
      if (response.status() >= 400) {
        networkErrors.push(`${response.status()} - ${response.url()}`);
        console.log(`NETWORK ERROR: ${response.status()} - ${response.url()}`);
      }
    });

    // Perform full upload flow
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(TEST_IMAGE_PATH);
    await page.waitForTimeout(1000);
    
    const convertButton = page.locator('text=Convert to Oil Painting');
    await convertButton.click();
    
    // Wait for process to complete
    await page.waitForTimeout(15000);
    
    // Report all errors found
    console.log('\n=== ERROR REPORT ===');
    console.log('Console Errors:', consoleErrors);
    console.log('Network Errors:', networkErrors);
    console.log('Total Network Requests:', networkRequests.length);
    
    // Create error context file
    const errorContext = {
      timestamp: new Date().toISOString(),
      consoleErrors,
      networkErrors,
      networkRequests: networkRequests.filter(req => req.url.includes('/api/')),
      testStatus: 'Error monitoring completed'
    };
    
    const fs = require('fs');
    fs.writeFileSync(
      'test-results/upload-error-context.json', 
      JSON.stringify(errorContext, null, 2)
    );
  });

  test('should test API endpoint directly', async ({ page, request }) => {
    // Test the API endpoint directly to isolate backend issues
    const fs = require('fs');
    const imageBuffer = fs.readFileSync(TEST_IMAGE_PATH);
    
    // Create FormData for API test
    const formData = new FormData();
    const blob = new Blob([imageBuffer], { type: 'image/png' });
    formData.append('image', blob, 'test-image.png');
    
    try {
      console.log('Testing API endpoint directly...');
      
      const response = await request.post(`${BASE_URL}/api/convert`, {
        data: formData,
        headers: {
          // Don't set Content-Type header, let the browser set it with boundary
        }
      });
      
      console.log(`API Direct Test Response: ${response.status()}`);
      
      if (response.ok()) {
        console.log('API responded successfully');
        const responseBody = await response.body();
        console.log(`Response body length: ${responseBody.length} bytes`);
      } else {
        const errorText = await response.text();
        console.log(`API Error Response: ${errorText}`);
      }
      
    } catch (error) {
      console.log('API Direct Test Error:', error);
    }
  });

  test('should test drag and drop functionality', async ({ page }) => {
    // Test drag and drop upload
    const fs = require('fs');
    const imageBuffer = fs.readFileSync(TEST_IMAGE_PATH);
    
    // Simulate drag and drop
    await page.evaluate(async (imageData) => {
      const dropArea = document.querySelector('[class*="border-dashed"]');
      if (dropArea) {
        const blob = new Blob([new Uint8Array(imageData)], { type: 'image/png' });
        const file = new File([blob], 'test-image.png', { type: 'image/png' });
        
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        
        const dragEvent = new DragEvent('drop', {
          dataTransfer: dataTransfer,
          bubbles: true
        });
        
        dropArea.dispatchEvent(dragEvent);
      }
    }, Array.from(imageBuffer));
    
    // Wait for processing
    await page.waitForTimeout(2000);
    
    // Verify drag and drop worked
    const preview = page.locator('img[alt="Preview"]');
    const isPreviewVisible = await preview.isVisible().catch(() => false);
    
    if (isPreviewVisible) {
      console.log('Drag and drop functionality working');
    } else {
      console.log('Drag and drop functionality not working');
    }
    
    await page.screenshot({ 
      path: 'test-results/upload-drag-drop-test.png', 
      fullPage: true 
    });
  });
});