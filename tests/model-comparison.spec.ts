import { test, expect } from '@playwright/test';
import { readFileSync } from 'fs';
import { join } from 'path';

// Create a test image (simple colored square)
function createTestImage(): string {
  // Create a small 100x100 pixel test image as base64
  // This is a simple red square PNG
  const testImageBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAIAAAD/gAIDAAAABGdBTUEAALGPC/xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAAACXBIWXMAAAsTAAALEwEAmpwYAAABWWlUWHRYTUw6Y29tLmFkb2JlLnhtcAAAAAAAPHg6eG1wbWV0YSB4bWxuczp4PSJhZG9iZTpuczptZXRhLyIgeDp4bXB0az0iWE1QIENvcmUgNS40LjAiPgogICA8cmRmOlJERiB4bWxuczpyZGY9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyMiPgogICAgICA8cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0iIgogICAgICAgICAgICB4bWxuczp0aWZmPSJodHRwOi8vbnMuYWRvYmUuY29tL3RpZmYvMS4wLyI+CiAgICAgICAgIDx0aWZmOk9yaWVudGF0aW9uPjE8L3RpZmY6T3JpZW50YXRpb24+CiAgICAgIDwvcmRmOkRlc2NyaXB0aW9uPgogICA8L3JkZjpSREY+CjwveDp4bXBtZXRhPgpMwidZAAABFElEQVR4Ae3QMQEAAAjDsM2/aKbgHxMEJCTkJOQk5CTkJOQk5CTkJOQk5CTkJOQk5CTkJOQk5CTkJOQk5CTkJOQk5CTkJOQk5CTkJOQk5CTkJOQk5CTkJOQk5CTkJOQk5CTkJOQk5CTkJOQk5CTkJOQk5CTkJOQk5CTkJOQk5CTkJOQk5CTkJOQk5CTkJOQk5CTkJOQk5CTkJOQk5CTkJOQk5CTkJOQk5CTkJOQk5CTkJOQk5CTkJOQk5CTkJOQk5CTkJOQk5CTkJOQk5CTkJOQk5CTkJOQk5CTkJOQk5CTkJOQk5CTkJOQk5CTkJOQk5CTkJOQk5CTkJOQk5CTkJOQk5CTkJOQk5CTkJOQk5CTkJOQk5CTkfndVqt8E6RryAAAAAElFTkSuQmCC';
  return testImageBase64;
}

test.describe('Model Comparison Tests', () => {
  test.setTimeout(300000); // 5 minutes timeout for model processing

  test('Compare SD 1.5 and Replicate SDXL with test image', async ({ page }) => {
    // Navigate to test-models page
    await page.goto('http://localhost:5174/test-models/');
    await page.waitForLoadState('networkidle');

    // Verify page loaded
    await expect(page.locator('h1')).toContainText('Model Testing & Comparison');

    // Step 1: Select models for comparison
    console.log('Selecting models for comparison...');
    
    // Select SD 1.5 (which we know works)
    const sd15Button = page.locator('button').filter({ hasText: 'ComfyUI w/ SD 1.5' }).first();
    await sd15Button.click();
    
    // Select Replicate SDXL
    const replicateButton = page.locator('button').filter({ hasText: 'Replicate (SDXL)' }).first();
    await replicateButton.click();

    // Verify 2 models are selected
    await expect(page.locator('label').filter({ hasText: 'Select Models to Compare' })).toContainText('2 selected');

    // Step 2: Configure settings
    console.log('Configuring settings...');
    
    // Set style to Classic Portrait
    const styleSelect = page.locator('select').first();
    await styleSelect.selectOption('classic_portrait');

    // Set preservation mode to High
    const preservationSelect = page.locator('select').nth(1);
    await preservationSelect.selectOption('high');

    // Step 3: Upload test image
    console.log('Uploading test image...');
    
    // Create test image data
    const testImageBase64 = createTestImage();
    
    // Convert base64 to buffer for file upload
    const base64Data = testImageBase64.split(',')[1];
    const buffer = Buffer.from(base64Data, 'base64');
    
    // Set file input
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'test-image.png',
      mimeType: 'image/png',
      buffer: buffer
    });

    // Wait for image preview to appear or just wait a bit for upload to process
    await page.waitForTimeout(1000);

    // Step 4: Run comparison
    console.log('Running model comparison...');
    
    // Click Run Comparison button
    const runButton = page.locator('button:has-text("Run Comparison")');
    await expect(runButton).toBeEnabled();
    await runButton.click();

    // Step 5: Wait for results
    console.log('Waiting for processing...');
    
    // Wait for loading indicators to appear
    await page.waitForSelector('.animate-spin', { timeout: 5000 });

    // Wait for at least one result to complete (up to 3 minutes)
    await page.waitForFunction(
      () => {
        const pageText = document.body.innerText;
        return pageText.includes('✅') || pageText.includes('❌');
      },
      { timeout: 180000 }
    );

    // Step 6: Verify results
    console.log('Verifying results...');
    
    // Check results section exists
    await expect(page.locator('h2:has-text("Results")')).toBeVisible();

    // Look for result cards
    const resultCards = page.locator('.border-2.rounded-lg.overflow-hidden.shadow-md');
    const resultCount = await resultCards.count();
    
    console.log(`Found ${resultCount} result cards`);
    expect(resultCount).toBeGreaterThan(0);

    // Check for model names in results
    const modelNames = await resultCards.locator('.font-bold.text-lg').allTextContents();
    console.log('Model names in results:', modelNames);

    // Verify at least one model produced a result
    let successCount = 0;
    let failureCount = 0;

    for (let i = 0; i < resultCount; i++) {
      const card = resultCards.nth(i);
      const statusText = await card.textContent();
      
      if (statusText?.includes('✅')) {
        successCount++;
        console.log(`Result ${i + 1}: Success`);
        
        // Check for image
        const hasImage = await card.locator('img').count() > 0;
        expect(hasImage).toBeTruthy();
      } else if (statusText?.includes('❌')) {
        failureCount++;
        console.log(`Result ${i + 1}: Failed`);
      }
    }

    console.log(`Results: ${successCount} successful, ${failureCount} failed`);
    
    // At least one model should succeed
    expect(successCount).toBeGreaterThan(0);

    // Step 7: Test download functionality
    if (successCount > 0) {
      console.log('Testing download functionality...');
      
      // Find first successful result
      const successCard = resultCards.filter({ hasText: '✅' }).first();
      
      // Check for download button
      const downloadButton = successCard.locator('button[title="Download"]');
      await expect(downloadButton).toBeVisible();
      
      // Click download (won't actually download in headless mode)
      const [download] = await Promise.all([
        page.waitForEvent('download', { timeout: 5000 }).catch(() => null),
        downloadButton.click()
      ]);
      
      if (download) {
        console.log('Download initiated successfully');
      }
    }

    // Step 8: Check Queue Monitor
    console.log('Checking Queue Monitor...');
    
    // Look for queue monitor stats
    const queueMonitor = page.locator('h3:has-text("Processing Queue")');
    if (await queueMonitor.isVisible()) {
      // Check GPU utilization is displayed
      await expect(page.locator('text=/GPU Utilization/')).toBeVisible();
      
      // Check VRAM usage is displayed
      await expect(page.locator('text=/VRAM Usage/')).toBeVisible();
      
      console.log('Queue Monitor is active and showing stats');
    }

    // Test completed successfully
    console.log('Model comparison test completed successfully!');
  });

  test('Verify model labels are displayed correctly', async ({ page }) => {
    await page.goto('http://localhost:5174/test-models/');
    await page.waitForLoadState('networkidle');

    // Select one model and run a quick test
    const sdButton = page.locator('button').filter({ hasText: 'ComfyUI w/ SD 1.5' }).first();
    await sdButton.click();

    // Upload test image
    const testImageBase64 = createTestImage();
    const base64Data = testImageBase64.split(',')[1];
    const buffer = Buffer.from(base64Data, 'base64');
    
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'test-image.png',
      mimeType: 'image/png',
      buffer: buffer
    });

    // Run comparison
    const runButton = page.locator('button:has-text("Run Comparison")');
    await runButton.click();

    // Wait for result
    await page.waitForSelector('.border-2.rounded-lg.overflow-hidden.shadow-md', { timeout: 60000 });

    // Check for model name in header
    const resultCard = page.locator('.border-2.rounded-lg.overflow-hidden.shadow-md').first();
    const headerText = await resultCard.locator('.bg-gradient-to-r.from-amber-50.to-amber-100').textContent();
    
    expect(headerText).toBeTruthy();
    console.log('Result card header:', headerText);

    // Check for overlay label on image (if image exists)
    const overlayLabel = resultCard.locator('.absolute.top-2.left-2.bg-black.bg-opacity-70.text-white');
    if (await overlayLabel.count() > 0) {
      const labelText = await overlayLabel.textContent();
      console.log('Image overlay label:', labelText);
      expect(labelText).toBeTruthy();
    }
  });
});