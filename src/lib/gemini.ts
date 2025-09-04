import { GoogleGenerativeAI } from "@google/generative-ai";
import { UsageTracker } from "./usage-tracking";

// Initialize Gemini AI with API key
function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }
  return new GoogleGenerativeAI(apiKey);
}

export type PaintingStyle = "classic" | "van_gogh" | "monet";

const stylePrompts: Record<PaintingStyle, string> = {
  classic: `Transform this pet photo into a classic Renaissance-style oil painting portrait. 
    Use rich, deep colors with dramatic chiaroscuro lighting reminiscent of Rembrandt. 
    Add visible brush strokes texture, golden-brown undertones, and a formal, dignified composition. 
    The pet should appear noble and majestic with careful attention to fur texture and eyes.
    Background should be dark and sophisticated with subtle gradients.`,
  
  van_gogh: `Transform this pet photo into a vibrant Van Gogh-style oil painting. 
    Use bold, swirling brushstrokes with thick impasto texture. Apply bright, contrasting colors 
    with vibrant yellows, deep blues, and vivid oranges. Create dynamic swirling movement in the background. 
    The pet's fur should have visible, energetic brushstrokes following the natural flow.
    Make it emotionally expressive with dramatic color contrasts and post-impressionist style.`,
  
  monet: `Transform this pet photo into a soft, impressionist Monet-style oil painting. 
    Use gentle, dappled brushstrokes with soft focus on details. Apply pastel tones with 
    hints of lavender, soft pink, and light blue. Create a dreamy, atmospheric quality with 
    soft edges and luminous colors. The overall effect should be peaceful and ethereal, 
    like viewing the pet through morning light in a garden with impressionist techniques.`
};

export async function generateOilPaintingPreview(
  imageBase64: string,
  style: PaintingStyle,
  userId?: string
): Promise<{ generatedImage: string; description: string }> {
  const modelName = "gemini-2.0-flash-exp";
  
  return UsageTracker.trackApiCall(
    async () => {
      console.log(`Starting Gemini API call for ${style} style...`);
      
      // Get Gemini client with runtime API key
      const genAI = getGeminiClient();
      
      // Using Gemini 2.0 Flash Experimental model (latest available)
      const model = genAI.getGenerativeModel({ 
        model: modelName
      });

      // Prepare the image and text prompt for transformation
      const prompt = stylePrompts[style];
      
      // Prepare the image data - ensure we're sending clean base64
      const cleanBase64 = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');
      const imagePart = {
        inlineData: {
          data: cleanBase64,
          mimeType: "image/jpeg",
        },
      };

      console.log("Calling Gemini generateContent with image and prompt...");
      
      // Generate the styled image by providing both image and text
      const result = await model.generateContent([imagePart, prompt]);
      const response = await result.response;
      
      console.log("Gemini response received:", {
        hasResponse: !!response,
        hasCandidates: !!response.candidates,
        candidatesLength: response.candidates?.length || 0
      });
      
      let generatedImageBase64 = '';
      let description = '';
      let inputTokens = 0;
      let outputTokens = 0;
      
      // Count tokens from response usage metadata if available
      if (response.usageMetadata) {
        inputTokens = response.usageMetadata.promptTokenCount || 0;
        outputTokens = response.usageMetadata.candidatesTokenCount || 0;
      }
      
      // Extract the generated image and any text description
      if (response.candidates && response.candidates[0]) {
        const parts = response.candidates[0].content.parts;
        console.log("Response parts:", parts.length, "Parts types:", parts.map(p => Object.keys(p)));
        
        for (const part of parts) {
          console.log("Part keys:", Object.keys(part));
          if (part.text) {
            console.log("Found text in response:", part.text.substring(0, 100));
            description = part.text;
            // Estimate output tokens from text length (rough approximation)
            if (!outputTokens) {
              outputTokens = Math.ceil(part.text.length / 4); // ~4 chars per token
            }
          } else if (part.inlineData) {
            console.log("Found image data in response, size:", part.inlineData.data.length);
            // The generated image is returned as base64
            generatedImageBase64 = `data:image/png;base64,${part.inlineData.data}`;
          }
        }
      } else {
        console.log("No candidates in response");
      }
      
      console.log("Generation result:", {
        hasGeneratedImage: !!generatedImageBase64,
        hasDescription: !!description,
        inputTokens,
        outputTokens
      });
      
      // If no description was provided, create one
      if (!description) {
        description = `Your pet has been transformed into a beautiful ${style.replace('_', ' ')} style oil painting. 
          The portrait captures the essence and personality of your beloved pet while applying the distinctive 
          artistic techniques of this classical style.`;
      }
      
      // Log additional usage info in metadata
      const metadata = {
        style,
        imageSize: cleanBase64.length,
        promptLength: prompt.length,
        hasGeneratedImage: !!generatedImageBase64,
        usageMetadata: response.usageMetadata
      };
      
      // Add metadata for usage tracking (this will be logged automatically by trackApiCall)
      (generateOilPaintingPreview as any)._trackingMetadata = {
        inputTokens,
        outputTokens,
        imageCount: 1, // One input image
        metadata
      };
      
      return {
        generatedImage: generatedImageBase64 || imageBase64, // Fallback to original if generation fails
        description
      };
    },
    {
      userId,
      apiType: 'gemini',
      endpoint: 'generateContent',
      model: modelName,
      operation: 'image_generation',
      inputTokens: (generateOilPaintingPreview as any)._trackingMetadata?.inputTokens || 0,
      outputTokens: (generateOilPaintingPreview as any)._trackingMetadata?.outputTokens || 0,
      imageCount: 1,
      metadata: (generateOilPaintingPreview as any)._trackingMetadata?.metadata
    }
  ).catch((error: any) => {
    console.error("Error generating oil painting preview:", error);
    console.error("Error details:", {
      message: error.message,
      stack: error.stack,
      response: error.response
    });
    
    // Fallback to returning the original image with a description
    return {
      generatedImage: imageBase64,
      description: `Preview generation is temporarily unavailable. Your portrait will be created in the ${style.replace('_', ' ')} style with professional artistic techniques.`
    };
  });
}

// CSS filters as fallback for preview enhancement
export const styleFilters: Record<PaintingStyle, string> = {
  classic: "sepia(30%) contrast(1.2) brightness(1.1) saturate(1.3)",
  van_gogh: "contrast(1.5) saturate(1.8) hue-rotate(10deg) brightness(1.1)",
  monet: "blur(0.5px) brightness(1.2) saturate(0.8) contrast(0.9)"
};