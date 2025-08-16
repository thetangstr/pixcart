import { NextRequest, NextResponse } from 'next/server'

// Mock API for testing - replace with database later
export async function GET(request: NextRequest) {
  try {
    // Generate a mock task for testing
    const mockTask = {
      id: 'mock_' + Date.now(),
      original_image: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTEyIiBoZWlnaHQ9IjUxMiIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNTEyIiBoZWlnaHQ9IjUxMiIgZmlsbD0iI2VlZSIvPjx0ZXh0IHRleHQtYW5jaG9yPSJtaWRkbGUiIHg9IjI1NiIgeT0iMjU2IiBzdHlsZT0iZmlsbDojYWFhO2ZvbnQtd2VpZ2h0OmJvbGQ7Zm9udC1zaXplOjMwcHg7Zm9udC1mYW1pbHk6QXJpYWwsSGVsdmV0aWNhLHNhbnMtc2VyaWY7ZG9taW5hbnQtYmFzZWxpbmU6Y2VudHJhbCI+T3JpZ2luYWwgSW1hZ2U8L3RleHQ+PC9zdmc+',
      converted_image: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTEyIiBoZWlnaHQ9IjUxMiIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNTEyIiBoZWlnaHQ9IjUxMiIgZmlsbD0iI2Q0YWE3MCIvPjx0ZXh0IHRleHQtYW5jaG9yPSJtaWRkbGUiIHg9IjI1NiIgeT0iMjU2IiBzdHlsZT0iZmlsbDojZmZmO2ZvbnQtd2VpZ2h0OmJvbGQ7Zm9udC1zaXplOjMwcHg7Zm9udC1mYW1pbHk6QXJpYWwsSGVsdmV0aWNhLHNhbnMtc2VyaWY7ZG9taW5hbnQtYmFzZWxpbmU6Y2VudHJhbCI+T2lsIFBhaW50aW5nIFJlc3VsdDwvdGV4dD48L3N2Zz4=',
      parameters: {
        denoising_strength: 0.15,
        cfg_scale: 2.0,
        canny_weight: 0.95,
        style: 'soft_impressionist'
      },
      timestamp: new Date().toISOString()
    }

    const mockStats = {
      evaluated: 0,
      pending: 0,
      approved: 0,
      rejected: 0
    }

    return NextResponse.json({
      task: mockTask,
      stats: mockStats
    })

  } catch (error) {
    console.error('Error fetching evaluation task:', error)
    return NextResponse.json(
      { error: 'Failed to fetch task' },
      { status: 500 }
    )
  }
}