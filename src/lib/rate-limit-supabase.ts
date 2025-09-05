import { createClient } from '@/lib/supabase/server';

export async function checkIPRateLimit(ipAddress: string): Promise<{
  allowed: boolean;
  remaining: number;
  limit: number;
  resetsAt: Date;
  usedToday: number;
}> {
  const supabase = await createClient();
  
  // Get today's date string (YYYY-MM-DD)
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const dateStr = today.toISOString().split('T')[0];
  
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Find IP usage record for today
  const { data: ipUsage, error } = await supabase
    .from('IPUsage')
    .select('*')
    .eq('ipAddress', ipAddress)
    .eq('date', dateStr)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
    console.error('Error checking IP rate limit:', error);
    // On error, allow the request but log it
    return {
      allowed: true,
      remaining: 1,
      limit: 1,
      resetsAt: tomorrow,
      usedToday: 0
    };
  }

  const currentCount = ipUsage?.count || 0;
  const limit = 1; // 1 generation per IP per day for non-authenticated users
  const remaining = Math.max(0, limit - currentCount);

  return {
    allowed: remaining > 0,
    remaining,
    limit,
    resetsAt: tomorrow,
    usedToday: currentCount
  };
}

export async function incrementIPUsage(ipAddress: string): Promise<void> {
  const supabase = await createClient();
  
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const dateStr = today.toISOString().split('T')[0];

  // First try to get existing record
  const { data: existing } = await supabase
    .from('IPUsage')
    .select('id, count')
    .eq('ipAddress', ipAddress)
    .eq('date', dateStr)
    .single();

  if (existing) {
    // Update existing record
    await supabase
      .from('IPUsage')
      .update({ 
        count: existing.count + 1,
        updatedAt: new Date().toISOString()
      })
      .eq('id', existing.id);
  } else {
    // Create new record
    await supabase
      .from('IPUsage')
      .insert({
        id: `${ipAddress}_${dateStr}_${Date.now()}`,
        ipAddress,
        date: dateStr,
        count: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
  }
}

export async function checkImageGenerationLimit(userId: string): Promise<{
  allowed: boolean;
  remaining: number;
  limit: number;
  resetsAt: Date;
  usedToday: number;
}> {
  const supabase = await createClient();
  
  // Get user with their daily limit
  const { data: user, error } = await supabase
    .from('User')
    .select('dailyImageLimit, isAdmin')
    .eq('id', userId)
    .single();

  if (error || !user) {
    console.error('Error fetching user:', error);
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

  // Get today's date range
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const dateStr = today.toISOString().split('T')[0];
  
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Get or create today's usage record
  const { data: usage, error: usageError } = await supabase
    .from('UserUsage')
    .select('imageCount')
    .eq('userId', userId)
    .eq('date', dateStr)
    .single();

  const todayUsage = usage?.imageCount || 0;
  const remaining = Math.max(0, user.dailyImageLimit - todayUsage);

  return {
    allowed: remaining > 0,
    remaining,
    limit: user.dailyImageLimit,
    resetsAt: tomorrow,
    usedToday: todayUsage
  };
}

export async function incrementUserImageUsage(userId: string): Promise<void> {
  const supabase = await createClient();
  
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const dateStr = today.toISOString().split('T')[0];

  // First try to get existing record
  const { data: existing } = await supabase
    .from('UserUsage')
    .select('id, imageCount')
    .eq('userId', userId)
    .eq('date', dateStr)
    .single();

  if (existing) {
    // Update existing record
    await supabase
      .from('UserUsage')
      .update({ 
        imageCount: existing.imageCount + 1,
        updatedAt: new Date().toISOString()
      })
      .eq('id', existing.id);
  } else {
    // Create new record
    await supabase
      .from('UserUsage')
      .insert({
        id: `${userId}_${dateStr}_${Date.now()}`,
        userId,
        date: dateStr,
        imageCount: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
  }
}