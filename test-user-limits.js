const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testUserLimits() {
  try {
    console.log('Testing User Rate Limits...\n');
    
    // Check admin user
    const adminUser = await prisma.user.findUnique({
      where: { email: 'thetangstr@gmail.com' },
      select: {
        email: true,
        isAdmin: true,
        isBetaTester: true,
        dailyImageLimit: true,
        isAllowlisted: true
      }
    });

    if (adminUser) {
      console.log('Admin User (thetangstr@gmail.com):');
      console.log(`  Admin: ${adminUser.isAdmin}`);
      console.log(`  Beta Tester: ${adminUser.isBetaTester}`);
      console.log(`  Daily Limit: ${adminUser.isAdmin ? 'Unlimited (admin)' : adminUser.dailyImageLimit}`);
      console.log(`  Allowlisted: ${adminUser.isAllowlisted}`);
    }

    // Check all beta users
    console.log('\nAll Beta Users:');
    const betaUsers = await prisma.user.findMany({
      where: { isBetaTester: true },
      select: {
        email: true,
        isAdmin: true,
        dailyImageLimit: true
      }
    });

    betaUsers.forEach(user => {
      console.log(`  ${user.email}:`);
      console.log(`    Admin: ${user.isAdmin}`);
      console.log(`    Daily Limit: ${user.isAdmin ? 'Unlimited' : user.dailyImageLimit}`);
    });

    // Check regular users
    console.log('\nRegular Users (not beta):');
    const regularUsers = await prisma.user.findMany({
      where: { 
        isBetaTester: false,
        isAdmin: false
      },
      select: {
        email: true,
        dailyImageLimit: true
      }
    });

    if (regularUsers.length === 0) {
      console.log('  No regular users found');
    } else {
      regularUsers.forEach(user => {
        console.log(`  ${user.email}: ${user.dailyImageLimit} images/day`);
      });
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testUserLimits();