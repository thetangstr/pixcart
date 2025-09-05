const puppeteer = require('puppeteer');

async function testAsAdmin() {
  console.log('🚀 Testing as REAL ADMIN USER...\n');
  
  const browser = await puppeteer.launch({ 
    headless: false, // Show browser so you can see what's happening
    devtools: true 
  });
  
  const page = await browser.newPage();
  
  // Monitor console and network
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('❌ Console Error:', msg.text());
    }
  });
  
  page.on('response', response => {
    if (response.url().includes('/api/') && response.status() >= 400) {
      console.log(`❌ API Error: ${response.status()} - ${response.url()}`);
    }
  });

  try {
    // 1. Go to the app
    console.log('1. Navigating to app...');
    await page.goto('https://oil-painting-app.vercel.app', { waitUntil: 'networkidle0' });
    
    // 2. Click Sign In
    console.log('2. Clicking Sign In...');
    const signInBtn = await page.$('button:has-text("Sign In"), a:has-text("Sign In")');
    if (signInBtn) {
      await signInBtn.click();
      await page.waitForNavigation({ waitUntil: 'networkidle0' });
    }
    
    // 3. Sign in with Google (this would be manual or use stored session)
    console.log('3. On auth page:', page.url());
    console.log('\n⚠️  MANUAL STEP: Please sign in as thetangstr@gmail.com in the browser window\n');
    console.log('Waiting for you to complete sign in...');
    
    // Wait for redirect back to app after sign in
    await page.waitForFunction(
      () => !window.location.href.includes('auth'),
      { timeout: 120000 } // 2 minutes to sign in
    );
    
    console.log('4. Signed in! Now at:', page.url());
    
    // 5. Go to create page
    console.log('5. Going to create page...');
    await page.goto('https://oil-painting-app.vercel.app/create', { waitUntil: 'networkidle0' });
    
    // 6. Check if upload is available
    console.log('6. Looking for file upload...');
    const fileInput = await page.$('input[type="file"]');
    if (fileInput) {
      console.log('✅ File upload found');
      
      // Upload a test image
      const testImagePath = './public/test-pet.jpg'; // You'd need a test image
      console.log('7. Uploading test image...');
      
      // Create a small test image if needed
      await page.evaluate(() => {
        // Simulate image upload
        const event = new Event('change', { bubbles: true });
        const fileInput = document.querySelector('input[type="file"]');
        if (fileInput) {
          // Create a fake file
          const dataUrl = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAACAAIDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRDEQA9oADAMBAAIRAxEAPwCdABmX/9k=";
          // This would need the actual file upload simulation
          console.log('Simulating file upload...');
        }
      });
      
      // 8. Select style
      console.log('8. Selecting Renaissance style...');
      const styleBtn = await page.$('[data-style="renaissance"], button:has-text("Renaissance")');
      if (styleBtn) {
        await styleBtn.click();
      }
      
      // 9. Click Generate
      console.log('9. Clicking Generate button...');
      const generateBtn = await page.$('button:has-text("Generate"), button:has-text("Create")');
      if (generateBtn) {
        await generateBtn.click();
        
        // Wait for response
        console.log('10. Waiting for generation response...');
        
        // Monitor the network for the generate API call
        const response = await page.waitForResponse(
          resp => resp.url().includes('/api/generate'),
          { timeout: 30000 }
        );
        
        const status = response.status();
        const data = await response.json();
        
        console.log(`\n📊 GENERATION RESULT:`);
        console.log(`   Status: ${status}`);
        
        if (status === 200) {
          console.log(`   ✅ SUCCESS! Image generated`);
          console.log(`   Description length: ${data.preview?.description?.length || 0}`);
        } else {
          console.log(`   ❌ FAILED with error: ${data.error}`);
          console.log(`   Full response:`, JSON.stringify(data, null, 2));
        }
      }
    } else {
      console.log('❌ No file upload found - might not be on the right page');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
  
  console.log('\n⏸️  Keeping browser open for inspection. Press Ctrl+C to close.');
  // Keep browser open
  await new Promise(() => {});
}

// Run the test
testAsAdmin().catch(console.error);