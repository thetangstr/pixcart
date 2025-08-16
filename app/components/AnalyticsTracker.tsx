'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

export default function AnalyticsTracker() {
  const pathname = usePathname()

  useEffect(() => {
    // Track page view
    trackEvent('pageview', pathname)
  }, [pathname])

  return null
}

export async function trackEvent(
  type: 'pageview' | 'conversion' | 'upload' | 'download',
  page?: string,
  action?: string
) {
  try {
    await fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, page, action })
    })
  } catch (error) {
    console.error('Failed to track event:', error)
  }
  
  // Also track with Google Analytics if available
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', type, {
      page_path: page,
      event_category: type,
      event_label: action,
    })
  }
}