import { test, expect } from '@playwright/test'
import path from 'path'

test.describe('Style Selection', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/upload')
    
    // Upload a test image to enable style selection
    const filePath = path.join(__dirname, '../fixtures/test-dog.jpg')
    await page.locator('input[type="file"]').setInputFiles(filePath)
    
    // Wait for styles to load
    await page.waitForSelector('text=Choose Your Oil Painting Style')
  })

  test('should display all three styles with correct icons', async ({ page }) => {
    // Check Classic Portrait with Mona Lisa icon
    const classicCard = page.locator('.style-card').filter({ hasText: 'Classic Portrait' })
    await expect(classicCard).toBeVisible()
    await expect(classicCard.locator('img[alt*="Classic"]')).toBeVisible()
    await expect(classicCard.locator('text=Renaissance painting')).toBeVisible()
    
    // Check Thick & Textured with Van Gogh icon
    const vanGoghCard = page.locator('.style-card').filter({ hasText: 'Thick & Textured' })
    await expect(vanGoghCard).toBeVisible()
    await expect(vanGoghCard.locator('img[alt*="Thick"]')).toBeVisible()
    await expect(vanGoghCard.locator('text=Van Gogh style')).toBeVisible()
    
    // Check Soft & Dreamy with Monet icon
    const monetCard = page.locator('.style-card').filter({ hasText: 'Soft & Dreamy' })
    await expect(monetCard).toBeVisible()
    await expect(monetCard.locator('img[alt*="Soft"]')).toBeVisible()
    await expect(monetCard.locator('text=Monet style')).toBeVisible()
  })

  test('should highlight selected style', async ({ page }) => {
    // Click on Classic Portrait style
    await page.click('text=Classic Portrait')
    
    // Check it's highlighted
    const classicCard = page.locator('.style-card').filter({ hasText: 'Classic Portrait' })
    await expect(classicCard).toHaveClass(/ring-amber-500/)
    await expect(classicCard.locator('text=Selected')).toBeVisible()
    
    // Click on Van Gogh style
    await page.click('text=Thick & Textured')
    
    // Check Classic is no longer selected
    await expect(classicCard.locator('text=Selected')).not.toBeVisible()
    
    // Check Van Gogh is now selected
    const vanGoghCard = page.locator('.style-card').filter({ hasText: 'Thick & Textured' })
    await expect(vanGoghCard.locator('text=Selected')).toBeVisible()
  })

  test('should display style details', async ({ page }) => {
    // Check Classic Portrait details
    const classicCard = page.locator('.style-card').filter({ hasText: 'Classic Portrait' })
    await expect(classicCard.locator('text=Best for:')).toBeVisible()
    await expect(classicCard.locator('text=/Portraits|Professional/')).toBeVisible()
    await expect(classicCard.locator('text=Mood:')).toBeVisible()
    await expect(classicCard.locator('text=/Timeless|sophisticated/')).toBeVisible()
    
    // Check Van Gogh details
    const vanGoghCard = page.locator('.style-card').filter({ hasText: 'Thick & Textured' })
    await expect(vanGoghCard.locator('text=Best for:')).toBeVisible()
    await expect(vanGoghCard.locator('text=/Landscapes|Bold subjects/')).toBeVisible()
    await expect(vanGoghCard.locator('text=Mood:')).toBeVisible()
    await expect(vanGoghCard.locator('text=/Energetic|expressive/')).toBeVisible()
  })

  test('should show pro tip about trying multiple styles', async ({ page }) => {
    // Check pro tip is visible
    await expect(page.locator('text=Pro Tip')).toBeVisible()
    await expect(page.locator('text=/try multiple styles/')).toBeVisible()
  })

  test('should enable generate button only after style selection', async ({ page }) => {
    // Initially, generate button should be disabled
    const generateButton = page.locator('button').filter({ hasText: 'Generate Oil Painting' })
    await expect(generateButton).toBeDisabled()
    
    // Select a style
    await page.click('text=Classic Portrait')
    
    // Generate button should now be enabled
    await expect(generateButton).toBeEnabled()
  })

  test('should show preview modal on mobile', async ({ page, isMobile }) => {
    if (!isMobile) {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 })
    }
    
    // Click "See examples" on Classic style
    const classicCard = page.locator('.style-card').filter({ hasText: 'Classic Portrait' })
    await classicCard.locator('text=See examples').click()
    
    // Modal should appear
    const modal = page.locator('[data-testid="style-preview-modal"]')
    await expect(modal).toBeVisible()
    
    // Close modal
    await modal.locator('[aria-label="Close"]').click()
    await expect(modal).not.toBeVisible()
  })

  test('should remember tried styles', async ({ page }) => {
    // Select and "generate" with Classic style
    await page.click('text=Classic Portrait')
    const generateButton = page.locator('button').filter({ hasText: 'Generate Oil Painting' })
    
    // Mock the generation process
    await page.route('/api/convert-v3', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ 
          image: 'data:image/jpeg;base64,mock',
          styleUsed: 'classic_portrait'
        })
      })
    })
    
    await generateButton.click()
    
    // Wait for result
    await page.waitForSelector('text=Your oil painting is ready!')
    
    // Go back to try another style
    await page.click('text=Try Another Style')
    
    // Classic style should show checkmark
    const classicCard = page.locator('.style-card').filter({ hasText: 'Classic Portrait' })
    await expect(classicCard.locator('[data-testid="tried-checkmark"]')).toBeVisible()
  })
})