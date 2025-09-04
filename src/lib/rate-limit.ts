import { prisma } from '@/lib/prisma';

export async function checkIPRateLimit(ip: string): Promise<{
  allowed: boolean;
  remaining: number;
  limit: number;
  resetsAt: Date;
  usedToday: number;
}> {
  // Get today's start (midnight in UTC)
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Find or create IP usage record
  // Use date range to handle potential timezone issues
  let ipUsage = await prisma.ipUsage.findFirst({
    where: {
      ip,
      date: {
        gte: today,
        lt: tomorrow
      }
    }
  });

  if (!ipUsage) {
    ipUsage = await prisma.ipUsage.create({
      data: {
        ip,
        date: today,
        count: 0,
        lastUsed: new Date()
      }
    });
  }

  const limit = 1; // 1 generation per IP per day
  const remaining = Math.max(0, limit - ipUsage.count);

  return {
    allowed: remaining > 0,
    remaining,
    limit,
    resetsAt: tomorrow,
    usedToday: ipUsage.count
  };
}

export async function incrementIPUsage(ip: string): Promise<void> {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  await prisma.ipUsage.upsert({
    where: {
      ip_date: {
        ip,
        date: today
      }
    },
    update: {
      count: { increment: 1 },
      lastUsed: new Date()
    },
    create: {
      ip,
      date: today,
      count: 1,
      lastUsed: new Date()
    }
  });
}

export async function checkImageGenerationLimit(userId: string): Promise<{
  allowed: boolean;
  remaining: number;
  limit: number;
  resetsAt: Date;
  usedToday: number;
}> {
  // Get user with their daily limit
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { 
      dailyImageLimit: true,
      isAdmin: true 
    }
  });

  if (!user) {
    throw new Error('User not found');
  }

  // Admins have unlimited access
  if (user.isAdmin) {
    return {
      allowed: true,
      remaining: 999999,
      limit: 999999,
      resetsAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      usedToday: 0
    };
  }

  // Get today's start (midnight in user's timezone - using UTC for simplicity)
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Count today's image generations
  const todayUsage = await prisma.apiUsage.count({
    where: {
      userId: userId,
      apiType: 'gemini',
      operation: 'image_generation',
      createdAt: {
        gte: today,
        lt: tomorrow
      },
      success: true
    }
  });

  const remaining = Math.max(0, user.dailyImageLimit - todayUsage);

  return {
    allowed: remaining > 0,
    remaining,
    limit: user.dailyImageLimit,
    resetsAt: tomorrow,
    usedToday: todayUsage
  };
}

export async function incrementImageUsage(userId: string): Promise<void> {
  // This is called after successful generation
  // The actual tracking is done in trackApiUsage
  // This is just for quick cache updates if needed
}

export async function getUserImageStats(userId: string, days: number = 7): Promise<{
  daily: Array<{ date: string; count: number }>;
  total: number;
  averagePerDay: number;
}> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  startDate.setUTCHours(0, 0, 0, 0);

  const usage = await prisma.apiUsage.findMany({
    where: {
      userId: userId,
      apiType: 'gemini',
      operation: 'image_generation',
      createdAt: {
        gte: startDate
      },
      success: true
    },
    orderBy: {
      createdAt: 'asc'
    }
  });

  // Group by day
  const dailyStats: { [key: string]: number } = {};
  let total = 0;

  usage.forEach(record => {
    const date = record.createdAt.toISOString().split('T')[0];
    dailyStats[date] = (dailyStats[date] || 0) + 1;
    total++;
  });

  // Fill in missing days with 0
  const daily = [];
  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];
    daily.push({
      date: dateStr,
      count: dailyStats[dateStr] || 0
    });
  }

  return {
    daily,
    total,
    averagePerDay: total / days
  };
}