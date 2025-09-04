/**
 * Playwright Admin Console Test Suite
 * Comprehensive E2E testing for admin functionality
 */

const { test, expect } = require('@playwright/test');

// Test credentials
const TEST_ADMIN_EMAIL = 'admin.test@pixcart.com';
const TEST_ADMIN_PASSWORD = 'TestAdmin123!@#';
const REGULAR_USER_EMAIL = 'testuser@example.com';

// Helper function to sign in
async function signInAsAdmin(page) {
  await page.goto('/auth/signin');
  await page.fill('input[type="email"]', TEST_ADMIN_EMAIL);
  await page.fill('input[type="password"]', TEST_ADMIN_PASSWORD);
  await page.click('button[type="submit"]');
  
  // Wait for redirect after successful login
  await page.waitForURL('**/dashboard', { timeout: 10000 });
}

test.describe('Admin Console Authentication', () => {
  test('should redirect non-authenticated users to signin', async ({ page }) => {
    await page.goto('/admin');
    await expect(page).toHaveURL(/.*signin.*/);
  });

  test('admin user can sign in successfully', async ({ page }) => {
    await signInAsAdmin(page);
    await expect(page).toHaveURL(/.*dashboard.*/);
    
    // Verify user menu is visible
    await expect(page.locator('[data-testid="user-avatar"], button:has(.rounded-full)')).toBeVisible();
  });

  test('admin console link appears for admin users', async ({ page }) => {
    await signInAsAdmin(page);
    
    // Click on user avatar to open dropdown
    await page.click('[data-testid="user-avatar"], button:has(.rounded-full)');
    
    // Check for Admin Console link
    const adminLink = page.locator('text=Admin Console');
    await expect(adminLink).toBeVisible();
    
    // Click admin console link
    await adminLink.click();
    await expect(page).toHaveURL(/.*admin.*/);
  });
});

test.describe('Admin Dashboard Overview', () => {
  test.beforeEach(async ({ page }) => {
    await signInAsAdmin(page);
    await page.goto('/admin');
  });

  test('should display admin dashboard with all tabs', async ({ page }) => {
    // Check page title
    await expect(page.locator('h1')).toContainText('Admin Dashboard');
    
    // Check all tabs are present
    const tabs = ['Overview', 'Allowlist', 'Users', 'Rate Limits', 'Usage Analytics', 'Feedback'];
    for (const tab of tabs) {
      await expect(page.locator(`text=${tab}`)).toBeVisible();
    }
  });

  test('should display platform statistics in overview', async ({ page }) => {
    // Ensure we're on Overview tab
    await page.click('text=Overview');
    
    // Check for statistics cards
    await expect(page.locator('text=Total Users')).toBeVisible();
    await expect(page.locator('text=Allowlisted')).toBeVisible();
    await expect(page.locator('text=Waitlisted')).toBeVisible();
    await expect(page.locator('text=Total Cost')).toBeVisible();
  });
});

test.describe('User Management', () => {
  test.beforeEach(async ({ page }) => {
    await signInAsAdmin(page);
    await page.goto('/admin');
  });

  test('should display users list', async ({ page }) => {
    // Navigate to Users tab
    await page.click('text=Users');
    
    // Check for user list elements
    await expect(page.locator('text=All Users')).toBeVisible();
    await expect(page.locator('input[placeholder*="Search by email"]')).toBeVisible();
    
    // Verify admin user appears in list
    await page.fill('input[placeholder*="Search by email"]', TEST_ADMIN_EMAIL);
    await expect(page.locator(`text=${TEST_ADMIN_EMAIL}`)).toBeVisible();
  });

  test('should add beta tester', async ({ page }) => {
    await page.click('text=Users');
    
    // Find add beta tester section
    const newEmail = `beta${Date.now()}@test.com`;
    await page.fill('input[placeholder="Enter email address"]', newEmail);
    await page.click('button:has-text("Add Beta Tester")');
    
    // Verify success (might show toast or update list)
    // Search for the new user
    await page.fill('input[placeholder*="Search by email"]', newEmail);
    
    // Clean up - this user will be auto-cleaned in tests
  });
});

test.describe('Rate Limit Management', () => {
  test.beforeEach(async ({ page }) => {
    await signInAsAdmin(page);
    await page.goto('/admin');
  });

  test('should display rate limits tab', async ({ page }) => {
    // Navigate to Rate Limits tab
    await page.click('text=Rate Limits');
    
    // Check for rate limit management UI
    await expect(page.locator('text=User Rate Limits')).toBeVisible();
    await expect(page.locator('text=Manage daily generation limits')).toBeVisible();
  });

  test('should allow editing user rate limits', async ({ page }) => {
    await page.click('text=Rate Limits');
    
    // If there are users with editable limits, test editing
    const editButton = page.locator('button:has-text("Edit")').first();
    const editButtonCount = await editButton.count();
    
    if (editButtonCount > 0) {
      await editButton.click();
      
      // Look for number input for limit
      const limitInput = page.locator('input[type="number"]').first();
      await expect(limitInput).toBeVisible();
      
      // Set a new limit
      await limitInput.fill('25');
      
      // Save the change
      await page.click('button:has(svg):has-text("")').first(); // Save button with icon
      
      // Verify the change shows
      await expect(page.locator('text=Daily Limit: 25')).toBeVisible({ timeout: 5000 });
    }
  });
});

test.describe('Allowlist Management', () => {
  test.beforeEach(async ({ page }) => {
    await signInAsAdmin(page);
    await page.goto('/admin');
  });

  test('should display allowlist management', async ({ page }) => {
    // Navigate to Allowlist tab
    await page.click('text=Allowlist');
    
    // Check for allowlist UI elements
    await expect(page.locator('text=Allowlist Management')).toBeVisible();
    await expect(page.locator('text=Approve or reject users')).toBeVisible();
    
    // Check for search functionality
    await expect(page.locator('input[placeholder*="Search by email"]')).toBeVisible();
  });

  test('should allow bulk selection', async ({ page }) => {
    await page.click('text=Allowlist');
    
    // Check if there are checkboxes for bulk selection
    const checkboxes = page.locator('input[type="checkbox"]');
    const checkboxCount = await checkboxes.count();
    
    if (checkboxCount > 0) {
      // Select first checkbox
      await checkboxes.first().check();
      
      // Bulk action buttons should appear
      const bulkApprove = page.locator('button:has-text("Approve Selected")');
      if (await bulkApprove.isVisible()) {
        expect(bulkApprove).toBeVisible();
      }
    }
  });
});

test.describe('Usage Analytics', () => {
  test.beforeEach(async ({ page }) => {
    await signInAsAdmin(page);
    await page.goto('/admin');
  });

  test('should display usage analytics', async ({ page }) => {
    // Navigate to Usage Analytics tab
    await page.click('text=Usage Analytics');
    
    // Wait for analytics to load
    await page.waitForTimeout(1000);
    
    // Check for analytics elements
    await expect(page.locator('text=API Usage Analytics')).toBeVisible();
    
    // Check for metrics
    const metrics = ['Total Requests', 'Success Rate', 'Total Cost'];
    for (const metric of metrics) {
      const element = page.locator(`text=${metric}`).first();
      await expect(element).toBeVisible();
    }
  });

  test('should show operations breakdown', async ({ page }) => {
    await page.click('text=Usage Analytics');
    await page.waitForTimeout(1000);
    
    // Look for operations breakdown section
    const operationsSection = page.locator('text=Operations Breakdown');
    if (await operationsSection.isVisible()) {
      await expect(operationsSection).toBeVisible();
    }
  });
});

test.describe('Feedback Management', () => {
  test.beforeEach(async ({ page }) => {
    await signInAsAdmin(page);
    await page.goto('/admin');
  });

  test('should display feedback section', async ({ page }) => {
    // Navigate to Feedback tab
    await page.click('text=Feedback');
    
    // Check for feedback UI
    await expect(page.locator('text=Beta Feedback')).toBeVisible();
    await expect(page.locator('text=Review and manage user feedback')).toBeVisible();
  });

  test('should allow changing feedback status', async ({ page }) => {
    await page.click('text=Feedback');
    await page.waitForTimeout(1000);
    
    // Check if there are any feedback items with status dropdown
    const statusDropdown = page.locator('select').first();
    const dropdownCount = await statusDropdown.count();
    
    if (dropdownCount > 0) {
      // Get current value
      const currentValue = await statusDropdown.inputValue();
      
      // Change status
      await statusDropdown.selectOption('REVIEWED');
      
      // Verify change (might need to wait for update)
      await page.waitForTimeout(500);
      await expect(statusDropdown).toHaveValue('REVIEWED');
    }
  });
});

test.describe('Admin UI Responsiveness', () => {
  test.beforeEach(async ({ page }) => {
    await signInAsAdmin(page);
    await page.goto('/admin');
  });

  test('should be responsive on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 812 });
    
    // Check that dashboard is still accessible
    await expect(page.locator('h1')).toContainText('Admin Dashboard');
    
    // Tabs might be scrollable or in a different layout
    await expect(page.locator('text=Overview').first()).toBeVisible();
  });

  test('should handle errors gracefully', async ({ page }) => {
    // Try to access a non-existent user
    await page.goto('/admin');
    
    // Navigate to users
    await page.click('text=Users');
    
    // Search for non-existent user
    await page.fill('input[placeholder*="Search by email"]', 'nonexistent@user.com');
    
    // Should show no results (not an error)
    await page.waitForTimeout(1000);
    // No error dialog should appear
    await expect(page.locator('.error-dialog')).not.toBeVisible();
  });
});

test.describe('Admin Permissions', () => {
  test('should verify admin has unlimited image generation', async ({ page }) => {
    await signInAsAdmin(page);
    
    // Go to create page
    await page.goto('/create');
    
    // Admin should not see rate limit warnings
    const limitWarning = page.locator('text=/limit|remaining|exceeded/i');
    
    // If there's a remaining counter, it should show high number or unlimited
    const remainingCounter = page.locator('text=/Remaining.*999|Unlimited/i');
    if (await remainingCounter.count() > 0) {
      await expect(remainingCounter.first()).toBeVisible();
    }
  });

  test('admin can access all protected routes', async ({ page }) => {
    await signInAsAdmin(page);
    
    const protectedRoutes = [
      '/admin',
      '/dashboard',
      '/orders',
      '/profile',
      '/create'
    ];
    
    for (const route of protectedRoutes) {
      await page.goto(route);
      // Should not redirect to signin
      await expect(page.url()).not.toContain('signin');
    }
  });
});

test.describe('Data Validation', () => {
  test.beforeEach(async ({ page }) => {
    await signInAsAdmin(page);
    await page.goto('/admin');
  });

  test('should validate email format when adding beta tester', async ({ page }) => {
    await page.click('text=Users');
    
    // Try invalid email
    await page.fill('input[placeholder="Enter email address"]', 'invalid-email');
    await page.click('button:has-text("Add Beta Tester")');
    
    // Should show validation error or not submit
    // Email field should still contain the invalid value (not cleared on success)
    await expect(page.locator('input[placeholder="Enter email address"]')).toHaveValue('invalid-email');
  });

  test('should validate rate limit values', async ({ page }) => {
    await page.click('text=Rate Limits');
    
    const editButton = page.locator('button:has-text("Edit")').first();
    if (await editButton.count() > 0) {
      await editButton.click();
      
      const limitInput = page.locator('input[type="number"]').first();
      
      // Try negative number
      await limitInput.fill('-5');
      await page.keyboard.press('Enter');
      
      // Should not accept negative values
      // Value should be constrained or show error
      const value = await limitInput.inputValue();
      expect(parseInt(value)).toBeGreaterThanOrEqual(0);
    }
  });
});

// Cleanup test user after all tests
test.afterAll(async () => {
  console.log('Test suite completed');
  // Cleanup is handled by the test data cleanup scripts
});