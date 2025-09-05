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

export type PaintingStyle = "renaissance" | "van_gogh" | "monet";

const stylePrompts: Record<PaintingStyle, string> = {
  renaissance: `Analyze this pet photo and provide detailed artistic instructions for creating a Renaissance-style oil painting portrait.
    Describe: the ideal color palette (rich browns, deep reds, golden undertones), 
    lighting approach (dramatic chiaroscuro, single light source), 
    composition (formal, dignified pose, 3/4 view preferred),
    background elements (dark, sophisticated gradients, perhaps draped fabric),
    and specific brushwork techniques for rendering the pet's fur texture.
    Focus on making the pet appear noble and majestic, as if painted by a Renaissance master.`,
  
  van_gogh: `Analyze this pet photo and provide detailed artistic instructions for creating a Van Gogh-style oil painting.
    Describe: the vibrant color palette (bold yellows, deep blues, vivid oranges),
    distinctive brushstroke patterns (swirling, energetic, thick impasto),
    how to capture the pet's personality with expressive, emotional strokes,
    background treatment (dynamic swirls, perhaps starry night elements or sunflowers),
    and how to apply post-impressionist techniques to convey movement and energy.
    The result should be emotionally charged and visually dynamic.`,
  
  monet: `Analyze this pet photo and provide detailed artistic instructions for creating a Monet-style impressionist oil painting.
    Describe: the soft color palette (pastels, lavenders, soft pinks, light blues),
    brushstroke technique (gentle, dappled, broken color),
    how to create atmospheric effects (soft focus, luminous quality),
    garden or outdoor setting suggestions,
    and how to capture light and shadow with impressionist methods.
    The overall effect should be dreamy and peaceful, as if painted en plein air.`
};

export async function generateOilPaintingPreview(
  imageBase64: string,
  style: PaintingStyle,
  userId?: string
): Promise<{ generatedImage: string; description: string }> {
  const modelName = "models/gemini-2.5-flash-image-preview";
  
  return UsageTracker.trackApiCall(
    async () => {
      console.log(`Starting Gemini API call for ${style} style...`);
      
      // Get Gemini client with runtime API key
      let genAI;
      try {
        genAI = getGeminiClient();
        console.log("Gemini client initialized successfully");
      } catch (error) {
        console.error("Failed to initialize Gemini client:", error);
        throw error;
      }
      
      // Using Gemini Flash model
      const model = genAI.getGenerativeModel({ 
        model: modelName
      });
      console.log(`Using Gemini model: ${modelName}`);

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
      
      // Get artistic instructions from Gemini
      const result = await model.generateContent([imagePart, prompt]);
      const response = await result.response;
      
      console.log("Gemini response received:", {
        hasResponse: !!response,
        hasCandidates: !!response.candidates,
        candidatesLength: response.candidates?.length || 0
      });
      
      let description = '';
      let inputTokens = 0;
      let outputTokens = 0;
      
      // Count tokens from response usage metadata if available
      if (response.usageMetadata) {
        inputTokens = response.usageMetadata.promptTokenCount || 0;
        outputTokens = response.usageMetadata.candidatesTokenCount || 0;
      }
      
      // Extract the artistic instructions
      if (response.candidates && response.candidates[0]) {
        const text = response.text();
        console.log("Artistic instructions received, length:", text.length);
        description = text;
        
        // Estimate tokens if not provided
        if (!outputTokens) {
          outputTokens = Math.ceil(text.length / 4); // ~4 chars per token
        }
      } else {
        console.log("No response from Gemini");
        throw new Error("Failed to get artistic instructions from Gemini");
      }
      
      console.log("Analysis result:", {
        hasDescription: !!description,
        descriptionLength: description.length,
        inputTokens,
        outputTokens
      });
      
      // If no description was provided, create a fallback
      if (!description) {
        description = `Your pet portrait will be created in the ${style.replace('_', ' ')} style. 
          Our artists will capture your pet's unique personality using authentic oil painting techniques 
          and the distinctive artistic approach of this classical style.`;
      }
      
      // Log additional usage info in metadata
      const metadata = {
        style,
        imageSize: cleanBase64.length,
        promptLength: prompt.length,
        hasDescription: !!description,
        usageMetadata: response.usageMetadata
      };
      
      // Add metadata for usage tracking (this will be logged automatically by trackApiCall)
      (generateOilPaintingPreview as any)._trackingMetadata = {
        inputTokens,
        outputTokens,
        imageCount: 1, // One input image
        metadata
      };
      
      // Apply CSS filter to give a preview effect
      // Since Gemini doesn't generate images, we'll use the original with filters
      return {
        generatedImage: imageBase64, // Return original image (will be enhanced with CSS)
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
  renaissance: "sepia(30%) contrast(1.2) brightness(1.1) saturate(1.3)",
  van_gogh: "contrast(1.5) saturate(1.8) hue-rotate(10deg) brightness(1.1)",
  monet: "blur(0.5px) brightness(1.2) saturate(0.8) contrast(0.9)"
};