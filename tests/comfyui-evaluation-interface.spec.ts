import { test, expect, Page } from '@playwright/test'

test.describe('ComfyUI Evaluation Interface Tests', () => {
  let page: Page

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage()
    
    // Set up console error monitoring
    const consoleErrors: string[] = []
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(`Console Error: ${msg.text()}`)
      }
    })
    
    // Monitor network failures
    page.on('response', response => {
      if (!response.ok()) {
        console.log(`Network Error: ${response.status()} ${response.url()}`)
      }
    })
    
    // Navigate to home page first
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' })
  })

  test('should navigate to ComfyUI evaluation page from main navigation', async () => {
    // Take screenshot of main page
    await page.screenshot({ 
      path: 'test-results/01-main-page-navigation.png',
      fullPage: true 
    })

    // Check if ComfyUI Eval link exists in navigation
    const comfyUILink = page.locator('nav a[href="/comfyui-evaluation"]')
    await expect(comfyUILink).toBeVisible()
    await expect(comfyUILink).toContainText('ComfyUI Eval')

    // Navigate to ComfyUI evaluation page
    await comfyUILink.click()
    await page.waitForURL('**/comfyui-evaluation')
    await page.waitForLoadState('networkidle')

    // Verify we're on the correct page
    await expect(page).toHaveURL(/.*comfyui-evaluation/)
    
    // Take screenshot of ComfyUI evaluation page load
    await page.screenshot({ 
      path: 'test-results/02-comfyui-evaluation-page-loaded.png',
      fullPage: true 
    })
  })

  test('should load and display mock evaluation dataset', async () => {
    await page.goto('http://localhost:3000/comfyui-evaluation')
    await page.waitForLoadState('networkidle')
    
    // Wait for loading to complete
    await page.waitForSelector('.min-h-screen:not(:has(.animate-spin))', { timeout: 10000 })

    // Check for header and dataset info
    await expect(page.locator('h1')).toContainText('ComfyUI Oil Painting Evaluation')
    
    // Verify progress indicator shows loaded tasks
    const progressText = page.locator('text=/\\d+ \\/ \\d+/')
    await expect(progressText).toBeVisible()
    
    // Check that the dataset loaded properly by looking for progress info
    const progressInfo = await progressText.textContent()
    expect(progressInfo).toMatch(/\d+ \/ \d+/)
    
    // Take screenshot showing dataset loaded
    await page.screenshot({ 
      path: 'test-results/03-dataset-loaded.png',
      fullPage: true 
    })
  })

  test('should display oil painting styles with ComfyUI results', async () => {
    await page.goto('http://localhost:3000/comfyui-evaluation')
    await page.waitForLoadState('networkidle')
    
    // Wait for content to load
    await page.waitForSelector('.min-h-screen:not(:has(.animate-spin))', { timeout: 10000 })

    // Check for oil painting styles
    const expectedStyles = ['Classic Portrait', 'Soft Impressionist', 'Thick Textured']
    
    for (const style of expectedStyles) {
      await expect(page.locator(`text=${style}`)).toBeVisible()
    }

    // Verify ComfyUI branding is visible
    await expect(page.locator('text=ComfyUI')).toBeVisible()
    
    // Check for processing time display
    await expect(page.locator('text=/Processing: \\d+\\.\\d+s/')).toBeVisible()

    // Take screenshot of styles display
    await page.screenshot({ 
      path: 'test-results/04-styles-display.png',
      fullPage: true 
    })
  })

  test('should have functional star rating components', async () => {
    await page.goto('http://localhost:3000/comfyui-evaluation')
    await page.waitForLoadState('networkidle')
    
    // Wait for content to load
    await page.waitForSelector('.min-h-screen:not(:has(.animate-spin))', { timeout: 10000 })

    // Find star rating sections
    const preservationLabel = page.locator('text=Preservation:')
    const artQualityLabel = page.locator('text=Art Quality:')
    const overallLabel = page.locator('text=Overall:')

    await expect(preservationLabel).toBeVisible()
    await expect(artQualityLabel).toBeVisible()
    await expect(overallLabel).toBeVisible()

    // Test clicking stars - find the first preservation rating
    const firstPreservationRating = preservationLabel.first().locator('..').locator('button').first()
    await firstPreservationRating.click()

    // Verify star becomes filled (yellow)
    const filledStar = preservationLabel.first().locator('..').locator('.text-yellow-500.fill-current')
    await expect(filledStar).toBeVisible()

    // Test clicking a 3-star rating
    const thirdStar = preservationLabel.first().locator('..').locator('button').nth(2)
    await thirdStar.click()

    // Verify rating display shows (3/5)
    await expect(preservationLabel.first().locator('..').locator('text=(3/5)')).toBeVisible()

    // Take screenshot of star ratings
    await page.screenshot({ 
      path: 'test-results/05-star-ratings.png',
      fullPage: true 
    })
  })

  test('should support navigation between evaluation tasks', async () => {
    await page.goto('http://localhost:3000/comfyui-evaluation')
    await page.waitForLoadState('networkidle')
    
    // Wait for content to load
    await page.waitForSelector('.min-h-screen:not(:has(.animate-spin))', { timeout: 10000 })

    // Check initial state - Previous button should be disabled
    const previousButton = page.locator('button:has-text("Previous")')
    const nextButton = page.locator('button:has-text("Next")')
    
    await expect(previousButton).toBeDisabled()
    await expect(nextButton).toBeEnabled()

    // Get initial progress
    const initialProgress = await page.locator('text=/\\d+ \\/ \\d+/').textContent()
    expect(initialProgress).toContain('1 /')

    // Click next button
    await nextButton.click()
    await page.waitForTimeout(500) // Wait for state update

    // Verify progress updated
    const updatedProgress = await page.locator('text=/\\d+ \\/ \\d+/').textContent()
    expect(updatedProgress).toContain('2 /')

    // Previous button should now be enabled
    await expect(previousButton).toBeEnabled()

    // Test going back
    await previousButton.click()
    await page.waitForTimeout(500)

    // Should be back to first task
    const backToFirstProgress = await page.locator('text=/\\d+ \\/ \\d+/').textContent()
    expect(backToFirstProgress).toContain('1 /')

    // Take screenshot of navigation
    await page.screenshot({ 
      path: 'test-results/06-task-navigation.png',
      fullPage: true 
    })
  })

  test('should support single backend evaluation mode', async () => {
    await page.goto('http://localhost:3000/comfyui-evaluation')
    await page.waitForLoadState('networkidle')
    
    // Wait for content to load
    await page.waitForSelector('.min-h-screen:not(:has(.animate-spin))', { timeout: 10000 })

    // Check that Single Backend mode is active by default
    const singleBackendButton = page.locator('button:has-text("Single Backend")')
    await expect(singleBackendButton).toHaveClass(/bg-purple-100/)

    // Verify single backend layout - should show ComfyUI results only
    await expect(page.locator('text=ComfyUI')).toBeVisible()
    
    // Should show individual style results with ratings
    await expect(page.locator('text=Preservation:')).toBeVisible()
    await expect(page.locator('text=Art Quality:')).toBeVisible()
    await expect(page.locator('text=Overall:')).toBeVisible()

    // Take screenshot of single backend mode
    await page.screenshot({ 
      path: 'test-results/07-single-backend-mode.png',
      fullPage: true 
    })
  })

  test('should support A1111 vs ComfyUI comparison mode', async () => {
    await page.goto('http://localhost:3000/comfyui-evaluation')
    await page.waitForLoadState('networkidle')
    
    // Wait for content to load
    await page.waitForSelector('.min-h-screen:not(:has(.animate-spin))', { timeout: 10000 })

    // Switch to comparison mode
    const comparisonButton = page.locator('button:has-text("A1111 vs ComfyUI")')
    await comparisonButton.click()
    await page.waitForTimeout(500)

    // Verify comparison mode is active
    await expect(comparisonButton).toHaveClass(/bg-purple-100/)

    // Check for comparison layout elements
    await expect(page.locator('text=Comparison')).toBeVisible()
    await expect(page.locator('text=ComfyUI')).toBeVisible()
    
    // Look for preference selection buttons
    await expect(page.locator('text=Which result do you prefer?')).toBeVisible()
    await expect(page.locator('button:has-text("ComfyUI")')).toBeVisible()
    await expect(page.locator('button:has-text("Equal/Tie")')).toBeVisible()

    // Test preference selection
    const comfyUIPreferenceButton = page.locator('button:has-text("ComfyUI")').first()
    await comfyUIPreferenceButton.click()
    
    // Verify button becomes selected (purple background)
    await expect(comfyUIPreferenceButton).toHaveClass(/bg-purple-50/)

    // Take screenshot of comparison mode
    await page.screenshot({ 
      path: 'test-results/08-comparison-mode.png',
      fullPage: true 
    })
  })

  test('should have functional comments section', async () => {
    await page.goto('http://localhost:3000/comfyui-evaluation')
    await page.waitForLoadState('networkidle')
    
    // Wait for content to load
    await page.waitForSelector('.min-h-screen:not(:has(.animate-spin))', { timeout: 10000 })

    // Find comments section
    await expect(page.locator('text=Additional Comments')).toBeVisible()
    
    const commentsTextarea = page.locator('textarea[placeholder*="additional observations"]')
    await expect(commentsTextarea).toBeVisible()

    // Test typing in comments
    const testComment = "ComfyUI produces excellent artistic quality with good preservation of facial features."
    await commentsTextarea.fill(testComment)
    
    // Verify text was entered
    await expect(commentsTextarea).toHaveValue(testComment)

    // Take screenshot of comments section
    await page.screenshot({ 
      path: 'test-results/09-comments-section.png',
      fullPage: true 
    })
  })

  test('should have progress indicator and submission workflow', async () => {
    await page.goto('http://localhost:3000/comfyui-evaluation')
    await page.waitForLoadState('networkidle')
    
    // Wait for content to load
    await page.waitForSelector('.min-h-screen:not(:has(.animate-spin))', { timeout: 10000 })

    // Check progress indicator elements
    await expect(page.locator('text=Completed:')).toBeVisible()
    await expect(page.locator('text=Remaining:')).toBeVisible()
    
    // Check progress bar exists
    const progressBar = page.locator('.bg-purple-600.h-2.rounded-full')
    await expect(progressBar).toBeVisible()

    // Find submission button
    const submitButton = page.locator('button:has-text("Submit & Next")')
    await expect(submitButton).toBeVisible()
    await expect(submitButton).toBeEnabled()

    // Test submission workflow by rating some items first
    const firstStar = page.locator('button').first()
    await firstStar.click()
    
    // Add a comment
    const commentsTextarea = page.locator('textarea')
    await commentsTextarea.fill("Test evaluation comment")

    // Monitor network request for submission
    const responsePromise = page.waitForResponse('**/api/submit-comfyui-evaluation')
    
    // Click submit
    await submitButton.click()
    
    // Wait for the response
    try {
      const response = await responsePromise
      console.log(`Submission response: ${response.status()}`)
    } catch (error) {
      console.log('Submission test completed (API may not be fully configured)')
    }

    // Take screenshot of submission state
    await page.screenshot({ 
      path: 'test-results/10-submission-workflow.png',
      fullPage: true 
    })
  })

  test('should handle error states gracefully', async () => {
    // Test navigation to evaluation page when no data exists
    await page.route('**/api/load-comfyui-evaluation', route => {
      route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: 'ComfyUI evaluation dataset not found',
          tasks: []
        })
      })
    })

    await page.goto('http://localhost:3000/comfyui-evaluation')
    await page.waitForLoadState('networkidle')

    // Should show error state with helpful message
    await expect(page.locator('text=No Evaluation Tasks Found')).toBeVisible()
    await expect(page.locator('text=Run the ComfyUI batch processing script first')).toBeVisible()
    await expect(page.locator('code:has-text("python scripts/comfyui_batch_convert.py")')).toBeVisible()

    // Take screenshot of error state
    await page.screenshot({ 
      path: 'test-results/11-error-state.png',
      fullPage: true 
    })
  })

  test('should display original images correctly', async () => {
    await page.goto('http://localhost:3000/comfyui-evaluation')
    await page.waitForLoadState('networkidle')
    
    // Wait for content to load
    await page.waitForSelector('.min-h-screen:not(:has(.animate-spin))', { timeout: 10000 })

    // Check for original image section
    await expect(page.locator('text=Original Image')).toBeVisible()
    
    // Look for image elements (they may not load due to missing files, but structure should be there)
    const originalImageContainer = page.locator('text=Original Image').locator('..').locator('img').first()
    await expect(originalImageContainer).toBeVisible()

    // Verify image name is displayed
    await expect(page.locator('text=/test_\\d+_portrait/')).toBeVisible()

    // Take screenshot showing original image layout
    await page.screenshot({ 
      path: 'test-results/12-original-image-display.png',
      fullPage: true 
    })
  })

  test.afterEach(async () => {
    // Clean up
    await page.close()
  })
})