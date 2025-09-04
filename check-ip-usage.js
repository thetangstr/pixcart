const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkIpUsage() {
  try {
    const allUsage = await prisma.ipUsage.findMany();
    console.log('Current IP Usage Records:');
    console.log(JSON.stringify(allUsage, null, 2));
    
    if (allUsage.length === 0) {
      console.log('No IP usage records found');
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkIpUsage();