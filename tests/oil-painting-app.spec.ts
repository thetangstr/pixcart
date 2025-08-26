import { test, expect, Page } from '@playwright/test';
import path from 'path';

// Test configuration
const BASE_URL = 'http://localhost:3000';

test.describe('Oil Painting App - Comprehensive E2E Tests', () => {
  
  test.beforeEach(async ({ page }) => {
    // Navigate to homepage before each test
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
  });

  test.describe('Homepage Visual Design Tests', () => {
    
    test('should display beautiful homepage with amber/orange gradients', async ({ page }) => {
      // Test page title
      await expect(page).toHaveTitle(/Oil Painting Converter/);
      
      // Take full page screenshot
      await page.screenshot({ path: 'test-results/homepage-full.png', fullPage: true });
      
      // Verify main headline
      const headline = page.locator('h1');
      await expect(headline).toBeVisible();
      await expect(headline).toContainText('Turn Your Photos Into');
      await expect(headline).toContainText('Beautiful Oil Paintings');
      
      // Verify gradient text styling
      const gradientText = page.locator('.bg-gradient-to-r.from-amber-500.to-orange-600.bg-clip-text.text-transparent');
      await expect(gradientText).toBeVisible();
      
      // Verify badge
      const badge = page.locator('text=Transform Photos into Masterpieces');
      await expect(badge).toBeVisible();
      
      // Verify subtitle
      const subtitle = page.locator('text=Experience the magic of AI-powered art transformation');
      await expect(subtitle).toBeVisible();
      
      // Verify CTA buttons
      const startCreatingBtn = page.locator('text=Start Creating');
      const viewGalleryBtn = page.locator('text=View Gallery');
      
      await expect(startCreatingBtn).toBeVisible();
      await expect(viewGalleryBtn).toBeVisible();
      
      // Verify button gradients
      await expect(startCreatingBtn).toHaveClass(/bg-gradient-to-r.*from-amber-500.*to-orange-600/);
    });

    test('should display features section with proper styling', async ({ page }) => {
      // Verify features section
      const featuresSection = page.locator('text=Why Choose Our Oil Painting Converter?');
      await expect(featuresSection).toBeVisible();
      
      // Verify feature cards
      const features = [
        'Lightning Fast',
        'Secure & Private', 
        'Museum Quality'
      ];
      
      for (const feature of features) {
        await expect(page.locator(`text=${feature}`)).toBeVisible();
      }
      
      // Take screenshot of features section
      const featuresContainer = page.locator('section:has-text("Why Choose Our Oil Painting Converter?")');
      await featuresContainer.screenshot({ path: 'test-results/features-section.png' });
    });

    test('should display how it works section', async ({ page }) => {
      // Verify "How it works" section
      const howItWorksSection = page.locator('text=Transform Your Photos in 3 Simple Steps');
      await expect(howItWorksSection).toBeVisible();
      
      // Verify steps
      const steps = [
        'Upload Your Photo',
        'AI Magic Happens',
        'Download & Enjoy'
      ];
      
      for (const step of steps) {
        await expect(page.locator(`text=${step}`)).toBeVisible();
      }
      
      // Take screenshot of steps section
      const stepsContainer = page.locator('section:has-text("Transform Your Photos in 3 Simple Steps")');
      await stepsContainer.screenshot({ path: 'test-results/steps-section.png' });
    });

    test('should have final CTA section with proper gradient', async ({ page }) => {
      // Verify final CTA section
      const ctaSection = page.locator('text=Ready to Create Your Masterpiece?');
      await expect(ctaSection).toBeVisible();
      
      // Verify the section has proper gradient background
      const gradientSection = page.locator('section.bg-gradient-to-r.from-amber-500.to-orange-600');
      await expect(gradientSection).toBeVisible();
      
      // Take screenshot of CTA section
      await gradientSection.screenshot({ path: 'test-results/cta-section.png' });
    });
  });

  test.describe('Navigation Tests', () => {
    
    test('should navigate between all pages correctly', async ({ page }) => {
      // Test navigation header
      const navigation = page.locator('nav');
      await expect(navigation).toBeVisible();
      
      // Verify logo
      const logo = page.locator('text=Oil Painter');
      await expect(logo).toBeVisible();
      
      // Test navigation to Upload page
      await page.click('text=Convert');
      await page.waitForURL('**/upload');
      await page.waitForLoadState('networkidle');
      
      // Verify upload page loaded
      await expect(page.locator('text=Transform Your Photos')).toBeVisible();
      await page.screenshot({ path: 'test-results/upload-page.png', fullPage: true });
      
      // Test navigation to Gallery page
      await page.click('text=Gallery');
      await page.waitForURL('**/gallery');
      await page.waitForLoadState('networkidle');
      
      // Verify gallery page loaded
      await expect(page.locator('text=Oil Painting Gallery')).toBeVisible();
      await page.screenshot({ path: 'test-results/gallery-page.png', fullPage: true });
      
      // Test navigation back to Home
      await page.click('text=Home');
      await page.waitForURL(BASE_URL);
      await page.waitForLoadState('networkidle');
      
      // Verify back on homepage
      await expect(page.locator('text=Turn Your Photos Into')).toBeVisible();
    });

    test('should highlight active navigation items', async ({ page }) => {
      // Check home is active by default
      const homeNav = page.locator('nav a[href="/"]');
      await expect(homeNav).toHaveClass(/bg-gradient-to-r.*from-amber-500.*to-orange-600/);
      
      // Navigate to upload and check active state
      await page.click('text=Convert');
      const uploadNav = page.locator('nav a[href="/upload"]');
      await expect(uploadNav).toHaveClass(/bg-gradient-to-r.*from-amber-500.*to-orange-600/);
      
      // Navigate to gallery and check active state
      await page.click('text=Gallery');
      const galleryNav = page.locator('nav a[href="/gallery"]');
      await expect(galleryNav).toHaveClass(/bg-gradient-to-r.*from-amber-500.*to-orange-600/);
    });
  });

  test.describe('Upload Page Tests', () => {
    
    test.beforeEach(async ({ page }) => {
      await page.goto(`${BASE_URL}/upload`);
      await page.waitForLoadState('networkidle');
    });

    test('should display upload interface correctly', async ({ page }) => {
      // Verify page title and content
      await expect(page.locator('text=Transform Your Photos')).toBeVisible();
      await expect(page.locator('text=AI Oil Painting Converter')).toBeVisible();
      
      // Verify upload area
      await expect(page.locator('text=Drop your image here')).toBeVisible();
      await expect(page.locator('text=or click to browse your files')).toBeVisible();
      
      // Verify choose image button
      const chooseImageBtn = page.locator('text=Choose Image');
      await expect(chooseImageBtn).toBeVisible();
      await expect(chooseImageBtn).toHaveClass(/bg-gradient-to-r.*from-amber-500.*to-orange-600/);
      
      // Verify supported formats info
      await expect(page.locator('text=Supports: JPG, PNG, GIF, WebP')).toBeVisible();
      
      // Take screenshot of upload interface
      await page.screenshot({ path: 'test-results/upload-interface.png', fullPage: true });
    });

    test('should display tips section', async ({ page }) => {
      // Verify tips section
      await expect(page.locator('text=Tips for Best Results')).toBeVisible();
      
      const tips = [
        'Image Quality',
        'Subject Matter',
        'File Size',
        'Formats'
      ];
      
      for (const tip of tips) {
        await expect(page.locator(`text=${tip}`)).toBeVisible();
      }
      
      // Take screenshot of tips section
      const tipsSection = page.locator('text=Tips for Best Results').locator('..');
      await tipsSection.screenshot({ path: 'test-results/tips-section.png' });
    });

    test('should handle file upload interaction', async ({ page }) => {
      // Click the choose image button
      const chooseImageBtn = page.locator('text=Choose Image');
      await chooseImageBtn.click();
      
      // Verify file input appears (it should be hidden but functional)
      const fileInput = page.locator('input[type="file"]');
      await expect(fileInput).toBeAttached();
      await expect(fileInput).toHaveAttribute('accept', 'image/*');
    });
  });

  test.describe('Gallery Page Tests', () => {
    
    test.beforeEach(async ({ page }) => {
      await page.goto(`${BASE_URL}/gallery`);
      await page.waitForLoadState('networkidle');
    });

    test('should display gallery interface correctly', async ({ page }) => {
      // Verify page title and content
      await expect(page.locator('text=Oil Painting Gallery')).toBeVisible();
      await expect(page.locator('text=Community Gallery')).toBeVisible();
      
      // Verify description
      await expect(page.locator('text=Discover beautiful oil paintings created by our AI')).toBeVisible();
      
      // Verify "Create Your Own" button
      const createBtn = page.locator('text=Create Your Own');
      await expect(createBtn).toBeVisible();
      await expect(createBtn).toHaveClass(/bg-gradient-to-r.*from-amber-500.*to-orange-600/);
      
      // Take screenshot of gallery header
      await page.screenshot({ path: 'test-results/gallery-header.png' });
    });

    test('should display gallery controls', async ({ page }) => {
      // Verify view mode controls
      const viewControls = page.locator('text=View:');
      await expect(viewControls).toBeVisible();
      
      // Verify filter controls
      const filterControls = page.locator('text=Filter:');
      await expect(filterControls).toBeVisible();
      
      // Verify filter buttons
      await expect(page.locator('text=All Images')).toBeVisible();
      await expect(page.locator('text=Liked')).toBeVisible();
      
      // Take screenshot of controls
      const controlsSection = page.locator('[class*="flex"][class*="justify-between"]:has-text("View:")');
      await controlsSection.screenshot({ path: 'test-results/gallery-controls.png' });
    });

    test('should display demo gallery images', async ({ page }) => {
      // Wait for images to load
      await page.waitForTimeout(2000);
      
      // Verify gallery grid exists
      const galleryGrid = page.locator('[class*="grid"]:has(img)');
      await expect(galleryGrid).toBeVisible();
      
      // Verify at least some demo images are present
      const images = page.locator('img[alt]');
      const imageCount = await images.count();
      expect(imageCount).toBeGreaterThan(0);
      
      // Take screenshot of gallery grid
      await galleryGrid.screenshot({ path: 'test-results/gallery-grid.png' });
    });

    test('should handle view mode switching', async ({ page }) => {
      // Test grid view (should be default)
      const gridBtn = page.locator('[class*="p-2"]:has([class*="h-4 w-4"]):nth(0)');
      await gridBtn.click();
      
      // Test masonry view
      const masonryBtn = page.locator('[class*="p-2"]:has([class*="h-4 w-4"]):nth(1)');
      await masonryBtn.click();
    });

    test('should handle filter switching', async ({ page }) => {
      // Test "All Images" filter
      await page.click('text=All Images');
      
      // Test "Liked" filter
      await page.click('text=Liked');
      
      // Should still show images or show empty state message
      const noImagesMessage = page.locator('text=No images found');
      const images = page.locator('img[alt]');
      
      // Either images are shown or no images message appears
      const hasImages = await images.count() > 0;
      const hasNoImagesMessage = await noImagesMessage.isVisible();
      
      expect(hasImages || hasNoImagesMessage).toBe(true);
    });
  });

  test.describe('Console Error Monitoring', () => {
    
    test('should not have console errors on any page', async ({ page }) => {
      const consoleErrors: string[] = [];
      
      // Listen for console errors
      page.on('console', msg => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });

      // Test homepage
      await page.goto(BASE_URL);
      await page.waitForLoadState('networkidle');
      
      // Test upload page
      await page.goto(`${BASE_URL}/upload`);
      await page.waitForLoadState('networkidle');
      
      // Test gallery page
      await page.goto(`${BASE_URL}/gallery`);
      await page.waitForLoadState('networkidle');
      
      // Report any console errors
      if (consoleErrors.length > 0) {
        console.log('Console errors found:', consoleErrors);
      }
      
      expect(consoleErrors).toHaveLength(0);
    });
  });

  test.describe('Network and Performance Tests', () => {
    
    test('should load all pages without network failures', async ({ page }) => {
      const failedRequests: string[] = [];
      
      // Listen for failed requests
      page.on('response', response => {
        if (response.status() >= 400) {
          failedRequests.push(`${response.status()} - ${response.url()}`);
        }
      });

      // Test all pages
      const pages = ['/', '/upload', '/gallery'];
      
      for (const pagePath of pages) {
        await page.goto(`${BASE_URL}${pagePath}`);
        await page.waitForLoadState('networkidle');
      }
      
      // Report any failed requests
      if (failedRequests.length > 0) {
        console.log('Failed requests found:', failedRequests);
      }
      
      expect(failedRequests).toHaveLength(0);
    });

    test('should have acceptable page load times', async ({ page }) => {
      const pageLoadTimes: Record<string, number> = {};
      
      const pages = ['/', '/upload', '/gallery'];
      
      for (const pagePath of pages) {
        const startTime = Date.now();
        await page.goto(`${BASE_URL}${pagePath}`);
        await page.waitForLoadState('networkidle');
        const loadTime = Date.now() - startTime;
        
        pageLoadTimes[pagePath] = loadTime;
        
        // Expect page to load within 5 seconds
        expect(loadTime).toBeLessThan(5000);
      }
      
      console.log('Page load times:', pageLoadTimes);
    });
  });

  test.describe('Responsive Design Tests', () => {
    
    test('should work correctly on mobile viewport', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      // Test homepage on mobile
      await page.goto(BASE_URL);
      await page.waitForLoadState('networkidle');
      
      // Verify mobile responsive elements
      await expect(page.locator('h1')).toBeVisible();
      await page.screenshot({ path: 'test-results/homepage-mobile.png', fullPage: true });
      
      // Test upload page on mobile
      await page.goto(`${BASE_URL}/upload`);
      await page.waitForLoadState('networkidle');
      await page.screenshot({ path: 'test-results/upload-mobile.png', fullPage: true });
      
      // Test gallery page on mobile
      await page.goto(`${BASE_URL}/gallery`);
      await page.waitForLoadState('networkidle');
      await page.screenshot({ path: 'test-results/gallery-mobile.png', fullPage: true });
    });

    test('should work correctly on tablet viewport', async ({ page }) => {
      // Set tablet viewport
      await page.setViewportSize({ width: 768, height: 1024 });
      
      await page.goto(BASE_URL);
      await page.waitForLoadState('networkidle');
      
      await expect(page.locator('h1')).toBeVisible();
      await page.screenshot({ path: 'test-results/homepage-tablet.png', fullPage: true });
    });
  });

  test.describe('Accessibility Tests', () => {
    
    test('should have proper heading hierarchy', async ({ page }) => {
      await page.goto(BASE_URL);
      await page.waitForLoadState('networkidle');
      
      // Verify h1 exists
      const h1 = page.locator('h1');
      await expect(h1).toBeVisible();
      
      // Verify h2 elements exist
      const h2Elements = page.locator('h2');
      const h2Count = await h2Elements.count();
      expect(h2Count).toBeGreaterThan(0);
    });

    test('should have alt text for images', async ({ page }) => {
      await page.goto(`${BASE_URL}/gallery`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
      
      // Check that images have alt text
      const images = page.locator('img');
      const imageCount = await images.count();
      
      for (let i = 0; i < imageCount; i++) {
        const img = images.nth(i);
        const alt = await img.getAttribute('alt');
        expect(alt).toBeTruthy();
      }
    });

    test('should have proper button labels', async ({ page }) => {
      await page.goto(`${BASE_URL}/upload`);
      await page.waitForLoadState('networkidle');
      
      // Verify buttons have text content or aria-labels
      const buttons = page.locator('button');
      const buttonCount = await buttons.count();
      
      for (let i = 0; i < buttonCount; i++) {
        const button = buttons.nth(i);
        const text = await button.textContent();
        const ariaLabel = await button.getAttribute('aria-label');
        
        // Button should have either text content or aria-label
        expect(text || ariaLabel).toBeTruthy();
      }
    });
  });
});