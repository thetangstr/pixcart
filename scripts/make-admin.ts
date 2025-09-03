import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function makeAdmin() {
  const email = 'thetangstr@gmail.com';
  
  try {
    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (user) {
      // Update existing user
      await prisma.user.update({
        where: { email },
        data: {
          isBetaTester: true,
          isAdmin: true
        }
      });
      console.log(`✅ Updated ${email} as beta tester and admin`);
    } else {
      // Create new user
      await prisma.user.create({
        data: {
          email,
          name: 'Admin User',
          isBetaTester: true,
          isAdmin: true
        }
      });
      console.log(`✅ Created ${email} as beta tester and admin`);
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

makeAdmin();