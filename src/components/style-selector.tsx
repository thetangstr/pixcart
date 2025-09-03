"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Palette, Sparkles, Eye, Check } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export type PaintingStyle = "classic" | "van_gogh" | "monet";

interface StyleOption {
  id: PaintingStyle;
  name: string;
  description: string;
  price: number;
  features: string[];
  color: string;
  gradient: string;
  previewImage?: string;
  popular?: boolean;
}

interface StyleSelectorProps {
  selectedStyle: PaintingStyle | null;
  onStyleSelect: (style: PaintingStyle) => void;
  disabled?: boolean;
  compact?: boolean;
}

const styleOptions: StyleOption[] = [
  {
    id: "classic",
    name: "Classic Renaissance",
    description: "Timeless elegance with rich colors and dramatic lighting reminiscent of old masters",
    price: 129,
    features: [
      "Deep, rich colors",
      "Dramatic lighting",
      "Formal composition",
      "Noble appearance",
      "Subtle brush strokes"
    ],
    color: "amber",
    gradient: "from-amber-400 to-orange-600",
    popular: true
  },
  {
    id: "van_gogh",
    name: "Van Gogh Style",
    description: "Bold, swirling brushstrokes with vibrant colors and dynamic movement",
    price: 149,
    features: [
      "Bold swirling strokes",
      "Thick impasto texture",
      "Bright contrasting colors",
      "Dynamic movement",
      "Energetic brushwork"
    ],
    color: "blue",
    gradient: "from-blue-400 to-purple-600"
  },
  {
    id: "monet",
    name: "Monet Impressionist",
    description: "Soft, dreamy brushstrokes with gentle colors and atmospheric quality",
    price: 139,
    features: [
      "Gentle dappled strokes",
      "Soft pastel tones",
      "Luminous colors",
      "Peaceful atmosphere",
      "Ethereal quality"
    ],
    color: "emerald",
    gradient: "from-emerald-400 to-teal-600"
  }
];

export default function StyleSelector({ selectedStyle, onStyleSelect, disabled = false, compact = false }: StyleSelectorProps) {
  const [hoveredStyle, setHoveredStyle] = useState<PaintingStyle | null>(null);

  if (compact) {
    return (
      <div className="grid grid-cols-3 gap-4">
        {styleOptions.map((style) => (
          <motion.div
            key={style.id}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`
              relative cursor-pointer p-4 rounded-lg border-2 transition-all
              ${selectedStyle === style.id 
                ? 'border-purple-500 bg-purple-50' 
                : 'border-gray-200 hover:border-purple-300 bg-white'
              }
            `}
            onClick={() => !disabled && onStyleSelect(style.id)}
          >
            {selectedStyle === style.id && (
              <div className="absolute -top-2 -right-2">
                <div className="w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center">
                  <Check className="w-3 h-3 text-white" />
                </div>
              </div>
            )}
            <div className="text-center">
              <div className={`w-12 h-12 mx-auto mb-2 rounded-full bg-gradient-to-r ${style.gradient} flex items-center justify-center`}>
                <Palette className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-semibold text-sm">{style.name}</h3>
              <p className="text-xs text-gray-600 mt-1">{style.description.substring(0, 50)}...</p>
            </div>
          </motion.div>
        ))}
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-gray-900">Choose Your Painting Style</h2>
        <p className="text-gray-600">Select the artistic style that best captures your pet's personality</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {styleOptions.map((style) => (
          <motion.div
            key={style.id}
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: styleOptions.indexOf(style) * 0.1 }}
            className="relative"
          >
            <Card
              className={`
                relative cursor-pointer transition-all duration-300 h-full
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-xl hover:-translate-y-1'}
                ${selectedStyle === style.id 
                  ? 'ring-2 ring-purple-500 shadow-lg transform scale-105' 
                  : 'hover:ring-1 hover:ring-purple-300'
                }
              `}
              onClick={() => !disabled && onStyleSelect(style.id)}
              onMouseEnter={() => setHoveredStyle(style.id)}
              onMouseLeave={() => setHoveredStyle(null)}
            >
              {style.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-10">
                  <Badge className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-3 py-1">
                    <Sparkles className="w-3 h-3 mr-1" />
                    Most Popular
                  </Badge>
                </div>
              )}

              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-bold">{style.name}</CardTitle>
                  <motion.div
                    animate={{
                      scale: selectedStyle === style.id ? 1.2 : 1,
                      rotate: selectedStyle === style.id ? 360 : 0,
                    }}
                    transition={{ type: "spring", stiffness: 300 }}
                    className={`
                      w-8 h-8 rounded-full flex items-center justify-center
                      bg-gradient-to-r ${style.gradient}
                    `}
                  >
                    {selectedStyle === style.id ? (
                      <Check className="w-4 h-4 text-white" />
                    ) : (
                      <Palette className="w-4 h-4 text-white" />
                    )}
                  </motion.div>
                </div>
                <CardDescription className="text-sm">
                  {style.description}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                <AnimatePresence>
                  {(hoveredStyle === style.id || selectedStyle === style.id) && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                      className="space-y-2"
                    >
                      <h4 className="font-medium text-sm text-gray-700">Features:</h4>
                      <ul className="space-y-1">
                        {style.features.map((feature, index) => (
                          <motion.li
                            key={feature}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="flex items-center text-xs text-gray-600"
                          >
                            <div className={`w-1.5 h-1.5 rounded-full bg-gradient-to-r ${style.gradient} mr-2`} />
                            {feature}
                          </motion.li>
                        ))}
                      </ul>
                    </motion.div>
                  )}
                </AnimatePresence>

                <Button
                  variant={selectedStyle === style.id ? "default" : "outline"}
                  className={`
                    w-full transition-all duration-200
                    ${selectedStyle === style.id 
                      ? `bg-gradient-to-r ${style.gradient} text-white border-none hover:shadow-lg` 
                      : 'hover:bg-gray-50'
                    }
                  `}
                  disabled={disabled}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!disabled) onStyleSelect(style.id);
                  }}
                >
                  {selectedStyle === style.id ? (
                    <div className="flex items-center">
                      <Check className="w-4 h-4 mr-2" />
                      Selected
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <Eye className="w-4 h-4 mr-2" />
                      Select Style
                    </div>
                  )}
                </Button>
              </CardContent>

              <AnimatePresence>
                {selectedStyle === style.id && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    className="absolute -top-2 -right-2"
                  >
                    <div className={`w-6 h-6 rounded-full bg-gradient-to-r ${style.gradient} flex items-center justify-center shadow-lg`}>
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>
          </motion.div>
        ))}
      </div>

      {selectedStyle && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center p-6 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-200"
        >
          <div className="flex items-center justify-center space-x-2 mb-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            <h3 className="font-semibold text-purple-800">
              Great choice! You selected {styleOptions.find(s => s.id === selectedStyle)?.name}
            </h3>
          </div>
          <p className="text-sm text-purple-600">
            Your pet portrait will be hand-painted by our professional artists in this beautiful style.
          </p>
        </motion.div>
      )}
    </div>
  );
}