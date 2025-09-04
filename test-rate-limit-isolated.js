// Isolated test for rate limit reset functionality
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testRateLimitReset() {
  console.log('Testing Rate Limit Reset in isolation...');
  
  try {
    // First clean up any existing IP usage
    await prisma.ipUsage.deleteMany({
      where: { ip: '127.0.0.1' }
    });
    console.log('✓ Cleaned existing IP usage');
    
    // Create IP usage with yesterday's date
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0); // Set to midnight
    
    await prisma.ipUsage.create({
      data: {
        ip: '127.0.0.1',
        date: yesterday,
        count: 1,
        lastUsed: yesterday
      }
    });
    console.log('✓ Created yesterday\'s IP usage record');
    
    // Make request (should work since it's a new day)
    const validImageData = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    
    const response = await fetch('http://localhost:3000/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        imageData: validImageData,
        style: 'renaissance'
      })
    });
    
    console.log(`Response status: ${response.status}`);
    const data = await response.json();
    console.log('Response data:', data);
    
    if (response.ok) {
      console.log('✅ PASS: Rate limit resets daily - request succeeded!');
    } else {
      console.log('❌ FAIL: Rate limit resets daily - request was blocked');
      console.log('Error:', data.error);
    }
    
    // Clean up
    await prisma.ipUsage.deleteMany({
      where: { ip: '127.0.0.1' }
    });
    console.log('✓ Cleaned up test data');
    
  } catch (error) {
    console.error('Test error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testRateLimitReset();