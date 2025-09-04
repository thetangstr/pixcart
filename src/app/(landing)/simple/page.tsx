"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Upload, Sparkles } from "lucide-react";
import { FileUpload } from "@/components/ui/file-upload";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function SimpleLandingPage() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const router = useRouter();

  const handleImageSelect = (image: string) => {
    setSelectedImage(image);
    // Auto-redirect to create page when image is selected
    setTimeout(() => {
      router.push("/create");
    }, 500);
  };

  return (
    <div className="min-h-screen bg-gradient-mesh flex flex-col items-center justify-center p-4">
      {/* Floating orbs for visual interest */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="gradient-orb top-20 left-10 w-96 h-96 bg-purple-400 opacity-20 floating-slow" />
        <div className="gradient-orb bottom-20 right-10 w-96 h-96 bg-pink-400 opacity-20 floating" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 text-center max-w-4xl mx-auto"
      >
        {/* Ultra minimal title */}
        <motion.h1 
          className="text-6xl md:text-8xl font-bold mb-12 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent"
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring" }}
        >
          Pet → Oil Painting
        </motion.h1>

        {/* File upload area */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-12"
        >
          <FileUpload 
            onImageSelect={handleImageSelect}
            className="max-w-md mx-auto"
          />
        </motion.div>

        {/* Style options - just icons */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="flex justify-center gap-8"
        >
          <div className="text-center">
            <div className="painting-frame-mini">
              <div className="w-20 h-20 flex items-center justify-center text-4xl">
                🎨
              </div>
            </div>
            <p className="mt-2 text-sm text-gray-600">Renaissance</p>
          </div>
          <div className="text-center">
            <div className="painting-frame-mini">
              <div className="w-20 h-20 flex items-center justify-center text-4xl">
                🌻
              </div>
            </div>
            <p className="mt-2 text-sm text-gray-600">Van Gogh</p>
          </div>
          <div className="text-center">
            <div className="painting-frame-mini">
              <div className="w-20 h-20 flex items-center justify-center text-4xl">
                🌸
              </div>
            </div>
            <p className="mt-2 text-sm text-gray-600">Monet</p>
          </div>
        </motion.div>

        {/* Minimal indicator */}
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-8 text-gray-500 text-sm"
        >
          <Sparkles className="inline w-4 h-4 mr-1" />
          1 free • AI preview
        </motion.p>
      </motion.div>
    </div>
  );
}