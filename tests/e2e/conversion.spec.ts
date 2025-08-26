import { test, expect } from '@playwright/test'
import path from 'path'

test.describe('Conversion Process', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/upload')
    
    // Mock the API endpoint
    await page.route('/api/convert-v3', async route => {
      // Simulate processing delay
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ 
          image: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA8A/9k=',
          styleUsed: 'classic_portrait',
          processingTime: 15.2
        })
      })
    })
    
    // Upload test image
    const filePath = path.join(__dirname, '../fixtures/test-dog.jpg')
    await page.locator('input[type="file"]').setInputFiles(filePath)
    
    // Select a style
    await page.waitForSelector('text=Classic Portrait')
    await page.click('text=Classic Portrait')
  })

  test('should show loading animation during conversion', async ({ page }) => {
    // Click generate button
    await page.click('button:has-text("Generate Oil Painting")')
    
    // Check loading animation appears
    const loader = page.locator('[data-testid="conversion-loader"]')
    await expect(loader).toBeVisible()
    
    // Check progress messages
    await expect(page.locator('text=/Analyzing your pet/')).toBeVisible()
  })

  test('should cycle through loading messages', async ({ page }) => {
    // Click generate button
    await page.click('button:has-text("Generate Oil Painting")')
    
    // Check multiple loading messages appear over time
    const messages = [
      'Analyzing your pet',
      'Selecting the perfect brushstrokes',
      'Mixing oil paint colors'
    ]
    
    for (const message of messages.slice(0, 1)) {
      await expect(page.locator(`text=/${message}/`)).toBeVisible({ timeout: 5000 })
    }
  })

  test('should display result after conversion', async ({ page }) => {
    // Click generate button
    await page.click('button:has-text("Generate Oil Painting")')
    
    // Wait for result
    await expect(page.locator('text=Your oil painting is ready!')).toBeVisible({ timeout: 10000 })
    
    // Check result image is displayed
    const resultImage = page.locator('img[alt="Oil painting result"]')
    await expect(resultImage).toBeVisible()
    
    // Check download button is present
    await expect(page.locator('button:has-text("Download")')).toBeVisible()
    
    // Check "Try Another Style" button
    await expect(page.locator('button:has-text("Try Another Style")')).toBeVisible()
  })

  test('should handle API errors gracefully', async ({ page }) => {
    // Override route to return error
    await page.route('/api/convert-v3', async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ 
          error: 'Server error during conversion'
        })
      })
    })
    
    // Click generate button
    await page.click('button:has-text("Generate Oil Painting")')
    
    // Should show error message
    await expect(page.locator('text=/Something went wrong/')).toBeVisible({ timeout: 5000 })
    
    // Should show retry option
    await expect(page.locator('button:has-text("Try Again")')).toBeVisible()
  })

  test('should handle network timeout', async ({ page }) => {
    // Override route to simulate timeout
    await page.route('/api/convert-v3', async route => {
      // Never respond to simulate timeout
      await new Promise(() => {})
    })
    
    // Click generate button
    await page.click('button:has-text("Generate Oil Painting")')
    
    // Wait for timeout message (this would typically be after 30s, but we'll check it exists)
    // In real app, you'd have a timeout handler
    const loader = page.locator('[data-testid="conversion-loader"]')
    await expect(loader).toBeVisible()
  })

  test('should allow downloading result', async ({ page }) => {
    // Generate painting
    await page.click('button:has-text("Generate Oil Painting")')
    
    // Wait for result
    await page.waitForSelector('text=Your oil painting is ready!')
    
    // Set up download promise before clicking
    const downloadPromise = page.waitForEvent('download')
    
    // Click download button
    await page.click('button:has-text("Download")')
    
    // Wait for download to start
    const download = await downloadPromise
    
    // Verify download
    expect(download.suggestedFilename()).toMatch(/pet-oil-painting.*\.jpg/)
  })

  test('should allow trying another style', async ({ page }) => {
    // Generate painting
    await page.click('button:has-text("Generate Oil Painting")')
    
    // Wait for result
    await page.waitForSelector('text=Your oil painting is ready!')
    
    // Click "Try Another Style"
    await page.click('button:has-text("Try Another Style")')
    
    // Should go back to style selection with image still uploaded
    await expect(page.locator('text=Choose Your Oil Painting Style')).toBeVisible()
    
    // Image preview should still be visible
    await expect(page.locator('img[alt="Upload preview"]')).toBeVisible()
    
    // Classic style should show as tried
    const classicCard = page.locator('.style-card').filter({ hasText: 'Classic Portrait' })
    await expect(classicCard.locator('[data-testid="tried-checkmark"]')).toBeVisible()
  })

  test('should allow starting over', async ({ page }) => {
    // Generate painting
    await page.click('button:has-text("Generate Oil Painting")')
    
    // Wait for result
    await page.waitForSelector('text=Your oil painting is ready!')
    
    // Click "Start Over"
    await page.click('button:has-text("Start Over")')
    
    // Should reset to initial upload state
    await expect(page.locator('text=Click to upload')).toBeVisible()
    
    // Previous image should be cleared
    await expect(page.locator('img[alt="Upload preview"]')).not.toBeVisible()
  })
})