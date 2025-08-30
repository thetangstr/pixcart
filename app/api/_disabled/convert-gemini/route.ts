/**
 * Gemini 2.5 Flash Oil Painting Conversion API
 * 
 * Replaces Stable Diffusion/ComfyUI with Google's Gemini 2.5 Flash Image Preview
 * Optimized for photo-to-oil-painting conversion
 */

import { NextRequest, NextResponse } from 'next/server';
import { GeminiClient, type GeminiImageRequest } from '@/app/lib/gemini-client';

// Enhanced oil painting style definitions for Gemini
const GEMINI_STYLE_CONFIGS = {
  classic: {
    name: 'Classic Oil Portrait',
    description: 'Traditional oil painting with classical techniques',
    preservationMode: 'extreme' as const,
    quality: 'high' as const
  },
  vangogh: {
    name: 'Van Gogh Style',
    description: 'Post-impressionist style with swirling brushstrokes',
    preservationMode: 'high' as const,
    quality: 'high' as const
  },
  monet: {
    name: 'Impressionist Style',
    description: 'Monet-inspired impressionist technique',
    preservationMode: 'high' as const,
    quality: 'high' as const
  },
  modern: {
    name: 'Contemporary Oil',
    description: 'Modern artistic interpretation in oil',
    preservationMode: 'medium' as const,
    quality: 'standard' as const
  }
};

/**
 * Detect subject type for optimized processing
 */
function detectSubjectType(imageBase64: string): 'portrait' | 'pet' | 'landscape' | 'general' {
  // For now, return general - in production could use image analysis
  // Could analyze image dimensions, EXIF data, or use a vision model
  return 'general';
}

/**
 * Convert image to oil painting using Gemini 2.5 Flash
 */
export async function POST(req: NextRequest) {
  console.log('🎨 Gemini 2.5 Flash Oil Painting API called');
  
  try {
    // Parse form data
    const formData = await req.formData();
    const image = formData.get('image') as File;
    const style = (formData.get('style') as string) || 'classic';
    const subjectHint = formData.get('subject') as string;
    const preservationMode = (formData.get('preservationMode') as string) || 'high';
    const quality = (formData.get('quality') as string) || 'high';

    if (!image) {
      return NextResponse.json(
        { error: 'No image provided' }, 
        { status: 400 }
      );
    }

    // Validate style
    if (!GEMINI_STYLE_CONFIGS[style as keyof typeof GEMINI_STYLE_CONFIGS]) {
      return NextResponse.json(
        { error: `Invalid style: ${style}. Valid styles: ${Object.keys(GEMINI_STYLE_CONFIGS).join(', ')}` },
        { status: 400 }
      );
    }

    // Convert image to base64
    const buffer = await image.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    const imageBase64 = `data:${image.type};base64,${base64}`;

    // Detect subject type
    const subjectType = subjectHint as any || detectSubjectType(imageBase64);
    console.log(`📸 Subject detected: ${subjectType}`);
    console.log(`🎨 Style selected: ${style}`);

    // Get style configuration
    const styleConfig = GEMINI_STYLE_CONFIGS[style as keyof typeof GEMINI_STYLE_CONFIGS];

    // Initialize Gemini client
    const geminiClient = new GeminiClient();

    // Prepare request
    const geminiRequest: GeminiImageRequest = {
      style,
      inputImage: imageBase64,
      preservationMode: (preservationMode as any) || styleConfig.preservationMode,
      quality: (quality as any) || styleConfig.quality
    };

    console.log('🚀 Starting Gemini image generation...');
    const startTime = Date.now();

    // Use specialized methods based on subject type
    let result;
    switch (subjectType) {
      case 'portrait':
        result = await geminiClient.convertPortraitToOilPainting(imageBase64, style);
        break;
      case 'pet':
        result = await geminiClient.convertPetToOilPainting(imageBase64, style);
        break;
      default:
        result = await geminiClient.convertToOilPainting(geminiRequest);
    }

    const totalTime = Date.now() - startTime;
    console.log(`⚡ Gemini processing completed in ${totalTime}ms`);

    if (!result.success) {
      console.error('Gemini generation failed:', result.error);
      return NextResponse.json(
        { 
          error: `Gemini generation failed: ${result.error}`,
          processingTime: result.processingTime 
        },
        { status: 500 }
      );
    }

    // Return successful result
    return NextResponse.json({
      success: true,
      image: result.image,
      metadata: {
        provider: 'gemini-2.5-flash-image-preview',
        style: styleConfig.name,
        subjectType,
        preservationMode: result.metadata?.preservationMode,
        processingTime: result.processingTime,
        model: result.model,
        prompt: result.metadata?.prompt,
        costPerImage: 0.039, // $0.039 per image as per Gemini pricing
        totalCost: 0.039
      },
      optimization: {
        model: 'gemini-2.5-flash-image-preview',
        provider: 'google',
        native_image_generation: true,
        multimodal: true,
        conversational: true,
        synthid_watermark: true
      }
    });

  } catch (error) {
    console.error('Gemini API error:', error);
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Gemini processing failed',
        provider: 'gemini-2.5-flash-image-preview'
      },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint for health check and model info
 */
export async function GET() {
  try {
    const geminiClient = new GeminiClient();
    const health = await geminiClient.checkHealth();
    
    return NextResponse.json({
      provider: 'gemini-2.5-flash-image-preview',
      available: health.available,
      model: health.model,
      styles: Object.keys(GEMINI_STYLE_CONFIGS),
      styleConfigs: GEMINI_STYLE_CONFIGS,
      features: [
        'text-to-image',
        'image-to-image', 
        'conversational_editing',
        'character_consistency',
        'image_merging',
        'advanced_reasoning',
        'synthid_watermark'
      ],
      pricing: {
        costPerImage: 0.039,
        currency: 'USD',
        tokensPerImage: 1290,
        costPer1MTokens: 30.00
      },
      error: health.error
    });
  } catch (error) {
    return NextResponse.json({
      provider: 'gemini-2.5-flash-image-preview',
      available: false,
      error: error instanceof Error ? error.message : 'Health check failed'
    });
  }
}