import { test, expect } from '@playwright/test'

test.describe('Homepage', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('should load homepage with correct title', async ({ page }) => {
    await expect(page).toHaveTitle(/PetCanvas/)
    
    // Check main heading is visible
    const heading = page.locator('h1').filter({ hasText: 'Transform Your Pet Photos' })
    await expect(heading).toBeVisible()
  })

  test('should display navigation menu', async ({ page }) => {
    // Check brand name
    await expect(page.locator('text=PetCanvas')).toBeVisible()
    
    // Check navigation items
    await expect(page.locator('nav >> text=Home')).toBeVisible()
    await expect(page.locator('nav >> text=Create')).toBeVisible()
    await expect(page.locator('nav >> text=Gallery')).toBeVisible()
  })

  test('should display hero slider', async ({ page }) => {
    // Check slider is present
    const slider = page.locator('[data-testid="before-after-slider"]')
    await expect(slider).toBeVisible()
    
    // Check slider has images
    const beforeImage = slider.locator('img').first()
    await expect(beforeImage).toBeVisible()
  })

  test('should navigate to upload page when clicking CTA button', async ({ page }) => {
    // Click "Create Your Pet Portrait" button
    await page.click('text=Create Your Pet Portrait')
    
    // Should navigate to upload page
    await expect(page).toHaveURL('/upload')
    await expect(page.locator('h1').filter({ hasText: 'Create Your Pet' })).toBeVisible()
  })

  test('should display showcase gallery', async ({ page }) => {
    // Scroll to gallery section
    const gallery = page.locator('text=Showcase Gallery')
    await gallery.scrollIntoViewIfNeeded()
    await expect(gallery).toBeVisible()
    
    // Check gallery has images
    const galleryImages = page.locator('.grid img')
    await expect(galleryImages).toHaveCount(6)
  })

  test('should display how it works section', async ({ page }) => {
    // Check "How It Works" section
    const howItWorks = page.locator('h2').filter({ hasText: 'How It Works' })
    await howItWorks.scrollIntoViewIfNeeded()
    await expect(howItWorks).toBeVisible()
    
    // Check steps are present
    await expect(page.locator('text=Upload Your Photo')).toBeVisible()
    await expect(page.locator('text=Choose Style')).toBeVisible()
    await expect(page.locator('text=AI Creates')).toBeVisible()
  })

  test('should have responsive layout', async ({ page }) => {
    // Desktop view
    await page.setViewportSize({ width: 1920, height: 1080 })
    await expect(page.locator('nav')).toBeVisible()
    
    // Mobile view
    await page.setViewportSize({ width: 375, height: 667 })
    
    // Mobile menu button should be visible
    const mobileMenuButton = page.locator('[aria-label="Toggle menu"]')
    await expect(mobileMenuButton).toBeVisible()
    
    // Click mobile menu
    await mobileMenuButton.click()
    
    // Mobile menu should expand
    await expect(page.locator('nav >> text=Create')).toBeVisible()
  })
})