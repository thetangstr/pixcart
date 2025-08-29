/**
 * Hybrid Model API - Smart SDXL + Gemini System
 * 
 * Primary: Stable Diffusion SDXL (optimized local pipeline)
 * Backup: Gemini 2.5 Flash (after user generates 3+ images)
 * 
 * This provides the best user experience:
 * - New users get fast, optimized SDXL results
 * - Experienced users unlock premium Gemini quality
 */

import { NextRequest, NextResponse } from 'next/server';
import { ComfyUIClient } from '@/app/lib/comfyui-client';
import { GeminiClient, type GeminiImageRequest } from '@/app/lib/gemini-client';
import { UsageTracker } from '@/app/lib/usage-tracker';

// Dramatically enhanced SDXL settings for true oil painting transformation
const SDXL_OPTIMIZED_PRESETS = {
  classic: {
    denoisingStrength: 0.65, // Much higher for dramatic oil painting transformation
    controlNetWeights: { canny: 0.3, depth: 0.25, openpose: 0.0 }, // Lower to allow more artistic freedom
    cfgScale: 12.0, // Strong prompt adherence for classical style
    steps: 60, // More steps for quality
    scheduler: 'karras',
    sampler: 'dpmpp_2m'
  },
  vangogh: {
    denoisingStrength: 0.75, // Very high for Van Gogh's expressive style
    controlNetWeights: { canny: 0.25, depth: 0.2, openpose: 0.0 }, // Allow dramatic transformation
    cfgScale: 13.0, // Very strong guidance for Van Gogh's distinctive style
    steps: 65,
    scheduler: 'karras',
    sampler: 'dpmpp_2m'
  },
  impressionist: {
    denoisingStrength: 0.70, // High for impressionist transformation
    controlNetWeights: { canny: 0.25, depth: 0.3, openpose: 0.0 },
    cfgScale: 10.0, // Balanced for impressionist style
    steps: 55,
    scheduler: 'karras',
    sampler: 'dpmpp_sde' // Different sampler for softer impressionist look
  },
  modern: {
    denoisingStrength: 0.80, // Highest for modern abstract interpretation
    controlNetWeights: { canny: 0.2, depth: 0.2, openpose: 0.0 }, // Maximum artistic freedom
    cfgScale: 11.0, // Strong but not overwhelming
    steps: 50,
    scheduler: 'karras',
    sampler: 'euler' // Different sampler for modern style
  }
};

/**
 * Enhanced prompts for SDXL - Matching Gemini's detailed instructional style
 */
function buildSDXLPrompt(style: string, subject: string = 'general'): { positive: string; negative: string } {
  const basePrompts = {
    classic: 'Transform into a masterpiece oil painting in the style of classical portraiture, preserving the exact subject identity, pose, and key features. Use thick impasto technique with visible brushstrokes, rich oil paint texture, warm classical color palette, dramatic chiaroscuro lighting, painted with the sophistication of John Singer Sargent or Rembrandt. Heavy paint application, sculptural brushwork, museum-quality finish',
    vangogh: 'Transform into an oil painting in Vincent van Gogh\'s distinctive style, preserving the exact subject identity, pose, and key features. Use swirling, expressive brushstrokes, vibrant complementary colors, thick impasto paint application, dynamic movement in brushwork, emotional intensity through color and texture. Post-impressionist technique with bold, confident strokes and luminous color combinations',
    impressionist: 'Transform into an impressionist oil painting in Claude Monet\'s style, preserving the exact subject identity, pose, and key features. Use broken color technique, soft atmospheric effects, natural lighting, loose brushstrokes capturing light and movement, en plein air quality, harmonious color palette, emphasis on light and its changing qualities. Painterly finish with visible but refined brushwork',
    modern: 'Transform into a contemporary oil painting with modern artistic interpretation, preserving the exact subject identity, pose, and key features. Use bold color choices, confident brushstrokes, contemporary artistic sensibility, thick paint application, expressive technique, modern color palette, artistic interpretation while maintaining painterly oil texture'
  };

  const negativePrompt = 'photograph, photo, digital art, 3d render, smooth surface, flat colors, anime, cartoon, watercolor, airbrushed, photorealistic, plastic, blurry, low quality, digital painting';

  return {
    positive: basePrompts[style as keyof typeof basePrompts] || basePrompts.classic,
    negative: negativePrompt
  };
}

/**
 * Process with SDXL (Primary Model)
 */
async function processWithSDXL(
  imageBase64: string,
  style: string,
  subject: string
): Promise<{ success: boolean; image?: string; processingTime: number; error?: string; settings?: any }> {
  const startTime = Date.now();
  
  try {
    const comfyClient = new ComfyUIClient();
    let preset = SDXL_OPTIMIZED_PRESETS[style as keyof typeof SDXL_OPTIMIZED_PRESETS];
    
    // Fallback to classic if style not found
    if (!preset) {
      console.log(`⚠️ Style '${style}' not found, using 'classic' preset`);
      preset = SDXL_OPTIMIZED_PRESETS.classic;
    }
    
    const prompts = buildSDXLPrompt(style, subject);
    
    console.log(`🖥️ Processing with optimized SDXL pipeline (style: ${style})...`);
    
    // Use the optimized SDXL pipeline
    const result = await comfyClient.convertImageWithSDXL(imageBase64, {
      checkpoint: 'sd_xl_base_1.0_0.9vae.safetensors',
      positive_prompt: prompts.positive,
      negative_prompt: prompts.negative,
      denoise: preset.denoisingStrength,
      cfg: preset.cfgScale,
      steps: preset.steps,
      scheduler: preset.scheduler,
      sampler_name: preset.sampler,
      seed: Math.floor(Math.random() * 1000000000),
      explicitStyle: style // Pass the explicit style directly
    } as any);

    const processingTime = Date.now() - startTime;
    console.log(`✅ SDXL completed in ${processingTime}ms`);

    return {
      success: true,
      image: result,
      processingTime,
      settings: preset
    };

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error('SDXL processing failed:', error);
    
    return {
      success: false,
      processingTime,
      error: error instanceof Error ? error.message : 'SDXL processing failed'
    };
  }
}

/**
 * Process with Gemini 2.5 Flash (Premium Model)
 */
async function processWithGemini(
  imageBase64: string,
  style: string,
  subject: string,
  preservationMode: string = 'high'
): Promise<{ success: boolean; image?: string; processingTime: number; error?: string; metadata?: any }> {
  try {
    console.log('🚀 Processing with Gemini 2.5 Flash (Premium)...');
    
    const geminiClient = new GeminiClient();
    
    // Map styles for Gemini
    const geminiStyle = style === 'impressionist' ? 'monet' : style;
    
    const request: GeminiImageRequest = {
      style: geminiStyle,
      inputImage: imageBase64,
      preservationMode: preservationMode as any,
      quality: 'high'
    };

    // Use specialized methods based on subject
    let result;
    if (subject === 'portrait') {
      result = await geminiClient.convertPortraitToOilPainting(imageBase64, geminiStyle);
    } else if (subject === 'pet') {
      result = await geminiClient.convertPetToOilPainting(imageBase64, geminiStyle);
    } else {
      result = await geminiClient.convertToOilPainting(request);
    }

    if (result.success) {
      console.log(`⚡ Gemini completed in ${result.processingTime}ms`);
    }

    return result;

  } catch (error) {
    console.error('Gemini processing failed:', error);
    
    return {
      success: false,
      processingTime: 0,
      error: error instanceof Error ? error.message : 'Gemini processing failed'
    };
  }
}

/**
 * Main hybrid conversion endpoint
 */
export async function POST(req: NextRequest) {
  console.log('🎨 Hybrid Model API called (SDXL Primary + Gemini Premium)');
  
  try {
    const formData = await req.formData();
    const image = formData.get('image') as File;
    const style = (formData.get('style') as string) || 'classic';
    const subject = (formData.get('subject') as string) || 'general';
    const mode = (formData.get('mode') as string) || 'hybrid';
    const preservationMode = (formData.get('preservationMode') as string) || 'high';
    const sessionId = (formData.get('sessionId') as string);

    if (!image) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    // Convert image to base64
    const buffer = await image.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    const imageBase64 = `data:${image.type};base64,${base64}`;

    // Get user's current usage (for tracking only, not decision making)
    const currentUsage = UsageTracker.getCurrentUsage(sessionId);
    const progress = UsageTracker.getUpgradeProgress(sessionId);

    console.log(`👤 User Stats: ${currentUsage.totalGenerations} total generations`);
    console.log(`🤖 Primary Model: Gemini 2.5 Flash`);

    let result;
    let modelUsed: 'sdxl' | 'gemini';
    let fallbackUsed = false;

    // Primary: Always use Gemini as default
    console.log('💎 Using Gemini (Primary Model)...');
    result = await processWithGemini(imageBase64, style, subject, preservationMode);
    modelUsed = 'gemini';

    // If Gemini fails, fallback to SDXL (if available)
    if (!result.success) {
      console.log('🔄 Gemini failed, trying SDXL fallback...');
      const sdxlResult = await processWithSDXL(imageBase64, style, subject);
      if (sdxlResult.success) {
        result = sdxlResult;
        modelUsed = 'sdxl';
        fallbackUsed = true;
        console.log('✅ SDXL fallback successful!');
      }
    }

    if (!result.success) {
      // Provide detailed error information
      const errorMessage = fallbackUsed ? 
        `Both models failed. Primary: SDXL (${result.error}), Fallback: Gemini also failed.` :
        `Primary model failed: ${result.error}. Gemini is primary model.`;
      
      return NextResponse.json({
        error: errorMessage,
        details: {
          primaryModel: 'gemini',
          fallbackAttempted: fallbackUsed,
          sdxlAvailable: false,
          geminiAvailable: process.env.GEMINI_API_KEY ? true : false,
          suggestion: 'Check if ComfyUI is running on localhost:8188 or verify Gemini API key'
        },
        userProgress: progress
      }, { status: 500 });
    }

    // Record the successful generation
    const updatedUsage = UsageTracker.recordGeneration(modelUsed, sessionId);
    const newProgress = UsageTracker.getUpgradeProgress(sessionId);

    console.log(`📊 Generation recorded: ${modelUsed} (Total: ${updatedUsage.totalGenerations})`);

    // Prepare response with model information
    const response = {
      success: true,
      image: result.image,
      bestResult: { // For compatibility with existing frontend
        image: result.image,
        provider: modelUsed === 'gemini' ? 'gemini-2.5-flash-image-preview' : 'sdxl-optimized',
        processingTime: result.processingTime
      },
      modelInfo: {
        primary: modelUsed,
        fallbackUsed,
        provider: modelUsed === 'gemini' ? 'gemini-2.5-flash-image-preview' : 'sdxl-optimized',
        processingTime: result.processingTime,
        cost: modelUsed === 'gemini' ? 0.039 : 0.01 // Estimated costs
      },
      userProgress: {
        current: newProgress.current,
        required: newProgress.required,
        remaining: newProgress.remaining,
        justUpgraded: false, // Not relevant since Gemini is always default
        nextModel: 'gemini' // Always Gemini now
      },
      style,
      subject,
      settings: (result as any).settings || (result as any).metadata
    };

    // Special message if user just unlocked Gemini
    if (response.userProgress.justUpgraded) {
      console.log('🎉 User just unlocked Gemini Premium!');
    }

    return NextResponse.json(response);

  } catch (error) {
    console.error('Hybrid API error:', error);
    
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Hybrid processing failed'
    }, { status: 500 });
  }
}

/**
 * GET endpoint for system status
 */
export async function GET() {
  try {
    return NextResponse.json({
      system: 'hybrid',
      models: {
        primary: 'sdxl-optimized',
        premium: 'gemini-2.5-flash-image-preview'
      },
      upgradeThreshold: 3,
      features: {
        sdxl: ['fast_processing', 'optimized_presets', 'controlnet_support'],
        gemini: ['premium_quality', 'advanced_reasoning', 'character_consistency', 'synthid_watermark']
      },
      pricing: {
        sdxl: { estimated: 0.01, currency: 'USD' },
        gemini: { actual: 0.039, currency: 'USD' }
      }
    });
  } catch (error) {
    return NextResponse.json({
      system: 'hybrid',
      error: error instanceof Error ? error.message : 'Status check failed'
    });
  }
}