const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function clearRateLimit() {
  try {
    // Clear all IP usage records for localhost IPs
    const result = await prisma.ipUsage.deleteMany({
      where: {
        ip: {
          in: ['::1', '127.0.0.1', '::ffff:127.0.0.1', 'localhost']
        }
      }
    });
    
    console.log(`Cleared ${result.count} IP usage records`);
    
    // Also clear today's records specifically
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    
    const todayResult = await prisma.ipUsage.deleteMany({
      where: {
        date: {
          gte: today
        }
      }
    });
    
    console.log(`Cleared ${todayResult.count} records from today`);
    console.log('Rate limit has been reset. You can now generate images again.');
    
  } catch (error) {
    console.error('Error clearing rate limit:', error);
  } finally {
    await prisma.$disconnect();
  }
}

clearRateLimit();