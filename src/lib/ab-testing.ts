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
  
  // If no variant is set (shouldn't happen with middleware), default to 'simple'
  return 'simple';
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