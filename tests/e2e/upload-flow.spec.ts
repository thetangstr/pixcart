import { test, expect } from '@playwright/test'
import path from 'path'

test.describe('Upload Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/upload')
  })

  test('should display upload page elements', async ({ page }) => {
    // Check page title
    await expect(page.locator('h1').filter({ hasText: 'Create Your Pet' })).toBeVisible()
    
    // Check upload area is visible
    await expect(page.locator('text=Click to upload')).toBeVisible()
    await expect(page.locator('text=or drag and drop')).toBeVisible()
    
    // Check file format requirements
    await expect(page.locator('text=JPG, PNG or WebP')).toBeVisible()
    await expect(page.locator('text=Max 10MB')).toBeVisible()
  })

  test('should upload image via file input', async ({ page }) => {
    // Create a test image file path
    const filePath = path.join(__dirname, '../fixtures/test-dog.jpg')
    
    // Upload file
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(filePath)
    
    // Check image preview appears
    const preview = page.locator('img[alt="Upload preview"]')
    await expect(preview).toBeVisible()
    
    // Check file info is displayed
    await expect(page.locator('text=/test-dog.jpg/')).toBeVisible()
  })

  test('should show style selector after image upload', async ({ page }) => {
    // Upload a test image first
    const filePath = path.join(__dirname, '../fixtures/test-dog.jpg')
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(filePath)
    
    // Wait for image to be processed
    await page.waitForTimeout(500)
    
    // Check style selector is visible
    await expect(page.locator('text=Choose Your Oil Painting Style')).toBeVisible()
    
    // Check all three styles with famous painting icons
    await expect(page.locator('text=Classic Portrait')).toBeVisible()
    await expect(page.locator('text=Thick & Textured')).toBeVisible()
    await expect(page.locator('text=Soft & Dreamy')).toBeVisible()
    
    // Check style icons are visible (famous paintings)
    const styleImages = page.locator('.style-card img')
    await expect(styleImages).toHaveCount(3)
  })

  test('should enable generate button after selecting style', async ({ page }) => {
    // Upload image
    const filePath = path.join(__dirname, '../fixtures/test-dog.jpg')
    await page.locator('input[type="file"]').setInputFiles(filePath)
    
    // Wait for styles to appear
    await page.waitForSelector('text=Classic Portrait')
    
    // Select a style
    await page.click('text=Classic Portrait')
    
    // Check style is selected
    await expect(page.locator('text=Selected')).toBeVisible()
    
    // Generate button should be enabled
    const generateButton = page.locator('button').filter({ hasText: 'Generate Oil Painting' })
    await expect(generateButton).toBeEnabled()
  })

  test('should validate file size', async ({ page }) => {
    // Try to upload a large file (mock with evaluation)
    await page.evaluate(() => {
      const largeFile = new File(['x'.repeat(11 * 1024 * 1024)], 'large.jpg', { type: 'image/jpeg' })
      const event = new Event('change', { bubbles: true })
      const input = document.querySelector('input[type="file"]') as HTMLInputElement
      Object.defineProperty(input, 'files', {
        value: [largeFile],
        writable: false,
      })
      input.dispatchEvent(event)
    })
    
    // Should show error message
    await expect(page.locator('text=/File too large/')).toBeVisible()
  })

  test('should validate file format', async ({ page }) => {
    // Try to upload invalid format
    await page.evaluate(() => {
      const invalidFile = new File(['test'], 'test.gif', { type: 'image/gif' })
      const event = new Event('change', { bubbles: true })
      const input = document.querySelector('input[type="file"]') as HTMLInputElement
      Object.defineProperty(input, 'files', {
        value: [invalidFile],
        writable: false,
      })
      input.dispatchEvent(event)
    })
    
    // Should show error message
    await expect(page.locator('text=/Unsupported file type/')).toBeVisible()
  })

  test('should handle drag and drop', async ({ page }) => {
    // Create a data transfer with file
    const dataTransfer = await page.evaluateHandle(() => {
      const dt = new DataTransfer()
      const file = new File(['test'], 'test-dog.jpg', { type: 'image/jpeg' })
      dt.items.add(file)
      return dt
    })
    
    // Get drop zone
    const dropZone = page.locator('[data-testid="upload-dropzone"]')
    
    // Simulate drag over
    await dropZone.dispatchEvent('dragenter', { dataTransfer })
    
    // Check drag state is active
    await expect(dropZone).toHaveClass(/border-amber-500/)
    
    // Simulate drop
    await dropZone.dispatchEvent('drop', { dataTransfer })
    
    // File should be uploaded
    await expect(page.locator('text=/test-dog.jpg/')).toBeVisible()
  })

  test('should show internal testing note on AI Model section', async ({ page }) => {
    // Upload image first
    const filePath = path.join(__dirname, '../fixtures/test-dog.jpg')
    await page.locator('input[type="file"]').setInputFiles(filePath)
    
    // Check for internal testing note
    await expect(page.locator('text=Internal Testing Only')).toBeVisible()
  })
})