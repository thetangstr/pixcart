import { test, expect } from '@playwright/test'

test('Manual verification of ComfyUI evaluation interface', async ({ page }) => {
  // Navigate to the ComfyUI evaluation page
  await page.goto('http://localhost:3000/comfyui-evaluation')
  await page.waitForLoadState('networkidle')
  
  // Wait for loading to complete
  await page.waitForSelector('.min-h-screen:not(:has(.animate-spin))', { timeout: 15000 })
  
  // Take full page screenshot
  await page.screenshot({ 
    path: 'test-results/comfyui-evaluation-full-interface.png',
    fullPage: true 
  })
  
  // Test basic functionality
  console.log('Testing ComfyUI Evaluation Interface...')
  
  // Check for main header
  const header = await page.locator('h1').textContent()
  console.log('Page header:', header)
  
  // Check progress indicator
  const progress = await page.locator('text=/\\d+ \\/ \\d+/').textContent()
  console.log('Progress:', progress)
  
  // Check for evaluation modes
  const singleMode = page.locator('button:has-text("Single Backend")')
  const comparisonMode = page.locator('button:has-text("A1111 vs ComfyUI")')
  
  console.log('Single backend mode visible:', await singleMode.isVisible())
  console.log('Comparison mode visible:', await comparisonMode.isVisible())
  
  // Test star ratings
  const preservationRating = page.locator('text=Preservation:').first()
  if (await preservationRating.isVisible()) {
    const starButton = preservationRating.locator('..').locator('button').first()
    await starButton.click()
    console.log('Successfully clicked star rating')
  }
  
  // Test mode switching
  if (await comparisonMode.isVisible()) {
    await comparisonMode.click()
    await page.waitForTimeout(1000)
    console.log('Switched to comparison mode')
    
    // Take screenshot of comparison mode
    await page.screenshot({ 
      path: 'test-results/comfyui-evaluation-comparison-mode.png',
      fullPage: true 
    })
  }
  
  // Check comments section
  const commentsSection = page.locator('textarea')
  if (await commentsSection.isVisible()) {
    await commentsSection.fill('Test comment for evaluation')
    console.log('Added test comment')
  }
  
  // Final screenshot with interactions
  await page.screenshot({ 
    path: 'test-results/comfyui-evaluation-final-state.png',
    fullPage: true 
  })
  
  console.log('Manual verification complete!')
})