/**
 * Google Gemini 2.5 Flash Image Generation Client
 * 
 * Replaces Stable Diffusion/ComfyUI with Google's latest image generation model
 * Optimized for oil painting style conversion
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

export interface GeminiImageRequest {
  style: string;
  inputImage?: string; // Base64 image for image-to-image conversion
  prompt?: string; // Optional custom prompt
  preservationMode?: 'low' | 'medium' | 'high' | 'extreme';
  quality?: 'standard' | 'high';
}

export interface GeminiImageResponse {
  success: boolean;
  image?: string; // Base64 image
  processingTime: number;
  model: string;
  error?: string;
  metadata?: {
    style: string;
    preservationMode: string;
    prompt: string;
  };
}

export class GeminiClient {
  private genai: GoogleGenerativeAI;
  private model: string = 'gemini-2.5-flash-image-preview';

  constructor(apiKey?: string) {
    const key = apiKey || process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error('Gemini API key is required. Set GEMINI_API_KEY environment variable.');
    }
    this.genai = new GoogleGenerativeAI(key);
  }

  /**
   * Oil Painting Style Presets
   * Optimized prompts for different oil painting styles
   */
  private getStylePrompt(style: string, preservationMode: string = 'high'): string {
    const preservationPrompts = {
      low: 'loosely based on the subject',
      medium: 'maintaining the general composition and main subject', 
      high: 'preserving the exact subject identity, pose, and key features',
      extreme: 'maintaining EXACT subject identity, facial features, body pose, and all distinctive characteristics'
    };

    const stylePrompts = {
      classic: `Transform into a masterpiece oil painting in the style of classical portraiture. 
        ${preservationPrompts[preservationMode as keyof typeof preservationPrompts]}.
        Use thick impasto technique with visible brushstrokes, rich oil paint texture, 
        warm classical color palette, dramatic chiaroscuro lighting, 
        painted with the sophistication of John Singer Sargent or Rembrandt. 
        Heavy paint application, sculptural brushwork, museum-quality finish.`,
        
      vangogh: `Transform into an oil painting in Vincent van Gogh's distinctive style.
        ${preservationPrompts[preservationMode as keyof typeof preservationPrompts]}.
        Use swirling, expressive brushstrokes, vibrant complementary colors, 
        thick impasto paint application, dynamic movement in brushwork,
        emotional intensity through color and texture. Post-impressionist technique
        with bold, confident strokes and luminous color combinations.`,
        
      monet: `Transform into an impressionist oil painting in Claude Monet's style.
        ${preservationPrompts[preservationMode as keyof typeof preservationPrompts]}.
        Use broken color technique, soft atmospheric effects, natural lighting,
        loose brushstrokes capturing light and movement, en plein air quality,
        harmonious color palette, emphasis on light and its changing qualities.
        Painterly finish with visible but refined brushwork.`,
        
      modern: `Transform into a contemporary oil painting with modern artistic interpretation.
        ${preservationPrompts[preservationMode as keyof typeof preservationPrompts]}.
        Use bold color choices, confident brushstrokes, contemporary artistic sensibility,
        thick paint application, expressive technique, modern color palette,
        artistic interpretation while maintaining painterly oil texture.`
    };

    return stylePrompts[style as keyof typeof stylePrompts] || stylePrompts.classic;
  }

  /**
   * Convert image to oil painting using Gemini 2.5 Flash
   */
  async convertToOilPainting(request: GeminiImageRequest): Promise<GeminiImageResponse> {
    const startTime = Date.now();
    
    try {
      const model = this.genai.getGenerativeModel({ model: this.model });
      
      // Build the prompt
      const stylePrompt = this.getStylePrompt(
        request.style, 
        request.preservationMode || 'high'
      );
      
      const fullPrompt = request.prompt || stylePrompt;
      
      // Prepare the request content
      const contents: any[] = [fullPrompt];
      
      // Add input image if provided (for image-to-image conversion)
      if (request.inputImage) {
        // Extract MIME type and base64 data
        const mimeTypeMatch = request.inputImage.match(/^data:([^;]+);base64,/);
        const mimeType = mimeTypeMatch ? mimeTypeMatch[1] : 'image/jpeg';
        const imageData = request.inputImage.replace(/^data:[^;]+;base64,/, '');
        
        contents.push({
          inlineData: {
            mimeType: mimeType,
            data: imageData
          }
        });
      }

      // Generate the image
      const response = await model.generateContent(contents);
      
      // Extract the generated image from response
      let generatedImage: string | undefined;
      
      for (const candidate of response.response.candidates || []) {
        for (const part of candidate.content?.parts || []) {
          if (part.inlineData) {
            // Convert to base64 data URL format
            generatedImage = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
            break;
          }
        }
        if (generatedImage) break;
      }

      if (!generatedImage) {
        throw new Error('No image generated in response');
      }

      const processingTime = Date.now() - startTime;

      return {
        success: true,
        image: generatedImage,
        processingTime,
        model: this.model,
        metadata: {
          style: request.style,
          preservationMode: request.preservationMode || 'high',
          prompt: fullPrompt
        }
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      console.error('Gemini image generation error:', error);
      
      return {
        success: false,
        processingTime,
        model: this.model,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        metadata: {
          style: request.style,
          preservationMode: request.preservationMode || 'high',
          prompt: request.prompt || 'Failed to generate prompt'
        }
      };
    }
  }

  /**
   * Generate oil painting from text description only (text-to-image)
   */
  async generateOilPaintingFromText(
    description: string, 
    style: string = 'classic',
    quality: 'standard' | 'high' = 'standard'
  ): Promise<GeminiImageResponse> {
    const stylePrompt = this.getStylePrompt(style, 'medium');
    const fullPrompt = `${description}. ${stylePrompt}`;

    return this.convertToOilPainting({
      style,
      prompt: fullPrompt,
      quality
    });
  }

  /**
   * Enhanced portrait conversion with face preservation
   */
  async convertPortraitToOilPainting(
    inputImage: string,
    style: string = 'classic'
  ): Promise<GeminiImageResponse> {
    const portraitPrompt = this.getStylePrompt(style, 'extreme') + 
      ` Pay special attention to preserving facial features, expression, and identity.
      This is a portrait that must maintain the person's recognizable characteristics
      while applying beautiful oil painting techniques.`;

    return this.convertToOilPainting({
      style,
      inputImage,
      prompt: portraitPrompt,
      preservationMode: 'extreme',
      quality: 'high'
    });
  }

  /**
   * Pet/Animal conversion with species preservation
   */
  async convertPetToOilPainting(
    inputImage: string,
    style: string = 'classic'
  ): Promise<GeminiImageResponse> {
    const petPrompt = this.getStylePrompt(style, 'extreme') +
      ` This is a beloved pet that must maintain the exact same animal species,
      breed characteristics, markings, and distinctive features. 
      Preserve the animal's identity completely while applying beautiful oil painting style.`;

    return this.convertToOilPainting({
      style,
      inputImage,
      prompt: petPrompt,
      preservationMode: 'extreme',
      quality: 'high'
    });
  }

  /**
   * Batch conversion for multiple images
   */
  async convertBatch(requests: GeminiImageRequest[]): Promise<GeminiImageResponse[]> {
    const results: GeminiImageResponse[] = [];
    
    // Process sequentially to avoid rate limits
    for (const request of requests) {
      const result = await this.convertToOilPainting(request);
      results.push(result);
      
      // Add small delay between requests to respect rate limits
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    return results;
  }

  /**
   * Check if Gemini API is available
   */
  async checkHealth(): Promise<{ available: boolean; model: string; error?: string }> {
    try {
      const model = this.genai.getGenerativeModel({ model: this.model });
      
      // Test with a simple text generation (cheaper than image generation)
      await model.generateContent('Hello');
      
      return {
        available: true,
        model: this.model
      };
    } catch (error) {
      return {
        available: false,
        model: this.model,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

export default GeminiClient;