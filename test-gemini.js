/**
 * Simple test script for Gemini 2.5 Flash integration
 * Run with: node test-gemini.js
 */

const { GeminiClient } = require('./app/lib/gemini-client.ts');

async function testGeminiIntegration() {
  console.log('🧪 Testing Gemini 2.5 Flash Integration...\n');

  try {
    // Initialize client
    const client = new GeminiClient();
    
    // Test 1: Health Check
    console.log('1. Testing health check...');
    const health = await client.checkHealth();
    console.log('   Health:', health);
    
    if (!health.available) {
      console.error('❌ Gemini API not available:', health.error);
      console.log('\n💡 Make sure you have set GEMINI_API_KEY in your .env.local file');
      console.log('   Get your API key at: https://aistudio.google.com/app/apikey');
      return;
    }
    
    console.log('✅ Gemini API is available');
    
    // Test 2: Text-to-Image Generation
    console.log('\n2. Testing text-to-image generation...');
    const textResult = await client.generateOilPaintingFromText(
      'A golden retriever puppy sitting in a sunny garden',
      'classic'
    );
    
    if (textResult.success) {
      console.log('✅ Text-to-image generation successful');
      console.log(`   Processing time: ${textResult.processingTime}ms`);
      console.log(`   Image size: ${textResult.image?.length || 0} characters`);
    } else {
      console.log('❌ Text-to-image generation failed:', textResult.error);
    }
    
    // Test 3: Style variations
    console.log('\n3. Testing different styles...');
    const styles = ['classic', 'vangogh', 'monet', 'modern'];
    
    for (const style of styles) {
      const styleResult = await client.generateOilPaintingFromText(
        'Beautiful landscape with mountains',
        style
      );
      
      if (styleResult.success) {
        console.log(`✅ ${style} style: ${styleResult.processingTime}ms`);
      } else {
        console.log(`❌ ${style} style failed: ${styleResult.error}`);
      }
    }
    
    console.log('\n🎉 Gemini integration test completed!');
    console.log('\n📊 Summary:');
    console.log(`   • Model: ${health.model}`);
    console.log('   • Styles: classic, vangogh, monet, modern');
    console.log('   • Cost per image: $0.039');
    console.log('   • Features: text-to-image, image-to-image, conversational editing');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    
    if (error.message.includes('API key')) {
      console.log('\n💡 Setup Instructions:');
      console.log('   1. Get your Gemini API key at: https://aistudio.google.com/app/apikey');
      console.log('   2. Add to .env.local: GEMINI_API_KEY=your-api-key-here');
      console.log('   3. Restart the application');
    }
  }
}

// Run the test
testGeminiIntegration().catch(console.error);