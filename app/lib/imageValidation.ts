// Image validation utilities for PetCanvas

export interface ValidationResult {
  isValid: boolean
  error?: string
  warning?: string
  details?: {
    format?: string
    width?: number
    height?: number
    size?: number
    sizeInMB?: number
  }
}

// Supported image formats
export const SUPPORTED_FORMATS = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
export const SUPPORTED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp']

// Size limits
export const MAX_FILE_SIZE_MB = 10 // 10MB max
export const MAX_FILE_SIZE = MAX_FILE_SIZE_MB * 1024 * 1024 // in bytes
export const MIN_DIMENSION = 200 // minimum width or height in pixels
export const MAX_DIMENSION = 4096 // maximum width or height in pixels
export const RECOMMENDED_MIN_DIMENSION = 512 // recommended minimum for quality

export async function validateImageFile(file: File): Promise<ValidationResult> {
  // Check file type
  if (!file.type || !SUPPORTED_FORMATS.includes(file.type.toLowerCase())) {
    const extension = file.name.split('.').pop()?.toLowerCase()
    return {
      isValid: false,
      error: `Unsupported file format. Please upload a JPG, PNG, or WebP image. (Received: ${extension || 'unknown'})`
    }
  }

  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    const sizeMB = (file.size / 1024 / 1024).toFixed(1)
    return {
      isValid: false,
      error: `File too large. Maximum size is ${MAX_FILE_SIZE_MB}MB. Your file is ${sizeMB}MB.`,
      details: {
        size: file.size,
        sizeInMB: parseFloat(sizeMB)
      }
    }
  }

  // Load image to check dimensions
  return new Promise((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    
    img.onload = () => {
      URL.revokeObjectURL(url)
      
      const width = img.width
      const height = img.height
      
      // Check minimum dimensions
      if (width < MIN_DIMENSION || height < MIN_DIMENSION) {
        resolve({
          isValid: false,
          error: `Image too small. Minimum size is ${MIN_DIMENSION}x${MIN_DIMENSION} pixels. Your image is ${width}x${height}.`,
          details: { width, height, format: file.type }
        })
        return
      }
      
      // Check maximum dimensions
      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        resolve({
          isValid: false,
          error: `Image too large. Maximum dimension is ${MAX_DIMENSION} pixels. Your image is ${width}x${height}.`,
          details: { width, height, format: file.type }
        })
        return
      }
      
      // Check if image is too small for optimal quality
      let warning: string | undefined
      if (width < RECOMMENDED_MIN_DIMENSION || height < RECOMMENDED_MIN_DIMENSION) {
        warning = `For best results, we recommend images at least ${RECOMMENDED_MIN_DIMENSION}x${RECOMMENDED_MIN_DIMENSION} pixels.`
      }
      
      // Check aspect ratio (warn if too extreme)
      const aspectRatio = width / height
      if (aspectRatio > 3 || aspectRatio < 0.33) {
        warning = `Your image has an unusual aspect ratio. For best results, use portrait or square photos of your pet.`
      }
      
      resolve({
        isValid: true,
        warning,
        details: {
          width,
          height,
          format: file.type,
          size: file.size,
          sizeInMB: parseFloat((file.size / 1024 / 1024).toFixed(2))
        }
      })
    }
    
    img.onerror = () => {
      URL.revokeObjectURL(url)
      resolve({
        isValid: false,
        error: 'Failed to load image. Please ensure the file is a valid image.'
      })
    }
    
    img.src = url
  })
}

export async function validatePetImage(
  imageDataUrl: string,
  onProgress?: (message: string) => void
): Promise<ValidationResult> {
  // This is a placeholder for actual pet detection
  // In a production app, you would use a service like:
  // - TensorFlow.js with a pre-trained model
  // - Cloud Vision API
  // - Custom ML model
  
  onProgress?.('Analyzing image for pet detection...')
  
  // Simulate pet detection with basic heuristics
  // In reality, this would use ML models
  await new Promise(resolve => setTimeout(resolve, 500))
  
  // For now, we'll provide helpful guidance
  const tips = [
    'Ensure your pet is clearly visible in the photo',
    'Use a photo with good lighting',
    'Pet should be the main subject of the photo',
    'Avoid photos with more than 3 pets',
    'Close-up portraits work best for oil paintings'
  ]
  
  return {
    isValid: true,
    warning: 'Tip: ' + tips[Math.floor(Math.random() * tips.length)]
  }
}

export function getImageDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => resolve(e.target?.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

// Helper to check if image appears to be a pet portrait
export async function analyzePetPortrait(imageDataUrl: string): Promise<{
  isPetDetected: boolean
  confidence: number
  suggestions: string[]
}> {
  // This would use actual ML in production
  // For now, return guidance
  return {
    isPetDetected: true, // Assume it's a pet for now
    confidence: 0.8,
    suggestions: [
      'For best results, ensure your pet fills at least 30% of the frame',
      'Avoid busy backgrounds - simple backgrounds work best',
      'Natural lighting produces the most realistic oil paintings'
    ]
  }
}