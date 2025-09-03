import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Create admin user
  const adminEmail = 'thetangstr@gmail.com';
  
  const existingUser = await prisma.user.findUnique({
    where: { email: adminEmail }
  });

  if (!existingUser) {
    await prisma.user.create({
      data: {
        email: adminEmail,
        name: 'Admin',
        isBetaTester: true,
        isAdmin: true
      }
    });
    console.log('Admin user created');
  } else {
    await prisma.user.update({
      where: { email: adminEmail },
      data: {
        isBetaTester: true,
        isAdmin: true
      }
    });
    console.log('Admin user updated');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });