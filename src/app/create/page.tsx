"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/app/providers";
import { Upload, Sparkles, ArrowLeft, ArrowRight, RefreshCw, ShoppingBag, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import FileUpload from "@/components/ui/file-upload";
import { toast } from "sonner";

type PaintingStyle = "renaissance" | "van_gogh" | "monet";

const styles = [
  { 
    id: "renaissance" as PaintingStyle, 
    name: "Renaissance", 
    icon: "🎨",
    description: "Timeless classical beauty",
    gradient: "from-amber-400 via-yellow-500 to-orange-600",
    bgColor: "bg-gradient-to-br from-amber-50 to-orange-100"
  },
  { 
    id: "van_gogh" as PaintingStyle, 
    name: "Van Gogh", 
    icon: "🌌",
    description: "Bold strokes & vivid colors",
    gradient: "from-blue-400 via-purple-500 to-indigo-600",
    bgColor: "bg-gradient-to-br from-blue-50 to-purple-100"
  },
  { 
    id: "monet" as PaintingStyle, 
    name: "Monet", 
    icon: "🌸",
    description: "Dreamy impressionist magic",
    gradient: "from-pink-400 via-rose-500 to-purple-600",
    bgColor: "bg-gradient-to-br from-pink-50 to-rose-100"
  },
];

export default function CreatePage() {
  const { user } = useAuth();
  const [imageData, setImageData] = useState<string>("");
  const [selectedStyle, setSelectedStyle] = useState<PaintingStyle | null>(null);
  const [aiPreview, setAiPreview] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [remainingGens, setRemainingGens] = useState<number | null>(null);

  useEffect(() => {
    fetchUsageStats();
  }, []);

  const fetchUsageStats = async () => {
    try {
      const response = await fetch("/api/user/usage");
      if (response.ok) {
        const data = await response.json();
        setRemainingGens(user ? data.limits.remaining : 1);
      } else if (!user) {
        setRemainingGens(1); // IP-based limit for non-authenticated users
      }
    } catch (error) {
      setRemainingGens(user ? 5 : 1); // Default fallback
    }
  };

  const handleImageUpload = (data: string, file: File) => {
    if (data && file.name) {
      setImageData(`data:${file.type};base64,${data}`);
    } else {
      setImageData("");
    }
  };

  const generatePreview = async () => {
    if (!imageData || !selectedStyle) return;

    setIsGenerating(true);
    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageData,
          style: selectedStyle
        })
      });

      if (!response.ok) {
        if (response.status === 429) {
          toast.error(user ? "Daily limit exceeded" : "IP limit exceeded (1 per IP)");
        } else {
          throw new Error("Generation failed");
        }
        return;
      }

      const data = await response.json();
      setAiPreview(data.preview.styledImage);
      await fetchUsageStats();
      toast.success("Preview generated!");
    } catch (error) {
      toast.error("Failed to generate preview");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-purple-50">
      {/* Header */}
      <div className="container-mobile mx-auto pt-8 pb-4">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">
            Create Your Masterpiece
          </h1>
          <p className="text-gray-600 mb-6">
            Transform your pet into a stunning oil painting in three simple steps
          </p>
          
          {/* Usage indicator */}
          {remainingGens !== null && (
            <motion.div 
              className="inline-flex items-center space-x-2 glass rounded-full px-4 py-2 text-sm"
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
            >
              <Zap className="w-4 h-4 text-purple-600" />
              <span className="font-medium text-gray-700">
                {user ? `${remainingGens}/5 generations today` : "1 free generation"}
              </span>
            </motion.div>
          )}
        </div>
      </div>

      <div className="container-mobile mx-auto pb-12">
        <div className="max-w-4xl mx-auto">
          
          {!aiPreview ? (
            <div className="spacing-responsive">
              {/* Step 1: Upload */}
              <motion.section
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="text-center"
              >
                <div className="flex items-center justify-center mb-6">
                  <div className="flex items-center space-x-4">
                    <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                      1
                    </div>
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-800">
                      Upload Your Pet's Photo
                    </h2>
                  </div>
                </div>
                
                <FileUpload
                  onFileUpload={handleImageUpload}
                  previewImage={imageData}
                  className="max-w-md mx-auto"
                />
              </motion.section>

              {/* Step 2: Style Selection */}
              <AnimatePresence>
                {imageData && (
                  <motion.section
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -30 }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                    className="text-center"
                  >
                    <div className="flex items-center justify-center mb-8">
                      <div className="flex items-center space-x-4">
                        <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                          2
                        </div>
                        <h2 className="text-xl sm:text-2xl font-bold text-gray-800">
                          Choose Your Art Style
                        </h2>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl mx-auto">
                      {styles.map((style, index) => (
                        <motion.div
                          key={style.id}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.4 + index * 0.1, duration: 0.4 }}
                          whileHover={{ y: -4 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <Card
                            className={`
                              relative p-6 cursor-pointer transition-all duration-300 overflow-hidden
                              touch-button haptic-feedback hover:shadow-xl
                              ${selectedStyle === style.id 
                                ? `ring-2 ring-purple-500 shadow-lg ${style.bgColor}` 
                                : 'hover:shadow-lg glass'
                              }
                            `}
                            onClick={() => setSelectedStyle(style.id)}
                          >
                            {/* Background gradient */}
                            <div className={`
                              absolute inset-0 bg-gradient-to-br ${style.gradient} opacity-0 transition-opacity duration-300
                              ${selectedStyle === style.id ? 'opacity-10' : 'group-hover:opacity-5'}
                            `} />
                            
                            <div className="relative z-10 text-center">
                              <motion.div 
                                className="text-4xl sm:text-5xl mb-4 inline-block"
                                animate={{ 
                                  rotate: selectedStyle === style.id ? [0, 10, -10, 0] : 0 
                                }}
                                transition={{ duration: 0.5 }}
                              >
                                {style.icon}
                              </motion.div>
                              <h3 className="font-bold text-lg text-gray-800 mb-2">
                                {style.name}
                              </h3>
                              <p className="text-sm text-gray-600">
                                {style.description}
                              </p>
                              
                              {/* Selection indicator */}
                              {selectedStyle === style.id && (
                                <motion.div
                                  className="absolute top-2 right-2 w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center"
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  transition={{ type: "spring", stiffness: 500 }}
                                >
                                  <Sparkles className="w-3 h-3 text-white" />
                                </motion.div>
                              )}
                            </div>
                          </Card>
                        </motion.div>
                      ))}
                    </div>
                  </motion.section>
                )}
              </AnimatePresence>

              {/* Step 3: Generate */}
              <AnimatePresence>
                {imageData && selectedStyle && (
                  <motion.section
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -30 }}
                    transition={{ duration: 0.6, delay: 0.3 }}
                    className="text-center"
                  >
                    <div className="flex items-center justify-center mb-8">
                      <div className="flex items-center space-x-4">
                        <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                          3
                        </div>
                        <h2 className="text-xl sm:text-2xl font-bold text-gray-800">
                          Generate Your Artwork
                        </h2>
                      </div>
                    </div>
                    
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Button
                        onClick={generatePreview}
                        disabled={isGenerating || remainingGens === 0}
                        size="lg"
                        className={`
                          touch-button haptic-feedback h-14 sm:h-16 px-8 sm:px-12 text-lg sm:text-xl rounded-full
                          ${isGenerating 
                            ? 'bg-gradient-to-r from-gray-400 to-gray-600' 
                            : remainingGens === 0
                            ? 'bg-gradient-to-r from-red-400 to-red-600'
                            : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 animate-pulse-glow'
                          }
                          shadow-2xl transition-all duration-300
                        `}
                      >
                        {isGenerating ? (
                          <>
                            <motion.div 
                              className="w-5 h-5 border-2 border-white border-t-transparent rounded-full mr-3"
                              animate={{ rotate: 360 }}
                              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                            />
                            Creating Magic...
                          </>
                        ) : remainingGens === 0 ? (
                          user ? "Daily Limit Reached" : "IP Limit Reached"
                        ) : (
                          <>
                            <Sparkles className="mr-3 h-5 w-5 sm:h-6 sm:w-6" />
                            Transform Into Art
                          </>
                        )}
                      </Button>
                    </motion.div>
                  </motion.section>
                )}
              </AnimatePresence>
            </div>
          ) : (
            /* Results Section */
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8 }}
              className="space-y-8"
            >
              {/* Header */}
              <div className="text-center">
                <motion.h2 
                  className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4"
                  initial={{ y: -20 }}
                  animate={{ y: 0 }}
                >
                  Your Masterpiece is Ready! ✨
                </motion.h2>
                <p className="text-lg text-gray-600">
                  Swipe or tap to compare your original photo with the AI-generated artwork
                </p>
              </div>

              {/* Image Comparison */}
              <div className="grid gap-6 lg:grid-cols-2 max-w-6xl mx-auto">
                <motion.div
                  initial={{ opacity: 0, x: -30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                  className="space-y-4"
                >
                  <h3 className="font-bold text-xl text-center text-gray-800">Original Photo</h3>
                  <div className="painting-frame">
                    <div className="aspect-square rounded-lg overflow-hidden bg-white">
                      <img src={imageData} alt="Original" className="w-full h-full object-contain" />
                    </div>
                  </div>
                </motion.div>
                
                <motion.div
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 }}
                  className="space-y-4"
                >
                  <h3 className="font-bold text-xl text-center text-gray-800">AI Masterpiece</h3>
                  <div className="painting-frame animate-pulse-glow">
                    <div className="aspect-square rounded-lg overflow-hidden bg-white">
                      <img src={aiPreview} alt="AI Preview" className="w-full h-full object-contain" />
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* Action Buttons */}
              <motion.div 
                className="flex flex-col sm:flex-row gap-4 justify-center items-center max-w-lg mx-auto"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
              >
                <Button 
                  onClick={() => {
                    setImageData("");
                    setSelectedStyle(null);
                    setAiPreview("");
                  }}
                  variant="outline"
                  size="lg"
                  className="touch-button haptic-feedback w-full sm:w-auto"
                >
                  <RefreshCw className="mr-2 h-5 w-5" />
                  Create Another
                </Button>
                <Button 
                  size="lg"
                  className="touch-button haptic-feedback w-full sm:w-auto bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                >
                  <ShoppingBag className="mr-2 h-5 w-5" />
                  Order Physical Painting
                </Button>
              </motion.div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}