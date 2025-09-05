import { prisma } from '@/lib/prisma';

export async function checkUserAllowlist(email: string | undefined): Promise<{
  allowed: boolean;
  isAdmin: boolean;
  isWaitlisted: boolean;
  user?: any;
}> {
  if (!email) {
    return { allowed: false, isAdmin: false, isWaitlisted: false };
  }

  try {
    // Check if user exists in database
    let user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        isAllowlisted: true,
        isWaitlisted: true,
        isAdmin: true,
        isBetaTester: true
      }
    });

    // If user doesn't exist, create them as waitlisted (not allowed)
    if (!user) {
      // Special case: admin email always gets access
      const isAdminEmail = email === 'thetangstr@gmail.com';
      
      user = await prisma.user.create({
        data: {
          email,
          isAllowlisted: isAdminEmail,
          isWaitlisted: !isAdminEmail,
          isAdmin: isAdminEmail,
          isBetaTester: false,
          dailyImageLimit: isAdminEmail ? 999 : 10
        },
        select: {
          id: true,
          email: true,
          isAllowlisted: true,
          isWaitlisted: true,
          isAdmin: true,
          isBetaTester: true
        }
      });
    }

    // User is allowed if they are allowlisted OR admin
    const allowed = user.isAllowlisted || user.isAdmin;

    return {
      allowed,
      isAdmin: user.isAdmin,
      isWaitlisted: user.isWaitlisted,
      user
    };
  } catch (error) {
    console.error('Error checking allowlist:', error);
    // On error, deny access (fail closed)
    return { allowed: false, isAdmin: false, isWaitlisted: true };
  }
}