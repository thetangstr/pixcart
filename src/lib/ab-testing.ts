import { cookies } from 'next/headers';

export type Variant = 'simple' | 'detailed';

const COOKIE_NAME = 'ab_variant';
const COOKIE_MAX_AGE = 30 * 24 * 60 * 60; // 30 days

export async function getVariant(): Promise<Variant> {
  const cookieStore = await cookies();
  const existingVariant = cookieStore.get(COOKIE_NAME);
  
  if (existingVariant?.value === 'simple' || existingVariant?.value === 'detailed') {
    return existingVariant.value as Variant;
  }
  
  // Randomly assign variant (50/50 split)
  const variant: Variant = Math.random() < 0.5 ? 'simple' : 'detailed';
  
  // Set cookie to maintain consistency
  cookieStore.set(COOKIE_NAME, variant, {
    maxAge: COOKIE_MAX_AGE,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production'
  });
  
  return variant;
}

export async function trackEvent(event: string, variant: Variant, metadata?: any) {
  try {
    await fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event,
        variant,
        metadata,
        timestamp: new Date().toISOString()
      })
    });
  } catch (error) {
    console.error('Failed to track event:', error);
  }
}