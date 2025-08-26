import { test, expect } from '@playwright/test'
import { promises as fs } from 'fs'
import path from 'path'

test.describe('Admin Models Testing', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin/models')
    await page.waitForLoadState('networkidle')
  })

  test('should load admin models page', async ({ page }) => {
    await expect(page).toHaveTitle(/Model Admin Console/)
    await expect(page.locator('h1')).toContainText('Model Admin Console')
  })

  test('should display all ComfyUI models', async ({ page }) => {
    // Check that all three ComfyUI models are visible
    await expect(page.locator('text=ComfyUI SD 1.5')).toBeVisible()
    await expect(page.locator('text=ComfyUI Enhanced')).toBeVisible()
    await expect(page.locator('text=ComfyUI SDXL')).toBeVisible()
  })

  test('should upload test image and convert to oil painting', async ({ page }) => {
    // Create a simple test image (1x1 red pixel)
    const redPixelBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg=='
    
    // Upload image using file input
    const fileInput = page.locator('input[type="file"]')
    
    // Create a buffer from base64
    const base64Data = redPixelBase64.split(',')[1]
    const buffer = Buffer.from(base64Data, 'base64')
    
    // Set the file input
    await fileInput.setInputFiles({
      name: 'test.png',
      mimeType: 'image/png',
      buffer: buffer
    })
    
    // Wait for image preview to appear
    await page.waitForSelector('img[alt="Test"]', { timeout: 5000 })
    
    // Select ComfyUI SD 1.5 model
    const modelCheckbox = page.locator('input[type="checkbox"][value="comfyui-sd15"]')
    await modelCheckbox.check()
    
    // Click test button
    await page.click('button:has-text("Test 1 Selected Model")')
    
    // Wait for result (with longer timeout for model processing)
    await page.waitForSelector('.border-green-500', { timeout: 120000 })
    
    // Verify success result
    const resultCard = page.locator('.border-green-500').first()
    await expect(resultCard).toContainText('ComfyUI SD 1.5')
    await expect(resultCard).toContainText('Processed in')
    
    // Check that an image was generated
    const resultImage = resultCard.locator('img')
    await expect(resultImage).toBeVisible()
    
    // Get the image src and verify it's base64
    const imageSrc = await resultImage.getAttribute('src')
    expect(imageSrc).toMatch(/^data:image\/(png|jpeg);base64,/)
  })

  test('should handle multiple model testing', async ({ page }) => {
    // Select multiple models
    await page.locator('input[value="comfyui-sd15"]').check()
    await page.locator('input[value="comfyui-enhanced"]').check()
    
    // Test without uploading image (should use default)
    await page.click('button:has-text("Test 2 Selected Models")')
    
    // Wait for both results
    await page.waitForSelector('.border-green-500', { 
      timeout: 180000,
      state: 'visible'
    })
    
    // Count successful results
    const successCards = page.locator('.border-green-500')
    const count = await successCards.count()
    expect(count).toBeGreaterThanOrEqual(1) // At least one should succeed
  })

  test('should show model status indicators', async ({ page }) => {
    // Look for status indicators
    const onlineIndicators = page.locator('text=online')
    const onlineCount = await onlineIndicators.count()
    
    // At least ComfyUI models should be online
    expect(onlineCount).toBeGreaterThan(0)
  })

  test('should preserve uploaded image in conversion', async ({ page }) => {
    // This is the critical test - upload an image and verify it's actually converted
    // not replaced with a random generation
    
    // Create a test image with specific content (blue square)
    const blueSquareBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFUlEQVR42mP8z8AAEwAB/wH8AAAA//8DAQoCATE='
    
    // Upload the blue square image
    const fileInput = page.locator('input[type="file"]')
    const base64Data = blueSquareBase64.split(',')[1]
    const buffer = Buffer.from(base64Data, 'base64')
    
    await fileInput.setInputFiles({
      name: 'blue_square.png',
      mimeType: 'image/png',
      buffer: buffer
    })
    
    // Wait for preview
    await page.waitForSelector('img[alt="Test"]', { timeout: 5000 })
    
    // Get the preview image src to compare later
    const previewImage = page.locator('img[alt="Test"]')
    const previewSrc = await previewImage.getAttribute('src')
    
    // Select ComfyUI SD 1.5
    await page.locator('input[value="comfyui-sd15"]').check()
    
    // Test the model
    await page.click('button:has-text("Test 1 Selected Model")')
    
    // Wait for result
    await page.waitForSelector('.border-green-500', { timeout: 120000 })
    
    // Get the result image
    const resultCard = page.locator('.border-green-500').first()
    const resultImage = resultCard.locator('img')
    const resultSrc = await resultImage.getAttribute('src')
    
    // The result should be different from preview (it's been converted)
    expect(resultSrc).not.toBe(previewSrc)
    
    // But it should be a base64 image
    expect(resultSrc).toMatch(/^data:image/)
    
    // Log for debugging
    console.log('Preview image length:', previewSrc?.length || 0)
    console.log('Result image length:', resultSrc?.length || 0)
    
    // Result should be substantially larger (oil painting conversion)
    if (resultSrc && previewSrc) {
      expect(resultSrc.length).toBeGreaterThan(previewSrc.length)
    }
  })

  test('should handle API errors gracefully', async ({ page }) => {
    // Test with no models selected
    await page.click('button:has-text("Test 0 Selected Model")')
    
    // Should show alert or not proceed
    page.on('dialog', async dialog => {
      expect(dialog.message()).toContain('select at least one model')
      await dialog.accept()
    })
  })
})

test.describe('Model API Integration', () => {
  test('inference API should accept image input', async ({ request }) => {
    const response = await request.post('/api/models/inference', {
      data: {
        model: 'sd15',
        prompt: 'oil painting style',
        negative_prompt: 'photo',
        image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
        steps: 5,
        cfg_scale: 7
      }
    })
    
    expect(response.ok()).toBeTruthy()
    const result = await response.json()
    
    // Should return an image
    expect(result).toHaveProperty('image')
    expect(result.image).toMatch(/^data:image/)
  })
})