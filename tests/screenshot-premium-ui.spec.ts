import { test } from '@playwright/test'

test('capture premium UI screenshot', async ({ page }) => {
  await page.goto('http://localhost:3000/upload')
  await page.waitForSelector('text=Choose Your Artistic Style', { timeout: 5000 })
  
  // Take a screenshot of the style selector
  await page.screenshot({ 
    path: 'test-results/premium-ui-styles.png',
    fullPage: false
  })
  
  console.log('Screenshot saved to test-results/premium-ui-styles.png')
})