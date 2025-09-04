const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function setupAdminUser() {
  const adminEmail = 'thetangstr@gmail.com';
  
  try {
    // Check if user exists
    let user = await prisma.user.findUnique({
      where: { email: adminEmail }
    });

    if (user) {
      // Update existing user to be admin with unlimited access
      user = await prisma.user.update({
        where: { email: adminEmail },
        data: {
          isAdmin: true,
          isBetaTester: true,
          isAllowlisted: true,
          isWaitlisted: false,
          dailyImageLimit: 999999, // Effectively unlimited
          approvedAt: user.approvedAt || new Date()
        }
      });
      console.log(`✅ Updated existing user ${adminEmail} as admin with unlimited access`);
    } else {
      // Create new admin user
      user = await prisma.user.create({
        data: {
          email: adminEmail,
          name: 'Admin User',
          isAdmin: true,
          isBetaTester: true,
          isAllowlisted: true,
          isWaitlisted: false,
          dailyImageLimit: 999999, // Effectively unlimited
          approvedAt: new Date()
        }
      });
      console.log(`✅ Created new admin user ${adminEmail} with unlimited access`);
    }

    console.log('\nUser details:');
    console.log(`  Email: ${user.email}`);
    console.log(`  Admin: ${user.isAdmin}`);
    console.log(`  Beta Tester: ${user.isBetaTester}`);
    console.log(`  Daily Limit: ${user.dailyImageLimit === 999999 ? 'Unlimited' : user.dailyImageLimit}`);
    console.log(`  Allowlisted: ${user.isAllowlisted}`);

    // Also update any other beta users to have 10 images per day
    const betaUsersUpdated = await prisma.user.updateMany({
      where: {
        isBetaTester: true,
        isAdmin: false,
        dailyImageLimit: { lt: 10 }
      },
      data: {
        dailyImageLimit: 10
      }
    });

    if (betaUsersUpdated.count > 0) {
      console.log(`\n✅ Updated ${betaUsersUpdated.count} beta users to have 10 images per day`);
    }

  } catch (error) {
    console.error('Error setting up admin user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

setupAdminUser();