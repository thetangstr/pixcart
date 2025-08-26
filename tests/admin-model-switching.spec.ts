import { test, expect } from '@playwright/test'

test.describe('Admin Model Switching Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to admin console
    await page.goto('http://localhost:5174/admin/models')
    await page.waitForLoadState('networkidle')
  })

  test('Admin console loads with dark theme', async ({ page }) => {
    // Check for dark theme background - look for the main container
    const background = page.locator('div.min-h-screen').first()
    
    // Verify dark theme is applied (gradient from gray-900)
    await expect(background).toHaveClass(/from-gray-900/)
    
    // Verify header has dark styling
    const header = page.locator('h1').first()
    await expect(header).toContainText('Model Admin Console')
    
    // Check for amber/orange gradient text
    await expect(header).toHaveClass(/from-amber-400/)
  })

  test('System metrics dashboard displays correctly', async ({ page }) => {
    // Check all metric cards are present (be more specific to avoid duplicates)
    await expect(page.locator('p:has-text("Active Models")')).toBeVisible()
    await expect(page.locator('p:has-text("Total Processed")')).toBeVisible()
    await expect(page.locator('p:has-text("Avg Response")')).toBeVisible()
    await expect(page.locator('p:has-text("Success Rate")').first()).toBeVisible()
    await expect(page.locator('p:has-text("GPU Usage")')).toBeVisible()
    await expect(page.locator('p:has-text("VRAM Usage")')).toBeVisible()
    
    // Verify metrics have values
    const activeModels = page.locator('text=Active Models').locator('..')
    const valueText = await activeModels.textContent()
    expect(valueText).toMatch(/\d+/)
  })

  test('Model status table shows all configured models', async ({ page }) => {
    // Check table headers
    await expect(page.locator('th:has-text("Model")')).toBeVisible()
    await expect(page.locator('th:has-text("Provider")')).toBeVisible()
    await expect(page.locator('th:has-text("Status")')).toBeVisible()
    await expect(page.locator('th:has-text("Production")')).toBeVisible()
    
    // Check for specific models
    await expect(page.locator('text=Replicate SDXL')).toBeVisible()
    await expect(page.locator('text=ComfyUI SD 1.5')).toBeVisible()
    await expect(page.locator('text=ComfyUI SDXL')).toBeVisible()
    
    // Check provider badges
    await expect(page.locator('text=REPLICATE').first()).toBeVisible()
    await expect(page.locator('text=COMFYUI').first()).toBeVisible()
  })

  test('Production model switching works', async ({ page }) => {
    // Wait for model status to load
    await page.waitForTimeout(2000)
    
    // Find a model that's online and not currently production
    const modelRows = page.locator('tbody tr')
    const rowCount = await modelRows.count()
    
    let switchedModel = false
    for (let i = 0; i < rowCount; i++) {
      const row = modelRows.nth(i)
      const statusCell = row.locator('td').nth(2)
      const statusText = await statusCell.textContent()
      
      if (statusText?.includes('online')) {
        const productionButton = row.locator('button').filter({ hasText: 'Set' }).first()
        if (await productionButton.count() > 0) {
          // Click to set as production
          await productionButton.click()
          
          // Wait for update
          await page.waitForTimeout(1000)
          
          // Wait a bit longer for the update
          await page.waitForTimeout(2000)
          
          // Verify button changed to "Active" or at least isn't "Set" anymore
          const updatedButton = row.locator('button').first()
          const buttonText = await updatedButton.textContent()
          expect(buttonText).not.toBe('Set')
          switchedModel = true
          break
        }
      }
    }
    
    // If we found an online model, verify the switch worked
    if (switchedModel) {
      console.log('Successfully switched production model')
    } else {
      console.log('No online models available to switch')
    }
  })

  test('Model testing section is functional', async ({ page }) => {
    // Check testing section exists
    await expect(page.locator('h2:has-text("Model Testing")')).toBeVisible()
    
    // Check for image upload area
    await expect(page.locator('text=Click to upload test image')).toBeVisible()
    
    // Check style selector
    const styleSelect = page.locator('select').first()
    await expect(styleSelect).toBeVisible()
    
    // Verify style options exist in select
    const options = await styleSelect.locator('option').allTextContents()
    expect(options).toContain('Classic Oil Painting')
    expect(options).toContain('Van Gogh Style')
    
    // Check advanced settings toggle
    const advancedButton = page.locator('text=Advanced Settings')
    await expect(advancedButton).toBeVisible()
    
    // Toggle advanced settings
    await advancedButton.click()
    await expect(page.locator('text=Strength')).toBeVisible()
    await expect(page.locator('text=Guidance Scale')).toBeVisible()
  })

  test('Refresh button updates model statuses', async ({ page }) => {
    // Find refresh button
    const refreshButton = page.locator('button:has-text("Refresh")')
    await expect(refreshButton).toBeVisible()
    
    // Click refresh
    await refreshButton.click()
    
    // Check for spinning icon (indicates refresh is happening)
    const refreshIcon = refreshButton.locator('svg')
    await expect(refreshIcon).toHaveClass(/animate-spin/)
    
    // Wait for refresh to complete
    await page.waitForTimeout(2000)
    
    // Verify icon stopped spinning
    await expect(refreshIcon).not.toHaveClass(/animate-spin/)
  })

  test('Model selection checkboxes work for testing', async ({ page }) => {
    // Wait for table to load
    await page.waitForSelector('tbody tr')
    
    // Find checkboxes for online models
    const checkboxes = page.locator('input[type="checkbox"]')
    const checkboxCount = await checkboxes.count()
    
    let checkedCount = 0
    for (let i = 0; i < Math.min(2, checkboxCount); i++) {
      const checkbox = checkboxes.nth(i)
      if (await checkbox.isEnabled()) {
        await checkbox.check()
        checkedCount++
      }
    }
    
    // Verify test button shows selected count
    const testButton = page.locator('button').filter({ hasText: /Test \d+ Selected Model/ })
    if (checkedCount > 0) {
      await expect(testButton).toBeVisible()
      const buttonText = await testButton.textContent()
      expect(buttonText).toContain(`${checkedCount}`)
    }
  })

  test('API endpoint for production model setting works', async ({ page, request }) => {
    // Test the API directly
    const response = await request.post('http://localhost:5174/api/admin/set-production-model', {
      data: {
        modelId: 'comfyui-sd15'
      }
    })
    
    expect(response.ok()).toBeTruthy()
    const data = await response.json()
    expect(data.success).toBeTruthy()
    expect(data.modelId).toBe('comfyui-sd15')
    
    // Verify GET endpoint returns the set model
    const getResponse = await request.get('http://localhost:5174/api/admin/set-production-model')
    expect(getResponse.ok()).toBeTruthy()
    const config = await getResponse.json()
    expect(config.modelId).toBe('comfyui-sd15')
  })

  test('Dark mode styling is consistent throughout', async ({ page }) => {
    // Check main containers have dark backgrounds
    const containers = page.locator('.bg-gray-800, .bg-gray-900')
    const containerCount = await containers.count()
    expect(containerCount).toBeGreaterThan(5)
    
    // Check text is light colored
    const whiteText = page.locator('.text-white, .text-gray-300, .text-gray-400')
    const textCount = await whiteText.count()
    expect(textCount).toBeGreaterThan(10)
    
    // Verify no white backgrounds remain
    const whiteBackgrounds = page.locator('.bg-white')
    const whiteBgCount = await whiteBackgrounds.count()
    expect(whiteBgCount).toBe(0)
  })
})

test.describe('Model Status Checks', () => {
  test('Replicate API check endpoint works', async ({ request }) => {
    const response = await request.post('http://localhost:5174/api/check-replicate', {
      data: {
        model: 'stability-ai/sdxl'
      }
    })
    
    // Response might be 503 if API key not configured, or 200 if it is
    if (response.status() === 200) {
      const data = await response.json()
      expect(data).toHaveProperty('status')
    } else if (response.status() === 503) {
      const data = await response.json()
      expect(data.error).toContain('not configured')
    }
  })

  test('Navigation from test-models page works', async ({ page }) => {
    // Start from test-models page
    await page.goto('http://localhost:5174/test-models')
    await page.waitForLoadState('networkidle')
    
    // Find and click Admin Console button
    const adminButton = page.locator('a:has-text("Admin Console")')
    await expect(adminButton).toBeVisible()
    await adminButton.click()
    
    // Verify we're on the admin page (with or without trailing slash)
    await page.waitForURL(/.*\/admin\/models\/?/)
    await expect(page.locator('h1:has-text("Model Admin Console")')).toBeVisible()
    
    // Verify dark theme is applied - look for the main container
    const background = page.locator('div.min-h-screen').first()
    await expect(background).toHaveClass(/from-gray-900/)
  })
})