'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Download, Heart, Share2, Eye, Upload, Sparkles, ImageIcon, ChevronLeft, ChevronRight, X } from 'lucide-react'

interface GalleryItem {
  id: string
  title: string
  description: string
  originalImage: string
  paintingImage: string
  category: string
  timestamp: string
}

export default function GalleryPage() {
  const [galleryData, setGalleryData] = useState<GalleryItem[]>([])
  const [selectedItem, setSelectedItem] = useState<GalleryItem | null>(null)
  const [sliderPosition, setSliderPosition] = useState(50)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadGalleryData()
  }, [])

  const loadGalleryData = async () => {
    try {
      const response = await fetch('/gallery/gallery_data.json')
      if (response.ok) {
        const data = await response.json()
        setGalleryData(data)
      }
    } catch (error) {
      console.error('Failed to load gallery data:', error)
      // Use demo data if loading fails
      setGalleryData([
        {
          id: 'demo_1',
          title: 'Oil Painting Cat #1',
          description: 'Professional oil painting conversion of a cat portrait',
          originalImage: '/gallery/demo_1_original.jpg',
          paintingImage: '/gallery/demo_1_painting.jpg',
          category: 'cat',
          timestamp: new Date().toISOString()
        }
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!selectedItem) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const percentage = (x / rect.width) * 100
    setSliderPosition(Math.min(100, Math.max(0, percentage)))
  }

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!selectedItem) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.touches[0].clientX - rect.left
    const percentage = (x / rect.width) * 100
    setSliderPosition(Math.min(100, Math.max(0, percentage)))
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100 py-12 px-4">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-12">
        <div className="text-center">
          <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
            Oil Painting Gallery
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Explore stunning transformations from photos to oil paintings. 
            Click on any image to see the before/after comparison.
          </p>
        </div>

        {/* CTA Button */}
        <div className="text-center mt-8">
          <Link
            href="/upload"
            className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold rounded-full hover:from-amber-600 hover:to-orange-700 transform hover:scale-105 transition-all duration-200 shadow-lg"
          >
            <Upload className="h-5 w-5 mr-2" />
            Create Your Own
            <Sparkles className="h-5 w-5 ml-2" />
          </Link>
        </div>
      </div>

      {/* Gallery Grid */}
      <div className="max-w-7xl mx-auto">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading gallery...</p>
          </div>
        ) : galleryData.length === 0 ? (
          <div className="text-center py-12">
            <ImageIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No gallery items yet</p>
            <p className="text-sm text-gray-500 mt-2">Create your first oil painting to see it here!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {galleryData.map((item) => (
              <div
                key={item.id}
                onClick={() => {
                  setSelectedItem(item)
                  setSliderPosition(50)
                }}
                className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transform hover:scale-105 transition-all duration-200 cursor-pointer"
              >
                <div className="relative aspect-square">
                  <img
                    src={item.paintingImage}
                    alt={item.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 hover:opacity-100 transition-opacity">
                    <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                      <h3 className="font-semibold text-lg">{item.title}</h3>
                      <p className="text-sm opacity-90">{item.description}</p>
                    </div>
                  </div>
                </div>
                <div className="p-4">
                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <span className="flex items-center">
                      <Eye className="w-4 h-4 mr-1" />
                      Click to compare
                    </span>
                    <span className="capitalize">{item.category}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Before/After Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="relative max-w-5xl w-full">
            {/* Close Button */}
            <button
              onClick={() => setSelectedItem(null)}
              className="absolute -top-12 right-0 text-white hover:text-amber-400 transition-colors"
            >
              <X className="w-8 h-8" />
            </button>

            {/* Title */}
            <h2 className="text-2xl font-bold text-white text-center mb-4">
              {selectedItem.title}
            </h2>

            {/* Slider Container */}
            <div 
              className="relative aspect-[4/3] max-h-[70vh] overflow-hidden rounded-xl cursor-ew-resize"
              onMouseMove={handleMouseMove}
              onTouchMove={handleTouchMove}
            >
              {/* Original Image (Background) */}
              <img
                src={selectedItem.originalImage}
                alt="Original"
                className="absolute inset-0 w-full h-full object-contain bg-gray-900"
              />

              {/* Painting Image (Foreground with clip) */}
              <div 
                className="absolute inset-0 overflow-hidden"
                style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
              >
                <img
                  src={selectedItem.paintingImage}
                  alt="Oil Painting"
                  className="absolute inset-0 w-full h-full object-contain bg-gray-900"
                />
              </div>

              {/* Slider Line */}
              <div 
                className="absolute top-0 bottom-0 w-1 bg-white shadow-lg"
                style={{ left: `${sliderPosition}%` }}
              >
                <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center">
                  <ChevronLeft className="w-4 h-4 text-gray-700 absolute -left-1" />
                  <ChevronRight className="w-4 h-4 text-gray-700 absolute -right-1" />
                </div>
              </div>

              {/* Labels */}
              <div className="absolute top-4 left-4 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
                Original
              </div>
              <div className="absolute top-4 right-4 bg-amber-600/80 text-white px-3 py-1 rounded-full text-sm">
                Oil Painting
              </div>
            </div>

            {/* Instructions */}
            <p className="text-center text-white/80 text-sm mt-4">
              Drag the slider to compare before and after
            </p>
          </div>
        </div>
      )}
    </div>
  )
}