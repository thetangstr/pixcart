import { test, expect, Page, APIRequestContext } from '@playwright/test';

// Test configuration
const BASE_URL = 'http://localhost:3000';
const TEST_BETA_TESTER_EMAIL = 'thetangstr@gmail.com';

test.describe('Beta Tester Feedback Feature - Comprehensive Testing', () => {
  let consoleErrors: string[] = [];
  let networkErrors: string[] = [];
  let apiContext: APIRequestContext;

  // Global error monitoring setup
  test.beforeEach(async ({ page, request }) => {
    consoleErrors = [];
    networkErrors = [];
    apiContext = request;
    
    // Monitor console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(`[${new Date().toISOString()}] ${msg.text()}`);
      }
    });

    // Monitor network failures  
    page.on('response', response => {
      if (response.status() >= 400) {
        networkErrors.push(`${response.status()} - ${response.url()}`);
      }
    });

    // Clear any previous errors
    await page.addInitScript(() => {
      console.clear();
    });
  });

  test.afterEach(async ({ page }) => {
    // Report any errors found during the test
    if (consoleErrors.length > 0) {
      console.log('Console Errors:', consoleErrors);
    }
    if (networkErrors.length > 0) {
      console.log('Network Errors:', networkErrors);
    }
    
    // Take screenshot on failure
    if (test.info().status === 'failed') {
      await page.screenshot({ 
        path: `test-results/beta-feedback-failure-${Date.now()}.png`,
        fullPage: true 
      });
    }
  });

  // Helper function to simulate authenticated beta tester session
  async function setupBetaTesterSession(page: Page) {
    // Mock the NextAuth session to simulate authenticated beta tester
    await page.addInitScript(() => {
      // Mock window.__NEXT_DATA__ if it exists
      if (typeof window !== 'undefined') {
        (window as any).__NEXT_DATA__ = {
          props: {
            pageProps: {
              session: {
                user: {
                  id: 'test-user-id',
                  email: 'thetangstr@gmail.com',
                  name: 'Test Beta User',
                  isAdmin: true,
                  isBetaTester: true
                }
              }
            }
          }
        };
      }
    });

    // Mock the fetch API for session calls
    await page.route('**/api/auth/session', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: {
            id: 'test-user-id',
            email: 'thetangstr@gmail.com',
            name: 'Test Beta User',
            isAdmin: true,
            isBetaTester: true
          }
        })
      });
    });

    // Mock the NextAuth client-side session state
    await page.evaluate(() => {
      // Mock the next-auth session provider
      if (typeof window !== 'undefined') {
        (window as any).next = {
          auth: {
            session: {
              user: {
                id: 'test-user-id',
                email: 'thetangstr@gmail.com',
                name: 'Test Beta User',
                isAdmin: true,
                isBetaTester: true
              }
            }
          }
        };
      }
    });
  }

  test('should mark user as beta tester and verify session setup', async ({ page }) => {
    console.log('Setting up test environment...');
    
    // Set up session first
    await setupBetaTesterSession(page);
    
    await page.goto(BASE_URL);
    await page.waitForTimeout(2000);
    
    console.log('Test setup complete - simulated beta tester session');
  });

  test('should display feedback button for beta testers', async ({ page }) => {
    // Set up beta tester session first
    await setupBetaTesterSession(page);
    
    // Navigate to main page
    await page.goto(BASE_URL);
    await page.waitForTimeout(3000); // Give time for React components to render
    
    // Look for the feedback button (floating button in bottom right)
    const floatingFeedbackButton = page.locator('button.fixed.bottom-6.right-6');
    
    // Wait for the feedback button to appear and be visible
    try {
      await expect(floatingFeedbackButton).toBeVisible({ timeout: 10000 });
      console.log('Successfully found floating feedback button');
      
      // Verify the button has the correct styling and icon
      const buttonClass = await floatingFeedbackButton.getAttribute('class');
      expect(buttonClass).toContain('bg-orange-500');
      console.log('Feedback button has correct styling');
      
    } catch (error) {
      // Take a screenshot for debugging
      await page.screenshot({ path: 'test-results/feedback-button-missing.png', fullPage: true });
      
      // Log the current page content for debugging
      const bodyContent = await page.locator('body').innerHTML();
      console.log('Page content:', bodyContent.substring(0, 500) + '...');
      
      throw new Error('Feedback button is not visible. User may not be recognized as a beta tester.');
    }
  });

  test('should open feedback modal when feedback button is clicked', async ({ page }) => {
    // Set up beta tester session
    await setupBetaTesterSession(page);
    
    await page.goto(BASE_URL);
    await page.waitForTimeout(3000);
    
    // Find and click the feedback button
    const feedbackButton = page.locator('button.fixed.bottom-6.right-6');
    await expect(feedbackButton).toBeVisible({ timeout: 10000 });
    
    await feedbackButton.click();
    
    // Wait for modal to appear
    const modal = page.locator('div.fixed.inset-0.bg-black.bg-opacity-50');
    await expect(modal).toBeVisible({ timeout: 5000 });
    
    // Check modal content
    await expect(page.locator('text="Send Beta Feedback"')).toBeVisible();
    await expect(page.locator('label:has-text("Type")')).toBeVisible();
    await expect(page.locator('label:has-text("Title")')).toBeVisible();
    await expect(page.locator('label:has-text("Description")')).toBeVisible();
    
    // Check form elements
    await expect(page.locator('select')).toBeVisible();
    await expect(page.locator('input[type="text"]')).toBeVisible();
    await expect(page.locator('textarea')).toBeVisible();
    await expect(page.locator('button:has-text("Submit Feedback")')).toBeVisible();
    
    console.log('Feedback modal opened successfully with all expected elements');
  });

  test('should validate required fields in feedback form', async ({ page }) => {
    // Set up beta tester session
    await setupBetaTesterSession(page);
    
    await page.goto(BASE_URL);
    await page.waitForTimeout(3000);
    
    // Open feedback modal
    const feedbackButton = page.locator('button.fixed.bottom-6.right-6');
    await feedbackButton.click();
    
    // Wait for modal
    await expect(page.locator('text="Send Beta Feedback"')).toBeVisible();
    
    // Try to submit empty form
    const submitButton = page.locator('button:has-text("Submit Feedback")');
    await submitButton.click();
    
    // Check for HTML5 validation messages or custom validation
    const titleInput = page.locator('input[type="text"]');
    const isInvalid = await titleInput.evaluate((input: HTMLInputElement) => {
      return !input.validity.valid;
    });
    
    expect(isInvalid).toBe(true);
    console.log('Form validation working - empty title field is invalid');
  });

  test('should successfully submit feedback with valid data', async ({ page }) => {
    // Set up beta tester session
    await setupBetaTesterSession(page);
    
    // Mock the feedback API endpoint to return success
    await page.route('**/api/feedback', (route) => {
      if (route.request().method() === 'POST') {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ 
            id: 'test-feedback-id',
            message: 'Feedback submitted successfully' 
          })
        });
      } else {
        route.continue();
      }
    });
    
    await page.goto(BASE_URL);
    await page.waitForTimeout(3000);
    
    // Open feedback modal
    const feedbackButton = page.locator('button.fixed.bottom-6.right-6');
    await feedbackButton.click();
    
    await expect(page.locator('text="Send Beta Feedback"')).toBeVisible();
    
    // Fill out the form with test data
    await page.selectOption('select', 'improvement');
    await page.fill('input[type="text"]', 'Test Feedback Title - Automated Test');
    await page.fill('textarea', 'This is a comprehensive test of the feedback submission system. Testing automated form submission with valid data.');
    
    // Setup response monitoring
    const responsePromise = page.waitForResponse(response => 
      response.url().includes('/api/feedback') && response.request().method() === 'POST'
    );
    
    // Submit the form
    const submitButton = page.locator('button:has-text("Submit Feedback")');
    await submitButton.click();
    
    // Wait for the API response
    const response = await responsePromise;
    
    // Check response status
    expect(response.status()).toBe(200);
    console.log('Feedback submitted successfully');
    
    // Check for success message
    await expect(page.locator('text="Thank you for your feedback!"')).toBeVisible({ timeout: 10000 });
    
    // Verify form closes after success
    await expect(page.locator('text="Send Beta Feedback"')).not.toBeVisible({ timeout: 5000 });
  });

  test('should handle different feedback types correctly', async ({ page }) => {
    // Set up beta tester session
    await setupBetaTesterSession(page);
    
    // Mock the feedback API
    await page.route('**/api/feedback', (route) => {
      if (route.request().method() === 'POST') {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ 
            id: 'test-feedback-id',
            message: 'Feedback submitted successfully' 
          })
        });
      } else {
        route.continue();
      }
    });
    
    await page.goto(BASE_URL);
    await page.waitForTimeout(3000);
    
    const feedbackTypes = ['bug', 'feature', 'improvement', 'other'];
    
    for (const feedbackType of feedbackTypes) {
      console.log(`Testing feedback type: ${feedbackType}`);
      
      // Open feedback modal
      const feedbackButton = page.locator('button.fixed.bottom-6.right-6');
      await feedbackButton.click();
      
      await expect(page.locator('text="Send Beta Feedback"')).toBeVisible();
      
      // Fill form with specific type
      await page.selectOption('select', feedbackType);
      await page.fill('input[type="text"]', `Test ${feedbackType} feedback`);
      await page.fill('textarea', `Testing ${feedbackType} feedback submission functionality.`);
      
      // Submit form
      const responsePromise = page.waitForResponse(response => 
        response.url().includes('/api/feedback') && response.request().method() === 'POST'
      );
      
      await page.locator('button:has-text("Submit Feedback")').click();
      
      const response = await responsePromise;
      expect(response.status()).toBe(200);
      
      // Verify the request payload contains correct type
      const requestData = response.request().postDataJSON();
      expect(requestData.type).toBe(feedbackType);
      
      // Wait for success and modal close
      await expect(page.locator('text="Thank you for your feedback!"')).toBeVisible({ timeout: 10000 });
      await expect(page.locator('text="Send Beta Feedback"')).not.toBeVisible({ timeout: 5000 });
      
      console.log(`Successfully submitted ${feedbackType} feedback`);
      
      // Small delay between tests
      await page.waitForTimeout(1000);
    }
  });

  test('should close modal when X button is clicked', async ({ page }) => {
    // Set up beta tester session
    await setupBetaTesterSession(page);
    
    await page.goto(BASE_URL);
    await page.waitForTimeout(3000);
    
    // Open feedback modal
    const feedbackButton = page.locator('button.fixed.bottom-6.right-6');
    await feedbackButton.click();
    
    await expect(page.locator('text="Send Beta Feedback"')).toBeVisible();
    
    // Click the X button to close (look for the specific close button)
    const closeButton = page.locator('button.text-gray-500');
    await closeButton.click();
    
    // Verify modal is closed
    await expect(page.locator('text="Send Beta Feedback"')).not.toBeVisible();
    
    console.log('Successfully closed feedback modal using X button');
  });

  test('should not show feedback button for non-beta testers', async ({ page, context }) => {
    // Clear any existing authentication and don't set up beta tester session
    await context.clearCookies();
    
    // Mock empty session (no beta tester status)
    await page.route('**/api/auth/session', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({})
      });
    });
    
    await page.goto(BASE_URL);
    await page.waitForTimeout(3000);
    
    // Feedback button should not be visible for unauthenticated users
    const feedbackButton = page.locator('button.fixed.bottom-6.right-6');
    await expect(feedbackButton).not.toBeVisible();
    
    console.log('Correctly hiding feedback button for non-authenticated users');
  });

  test('should handle network errors gracefully', async ({ page }) => {
    // Set up beta tester session
    await setupBetaTesterSession(page);
    
    await page.goto(BASE_URL);
    await page.waitForTimeout(3000);
    
    // Open feedback modal
    const feedbackButton = page.locator('button.fixed.bottom-6.right-6');
    await feedbackButton.click();
    
    await expect(page.locator('text="Send Beta Feedback"')).toBeVisible();
    
    // Intercept the feedback API call and make it fail
    await page.route('**/api/feedback', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Server Error' })
      });
    });
    
    // Fill and submit form
    await page.selectOption('select', 'bug');
    await page.fill('input[type="text"]', 'Test Network Error');
    await page.fill('textarea', 'Testing network error handling');
    
    await page.locator('button:has-text("Submit Feedback")').click();
    
    // Check for error message
    await expect(page.locator('text="Failed to submit feedback. Please try again."')).toBeVisible({ timeout: 10000 });
    
    console.log('Successfully handled network error with user-friendly message');
  });
});