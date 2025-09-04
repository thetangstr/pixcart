"use client";

import React, { useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Camera, Image as ImageIcon, X, ZoomIn } from 'lucide-react';
import { Button } from './button';

interface FileUploadProps {
  onFileUpload: (data: string, file: File) => void;
  previewImage?: string;
  accept?: string;
  maxSize?: number;
  className?: string;
}

export default function FileUpload({
  onFileUpload,
  previewImage,
  accept = "image/*",
  maxSize = 10 * 1024 * 1024, // 10MB
  className = ""
}: FileUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showZoom, setShowZoom] = useState(false);

  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    const file = files[0];
    setError(null);

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file');
      return;
    }

    // Validate file size
    if (file.size > maxSize) {
      setError('File too large. Please upload an image under 10MB');
      return;
    }

    setIsLoading(true);

    try {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        if (result) {
          // Remove data URL prefix for the callback
          const base64Data = result.split(',')[1];
          onFileUpload(base64Data, file);
        }
        setIsLoading(false);
      };
      reader.onerror = () => {
        setError('Failed to read file');
        setIsLoading(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      setError('Failed to upload file');
      setIsLoading(false);
    }
  }, [onFileUpload, maxSize]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
  }, [handleFiles]);

  const clearImage = useCallback(() => {
    onFileUpload('', new File([], ''));
    setError(null);
  }, [onFileUpload]);

  if (previewImage) {
    return (
      <>
        <motion.div 
          className={`relative group ${className}`}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <div className="painting-frame">
            <div className="relative aspect-square rounded-lg overflow-hidden bg-white">
              <img 
                src={previewImage} 
                alt="Uploaded image" 
                className="w-full h-full object-contain"
              />
              
              {/* Overlay controls */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center space-x-3">
                <Button
                  size="sm"
                  variant="secondary"
                  className="glass hover:bg-white/30 touch-button haptic-feedback"
                  onClick={() => setShowZoom(true)}
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  className="glass hover:bg-red-500/30 touch-button haptic-feedback"
                  onClick={clearImage}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Zoom modal */}
        <AnimatePresence>
          {showZoom && (
            <motion.div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowZoom(false)}
            >
              <motion.div
                className="relative max-w-4xl max-h-[90vh] w-full h-full flex items-center justify-center"
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.8 }}
                onClick={(e) => e.stopPropagation()}
              >
                <img 
                  src={previewImage} 
                  alt="Zoomed image" 
                  className="max-w-full max-h-full object-contain rounded-lg"
                />
                <Button
                  size="sm"
                  variant="secondary"
                  className="absolute top-4 right-4 glass touch-button haptic-feedback"
                  onClick={() => setShowZoom(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </>
    );
  }

  return (
    <motion.div
      className={`relative ${className}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <input
        type="file"
        accept={accept}
        onChange={handleFileInput}
        className="hidden"
        id="file-upload"
        disabled={isLoading}
      />
      
      <motion.label
        htmlFor="file-upload"
        className={`
          relative block w-full aspect-square max-w-md mx-auto cursor-pointer
          border-2 border-dashed rounded-2xl transition-all duration-300
          ${isDragOver 
            ? 'border-purple-500 bg-purple-50 scale-105' 
            : 'border-gray-300 hover:border-purple-400 hover:bg-gray-50'
          }
          ${isLoading ? 'pointer-events-none opacity-50' : ''}
        `}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <div className="absolute inset-0 rounded-2xl overflow-hidden">
          <div className="absolute inset-0 gradient-mesh opacity-20" />
          {isDragOver && (
            <motion.div
              className="absolute inset-0 bg-purple-500/10"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2 }}
            />
          )}
        </div>

        <div className="relative z-10 flex flex-col items-center justify-center h-full p-8 text-center">
          <motion.div
            className={`
              w-16 h-16 mb-6 rounded-full flex items-center justify-center
              ${isDragOver ? 'bg-purple-500 text-white' : 'bg-gray-100 text-gray-600'}
            `}
            animate={{ 
              scale: isDragOver ? 1.1 : 1,
              rotate: isLoading ? 360 : 0 
            }}
            transition={{ 
              rotate: { duration: 1, repeat: isLoading ? Infinity : 0, ease: "linear" }
            }}
          >
            {isLoading ? (
              <div className="animate-spin w-6 h-6 border-2 border-current border-t-transparent rounded-full" />
            ) : isDragOver ? (
              <Upload className="w-6 h-6" />
            ) : (
              <ImageIcon className="w-6 h-6" />
            )}
          </motion.div>

          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-gray-900">
              {isDragOver ? 'Drop your photo here' : 'Upload your photo'}
            </h3>
            <p className="text-sm text-gray-600">
              Drag & drop or click to browse
            </p>
            <p className="text-xs text-gray-500">
              PNG, JPG, WEBP up to 10MB
            </p>
          </div>

          {/* Mobile camera hint */}
          <motion.div 
            className="mt-6 flex items-center space-x-2 text-xs text-gray-400 md:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <Camera className="w-4 h-4" />
            <span>Or use your camera</span>
          </motion.div>
        </div>

        {/* Animated border */}
        <motion.div
          className="absolute inset-0 rounded-2xl border-2 border-transparent"
          style={{
            background: isDragOver 
              ? 'linear-gradient(45deg, transparent, transparent), linear-gradient(45deg, #8b5cf6, #06b6d4, #8b5cf6)'
              : 'none',
            backgroundClip: 'padding-box, border-box',
            backgroundOrigin: 'padding-box, border-box',
          }}
          animate={{
            backgroundPosition: isDragOver ? ['0% 50%', '100% 50%', '0% 50%'] : '0% 50%'
          }}
          transition={{
            duration: 2,
            repeat: isDragOver ? Infinity : 0,
            ease: "linear"
          }}
        />
      </motion.label>

      {/* Error message */}
      <AnimatePresence>
        {error && (
          <motion.div
            className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm text-center"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}