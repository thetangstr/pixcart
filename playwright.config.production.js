// playwright.config.production.js
const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests/production',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 2, // Retry failed tests for network issues
  workers: 1,
  reporter: [
    ['html', { outputFolder: 'test-results/production-report' }],
    ['json', { outputFile: 'test-results/production-results.json' }],
    ['list']
  ],
  use: {
    baseURL: 'https://oil-painting-app.vercel.app',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,
    // Increase timeouts for production testing
    actionTimeout: 30000,
    navigationTimeout: 30000,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // Uncomment to test on additional browsers
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },
  ],

  // No webServer needed for production testing
});