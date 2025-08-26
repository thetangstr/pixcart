'use client'

import { useState } from 'react'
import { OilPaintingStyle } from '../lib/oilPaintingStyles'
import { CheckCircle, Palette, Eye, Lightbulb, ImageIcon } from 'lucide-react'
import Image from 'next/image'
import StylePreviewModal from './StylePreviewModal'

interface StyleSelectorProps {
  styles: OilPaintingStyle[]
  selectedStyle: OilPaintingStyle
  onStyleSelect: (style: OilPaintingStyle) => void
  triedStyles: Set<string>
}

// Enhanced style data with better guidance
const styleGuides = {
  classic_portrait: {
    bestFor: ["Portraits", "Professional photos", "Family pictures"],
    effect: "Smooth, refined brushwork with Renaissance elegance",
    mood: "Timeless & sophisticated",
    technique: "Classical glazing with subtle impasto highlights"
  },
  thick_textured: {
    bestFor: ["Landscapes", "Bold subjects", "Artistic expression"],
    effect: "Dramatic, visible brushstrokes you can almost feel",
    mood: "Energetic & expressive", 
    technique: "Heavy impasto with palette knife marks"
  },
  soft_impressionist: {
    bestFor: ["Romantic scenes", "Nature", "Gentle portraits"],
    effect: "Soft, dreamy lighting with delicate brush touches",
    mood: "Peaceful & atmospheric",
    technique: "Broken color technique with dappled light"
  }
}

export default function StyleSelector({ 
  styles, 
  selectedStyle, 
  onStyleSelect, 
  triedStyles 
}: StyleSelectorProps) {
  const [previewModal, setPreviewModal] = useState<{ isOpen: boolean; style: OilPaintingStyle | null }>({
    isOpen: false,
    style: null
  })

  const showPreview = (style: OilPaintingStyle, e: React.MouseEvent) => {
    e.stopPropagation()
    setPreviewModal({ isOpen: true, style })
  }

  const closePreview = () => {
    setPreviewModal({ isOpen: false, style: null })
  }

  return (
    <div className="w-full">
      {/* Compact Header */}
      <div className="mb-4 text-center">
        <h2 className="text-lg font-bold text-gray-900 mb-1 flex items-center justify-center gap-2">
          <Palette className="h-5 w-5 text-amber-500" />
          Choose Your Oil Painting Style
        </h2>
        <p className="text-gray-600 text-sm">
          Each style creates a unique artistic interpretation of your photo
        </p>
      </div>

      {/* Horizontal Style Cards - Mobile Responsive */}
      <div className="space-y-3">
        {styles.map((style) => {
          const isSelected = selectedStyle.id === style.id
          const isTried = triedStyles.has(style.id)
          const guide = styleGuides[style.id as keyof typeof styleGuides]
          
          return (
            <button
              key={style.id}
              onClick={() => onStyleSelect(style)}
              className={`
                relative w-full group rounded-xl text-left overflow-hidden style-card
                ${isSelected 
                  ? 'ring-2 ring-amber-500 shadow-xl bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 animate-pulseGlow' 
                  : 'hover:shadow-lg bg-white border border-gray-200 hover:border-amber-300 hover:bg-gradient-to-r hover:from-amber-50/30 hover:to-orange-50/30'
                }
              `}
            >
              {/* Tried Badge */}
              {isTried && (
                <div className="absolute top-3 right-3 z-10">
                  <div className="bg-green-500 text-white rounded-full p-1.5 shadow-lg">
                    <CheckCircle size={16} />
                  </div>
                </div>
              )}

              {/* Main Content Layout */}
              <div className="flex gap-4 p-4">
                {/* Left: Style Preview */}
                <div className="flex-shrink-0">
                  <div className="relative w-20 h-20 md:w-24 md:h-24 rounded-lg overflow-hidden shadow-md">
                    {style.icon.startsWith('/') ? (
                      <Image
                        src={style.icon}
                        alt={`${style.name} style preview`}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 80px, 96px"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-amber-100 to-orange-100 text-3xl">
                        {style.icon}
                      </div>
                    )}
                    {/* Overlay with color palette preview */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                    <div className="absolute bottom-1 left-1 flex gap-0.5">
                      {style.colorPalette?.slice(0, 4).map((color, i) => (
                        <div 
                          key={i}
                          className="w-2 h-2 rounded-full border border-white/50"
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Center: Style Information */}
                <div className="flex-1 min-w-0">
                  {/* Style Title */}
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xl">{style.icon}</span>
                    <h3 className={`
                      font-bold text-lg transition-colors
                      ${isSelected ? 'text-amber-700' : 'text-gray-900'}
                    `}>
                      {style.name}
                    </h3>
                    {isSelected && (
                      <div className="ml-auto flex items-center text-amber-600 text-sm font-medium">
                        <CheckCircle size={16} className="mr-1" />
                        Selected
                      </div>
                    )}
                  </div>

                  {/* Style Description */}
                  <p className={`
                    text-sm mb-2 transition-colors
                    ${isSelected ? 'text-amber-600' : 'text-gray-600'}
                  `}>
                    {style.description}
                  </p>

                  {/* Enhanced Guidance - Mobile responsive */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
                    {/* Best For */}
                    <div className="flex items-start gap-1">
                      <Eye className="h-3 w-3 text-gray-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <span className="font-medium text-gray-700">Best for:</span>
                        <span className="text-gray-600 ml-1">
                          {guide.bestFor.join(", ")}
                        </span>
                      </div>
                    </div>

                    {/* Mood */}
                    <div className="flex items-start gap-1">
                      <Palette className="h-3 w-3 text-gray-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <span className="font-medium text-gray-700">Mood:</span>
                        <span className="text-gray-600 ml-1">{guide.mood}</span>
                      </div>
                    </div>

                    {/* Technique */}
                    <div className="flex items-start gap-1">
                      <Lightbulb className="h-3 w-3 text-gray-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <span className="font-medium text-gray-700">Effect:</span>
                        <span className="text-gray-600 ml-1">{guide.effect}</span>
                      </div>
                    </div>
                  </div>

                  {/* Mobile Preview Button */}
                  <div className="md:hidden mt-3">
                    <div
                      onClick={(e) => showPreview(style, e)}
                      className="text-xs text-amber-600 hover:text-amber-700 font-medium flex items-center gap-1 cursor-pointer"
                    >
                      <ImageIcon className="h-3 w-3" />
                      See examples
                    </div>
                  </div>
                </div>

                {/* Right: Actions (Desktop only) */}
                <div className="hidden md:flex flex-col items-center justify-center gap-2 w-16">
                  {/* Preview Button */}
                  <div
                    onClick={(e) => showPreview(style, e)}
                    className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all duration-200 group/preview cursor-pointer"
                    title="See examples"
                  >
                    <ImageIcon className="h-4 w-4" />
                  </div>
                  
                  {/* Selection Indicator */}
                  {isSelected ? (
                    <div className="w-8 h-8 bg-gradient-to-br from-amber-500 to-orange-600 rounded-full flex items-center justify-center shadow-lg">
                      <CheckCircle className="h-5 w-5 text-white" />
                    </div>
                  ) : (
                    <div className="w-8 h-8 border-2 border-gray-300 rounded-full group-hover:border-amber-400 transition-colors" />
                  )}
                </div>
              </div>

              {/* Selection Glow Effect */}
              {isSelected && (
                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-amber-500/5 to-orange-500/5 pointer-events-none" />
              )}
            </button>
          )
        })}
      </div>

      {/* Quick Tips Section - Integrated but Compact */}
      <div className="mt-4 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
        <div className="flex items-start gap-2">
          <Lightbulb className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="font-medium text-blue-900 text-sm mb-1">💡 Pro Tip</h4>
            <p className="text-blue-700 text-xs leading-relaxed">
              You can try multiple styles with the same photo! Each style processes independently, 
              so experiment to find your perfect artistic interpretation.
            </p>
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      {previewModal.style && (
        <StylePreviewModal
          isOpen={previewModal.isOpen}
          onClose={closePreview}
          style={previewModal.style}
        />
      )}
    </div>
  )
}