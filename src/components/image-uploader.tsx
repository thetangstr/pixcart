"use client";

import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, X, Image, AlertCircle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface ImageUploaderProps {
  onImageUpload: (imageData: string, file: File) => void;
  maxSizeInMB?: number;
  acceptedFormats?: string[];
  previewImage?: string;
}

export default function ImageUploader({ 
  onImageUpload, 
  maxSizeInMB = 10,
  acceptedFormats = ["image/jpeg", "image/jpg", "image/png", "image/webp"],
  previewImage
}: ImageUploaderProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<string | null>(previewImage || null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    // Check file type
    if (!acceptedFormats.includes(file.type)) {
      return `Please upload a valid image file (${acceptedFormats.map(f => f.split('/')[1]).join(', ').toUpperCase()})`;
    }

    // Check file size
    const fileSizeInMB = file.size / (1024 * 1024);
    if (fileSizeInMB > maxSizeInMB) {
      return `File size must be less than ${maxSizeInMB}MB`;
    }

    return null;
  };

  const processFile = useCallback(async (file: File) => {
    const error = validateFile(file);
    if (error) {
      toast.error(error);
      return;
    }

    setIsUploading(true);

    try {
      // Convert to base64
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setUploadedImage(result);
        setUploadedFile(file);
        onImageUpload(result.split(',')[1], file); // Remove data:image/jpeg;base64, prefix
        toast.success("Image uploaded successfully!");
      };
      reader.onerror = () => {
        toast.error("Failed to read the image file");
      };
      reader.readAsDataURL(file);
    } catch (error) {
      toast.error("Failed to upload image");
      console.error("Image upload error:", error);
    } finally {
      setIsUploading(false);
    }
  }, [onImageUpload, maxSizeInMB, acceptedFormats]);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragActive(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      processFile(files[0]);
    }
  }, [processFile]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragActive(false);
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      processFile(files[0]);
    }
  }, [processFile]);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleRemoveImage = () => {
    setUploadedImage(null);
    setUploadedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="w-full">
      <AnimatePresence mode="wait">
        {!uploadedImage ? (
          <motion.div
            key="uploader"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className={`
              relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer
              transition-all duration-300 ease-in-out
              ${isDragActive 
                ? 'border-purple-500 bg-purple-50 scale-105' 
                : 'border-gray-300 bg-gray-50 hover:border-purple-400 hover:bg-purple-25'
              }
              ${isUploading ? 'pointer-events-none opacity-60' : ''}
            `}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={handleClick}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept={acceptedFormats.join(',')}
              onChange={handleFileSelect}
              className="hidden"
            />

            <div className="flex flex-col items-center space-y-4">
              <motion.div
                animate={{
                  scale: isDragActive ? 1.1 : 1,
                  rotate: isDragActive ? 10 : 0,
                }}
                transition={{ type: "spring", stiffness: 300 }}
                className={`
                  w-16 h-16 rounded-full flex items-center justify-center
                  ${isDragActive 
                    ? 'bg-purple-600 text-white' 
                    : 'bg-purple-100 text-purple-600'
                  }
                  ${isUploading ? 'animate-pulse' : ''}
                `}
              >
                {isUploading ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-6 h-6 border-2 border-white border-t-transparent rounded-full"
                  />
                ) : (
                  <Upload className="w-8 h-8" />
                )}
              </motion.div>

              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-gray-900">
                  {isUploading ? 'Uploading...' : 'Upload your pet photo'}
                </h3>
                <p className="text-sm text-gray-600">
                  Drag and drop your image here, or click to browse
                </p>
                <p className="text-xs text-gray-500">
                  Supports JPG, PNG, WebP up to {maxSizeInMB}MB
                </p>
              </div>

              <Button
                variant="outline"
                className="mt-4"
                disabled={isUploading}
              >
                Choose File
              </Button>
            </div>

            <AnimatePresence>
              {isDragActive && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-purple-100/80 rounded-xl flex items-center justify-center"
                >
                  <div className="text-center">
                    <CheckCircle className="w-12 h-12 text-purple-600 mx-auto mb-2" />
                    <p className="text-purple-700 font-medium">Drop your image here!</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ) : (
          <motion.div
            key="preview"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className="relative group"
          >
            <div className="relative rounded-xl overflow-hidden bg-gray-100 shadow-lg">
              <img
                src={uploadedImage}
                alt="Uploaded preview"
                className="w-full h-auto max-h-96 object-contain"
              />
              
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-200"
              >
                <Button
                  onClick={handleRemoveImage}
                  variant="destructive"
                  size="sm"
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                >
                  <X className="w-4 h-4" />
                </Button>
              </motion.div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg"
            >
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-green-800">
                    Image uploaded successfully!
                  </p>
                  {uploadedFile && (
                    <p className="text-xs text-green-600">
                      {uploadedFile.name} ({(uploadedFile.size / (1024 * 1024)).toFixed(2)}MB)
                    </p>
                  )}
                </div>
              </div>
            </motion.div>

            <Button
              onClick={() => fileInputRef.current?.click()}
              variant="outline"
              className="w-full mt-3"
            >
              <Image className="w-4 h-4 mr-2" />
              Upload Different Image
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}