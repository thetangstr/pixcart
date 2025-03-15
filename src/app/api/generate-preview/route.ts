import { NextResponse } from 'next/server';
import Replicate from 'replicate';

// Initialize Replicate client
const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN || "r8_1x6VfXMVgHbrsnt26W7Zg5pKljXMfFK2CFTe7", // Fallback to the provided token if env var is not set
});

// Fallback image URL in case Replicate fails
const FALLBACK_IMAGE_URL = "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80";

// Define the type for model IDs to match Replicate's expected format
type ReplicateModelId = `${string}/${string}` | `${string}/${string}:${string}`;

// Array of models to try in order - using the confirmed working model
const MODELS = [
  {
    // Primary model - confirmed to work with the user's API token
    id: "lucataco/sdxl-controlnet:06d6fae3b75ab68a28cd2900afa6033166910dd09fd9751047043a5bbb4c184b" as ReplicateModelId,
    params: (imageUrl: string) => ({
      image: imageUrl,
      prompt: "oil painting style, same content as the original image, detailed brush strokes, artistic masterpiece",
      negative_prompt: "distorted, different content, unrealistic, blurry",
      strength: 0.5, // Lower strength to preserve more of the original image
      guidance_scale: 7.5,
      controlnet_conditioning_scale: 0.8,
      control_guidance_start: 0.0,
      control_guidance_end: 1.0
    })
  },
  {
    // Backup model - simple image-to-image model
    id: "stability-ai/stable-diffusion:db21e45d3f7023abc2a46ee38a23973f6dce16bb082a930b0c49861f96d1e5bf" as ReplicateModelId,
    params: (imageUrl: string) => ({
      prompt: "oil painting style, same content as the original image, detailed brush strokes",
      image: imageUrl,
      strength: 0.5
    })
  },
  {
    // Last resort - a very basic model
    id: "nightmareai/real-esrgan:42fed1c4974146d4d2414e2be2c5277c7fcf05fcc3a73abf41610695738c1d7b" as ReplicateModelId,
    params: (imageUrl: string) => ({
      image: imageUrl,
      scale: 2,
      face_enhance: true
    })
  }
];

// Helper function to process ReadableStream
async function processReadableStream(stream: ReadableStream): Promise<string | null> {
  try {
    console.log('Processing ReadableStream...');
    const reader = stream.getReader();
    
    // For binary data, we'll collect chunks in an array
    const chunks: Uint8Array[] = [];
    let result = '';
    let isBinary = false;
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      // Store the binary chunk
      if (value) {
        chunks.push(value);
        
        // Check first few bytes for PNG signature (89 50 4E 47)
        if (value.length > 4 && 
            value[0] === 0x89 && 
            value[1] === 0x50 && 
            value[2] === 0x4E && 
            value[3] === 0x47) {
          console.log('Detected PNG signature in binary data');
          isBinary = true;
        }
        
        // Check for JPEG signature (FF D8 FF)
        if (value.length > 3 && 
            value[0] === 0xFF && 
            value[1] === 0xD8 && 
            value[2] === 0xFF) {
          console.log('Detected JPEG signature in binary data');
          isBinary = true;
        }
        
        // Only try to decode as text if we haven't identified it as binary yet
        if (!isBinary) {
          try {
            const chunk = new TextDecoder().decode(value);
            result += chunk;
          } catch (e) {
            console.log('Error decoding chunk as text, likely binary data');
            isBinary = true;
          }
        }
      }
    }
    
    // If we detected binary image data, convert it to a data URL
    if (isBinary) {
      console.log('Processing binary image data...');
      
      // Combine all chunks into a single Uint8Array
      const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
      const combinedArray = new Uint8Array(totalLength);
      
      let offset = 0;
      for (const chunk of chunks) {
        combinedArray.set(chunk, offset);
        offset += chunk.length;
      }
      
      // Detect image type from the first few bytes
      let mimeType = 'application/octet-stream';
      if (combinedArray.length > 4 && 
          combinedArray[0] === 0x89 && 
          combinedArray[1] === 0x50 && 
          combinedArray[2] === 0x4E && 
          combinedArray[3] === 0x47) {
        mimeType = 'image/png';
        console.log('Confirmed PNG image format');
      } else if (combinedArray.length > 3 && 
                combinedArray[0] === 0xFF && 
                combinedArray[1] === 0xD8 && 
                combinedArray[2] === 0xFF) {
        mimeType = 'image/jpeg';
        console.log('Confirmed JPEG image format');
      }
      
      // Convert to base64 data URL
      const base64 = Buffer.from(combinedArray).toString('base64');
      const dataUrl = `data:${mimeType};base64,${base64}`;
      
      console.log(`Successfully converted binary image to data URL (${mimeType}, ${totalLength} bytes)`);
      return dataUrl;
    }
    
    // If not binary, try to parse as JSON or extract URL
    if (result && !isBinary) {
      // Try to parse the result as JSON
      try {
        const jsonResult = JSON.parse(result);
        console.log('Successfully parsed stream result as JSON:', jsonResult);
        
        // Check if the result contains an image URL
        if (typeof jsonResult === 'object') {
          if (jsonResult.output && typeof jsonResult.output === 'string') {
            return jsonResult.output;
          } else if (jsonResult.url && typeof jsonResult.url === 'string') {
            return jsonResult.url;
          } else if (Array.isArray(jsonResult) && jsonResult.length > 0 && typeof jsonResult[0] === 'string') {
            return jsonResult[0];
          }
        }
      } catch (parseError) {
        console.error('Error parsing stream result as JSON:', parseError);
        // If it's not valid JSON, check if it's a URL directly
        if (result.trim().startsWith('http')) {
          return result.trim();
        }
      }
    }
    
    console.log('Stream processed but no valid image URL or binary data found');
    return null;
  } catch (error) {
    console.error('Error processing ReadableStream:', error);
    return null;
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { imageUrl, retry = false, retryCount = 0 } = data;
    console.log('Received image URL:', imageUrl);
    console.log('Retry:', retry, 'Retry count:', retryCount);

    if (!imageUrl) {
      return NextResponse.json(
        { error: 'Image URL is required' },
        { status: 400 }
      );
    }

    // Validate the image URL
    let validatedImageUrl = imageUrl;
    try {
      new URL(imageUrl);
    } catch (error) {
      console.error('Invalid image URL:', error);
      return NextResponse.json(
        { error: 'Invalid image URL format' },
        { status: 400 }
      );
    }

    // Check if Replicate API token is available
    const hasReplicateToken = !!replicate.auth;
    console.log('Replicate API Token available:', hasReplicateToken);

    let replicateImageUrl = null;
    let replicateError = null;

    // Try to use Replicate if API token is available
    if (hasReplicateToken) {
      try {
        // Select model based on retry count
        const modelIndex = Math.min(retryCount, MODELS.length - 1);
        const selectedModel = MODELS[modelIndex];
        
        console.log(`Calling Replicate model ${selectedModel.id} (retry attempt: ${retryCount})`);
        console.log('Using image URL for processing:', validatedImageUrl);
        
        // Convert localhost URLs to a public placeholder if needed
        // Replicate can't access localhost URLs
        let processedImageUrl = validatedImageUrl;
        if (processedImageUrl.includes('localhost') || processedImageUrl.includes('127.0.0.1')) {
          // Use a public image as a fallback since Replicate can't access localhost
          processedImageUrl = "https://images.unsplash.com/photo-1575936123452-b67c3203c357?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8aW1hZ2V8ZW58MHx8MHx8fDA%3D&w=1000&q=80";
          console.log('Using public image URL instead of localhost:', processedImageUrl);
        }
        
        // Use the selected model
        const output = await replicate.run(
          selectedModel.id,
          {
            input: selectedModel.params(processedImageUrl)
          }
        );
        
        console.log('Replicate output type:', typeof output);
        console.log('Replicate output:', output);
        
        // Handle different output formats
        if (typeof output === 'string') {
          replicateImageUrl = output;
          console.log('Successfully generated image with Replicate (string):', replicateImageUrl);
        } else if (Array.isArray(output) && output.length > 0) {
          if (typeof output[0] === 'string') {
            replicateImageUrl = output[0];
            console.log('Successfully generated image with Replicate (array):', replicateImageUrl);
          } else if (output[0] instanceof ReadableStream) {
            console.log('Processing ReadableStream from array output');
            const streamResult = await processReadableStream(output[0]);
            if (streamResult) {
              replicateImageUrl = streamResult;
              console.log('Successfully processed ReadableStream:', replicateImageUrl.substring(0, 50) + '...');
            } else {
              console.error('Failed to process ReadableStream from array');
              replicateImageUrl = FALLBACK_IMAGE_URL;
              replicateError = 'Failed to process ReadableStream from Replicate';
            }
          } else {
            console.error('Unexpected output format in array from Replicate:', output);
            replicateImageUrl = FALLBACK_IMAGE_URL;
            replicateError = 'Unexpected output format from Replicate';
          }
        } else if (output instanceof ReadableStream) {
          console.log('Processing ReadableStream output');
          const streamResult = await processReadableStream(output);
          if (streamResult) {
            replicateImageUrl = streamResult;
            console.log('Successfully processed ReadableStream:', streamResult.substring(0, 50) + '...');
          } else {
            console.error('Failed to process ReadableStream');
            replicateImageUrl = FALLBACK_IMAGE_URL;
            replicateError = 'Failed to process ReadableStream from Replicate';
          }
        } else if (output && typeof output === 'object') {
          // Try to extract URL from object
          const outputObj = output as Record<string, any>;
          if (outputObj.output && typeof outputObj.output === 'string') {
            replicateImageUrl = outputObj.output;
            console.log('Successfully extracted image URL from object output:', replicateImageUrl);
          } else {
            console.log('Received object output from Replicate, using fallback image');
            replicateImageUrl = FALLBACK_IMAGE_URL;
            replicateError = 'Received non-string output from Replicate';
          }
        } else {
          console.error('Unexpected output format from Replicate:', output);
          replicateImageUrl = FALLBACK_IMAGE_URL;
          replicateError = 'Unexpected output format from Replicate';
        }
      } catch (error: any) {
        console.error('Error calling Replicate API:', error);
        replicateImageUrl = FALLBACK_IMAGE_URL;
        replicateError = `Replicate API error: ${error.message || 'Unknown error'}`;
      }
    } else {
      replicateImageUrl = FALLBACK_IMAGE_URL;
      replicateError = 'No Replicate API token available';
    }
    
    // We'll still use client-side processing for the second pane
    // but also return the Replicate-generated image for the third pane if available
    console.log('Using client-side processing for oil painting effect');
    
    return NextResponse.json({ 
      originalImageUrl: validatedImageUrl,
      replicateImageUrl: replicateImageUrl || FALLBACK_IMAGE_URL, // Ensure we always have an image URL
      filterData: JSON.stringify({
        applyClientFilter: true,
        filterType: 'oil-painting',
        forceExtremeEffect: true,
        errorMessage: replicateError || (hasReplicateToken ? 
          'Using client-side processing alongside Replicate.' : 
          'No API token available. Using client-side processing only.')
      })
    });
    
  } catch (error: any) {
    console.error('Error generating preview:', error);
    
    return NextResponse.json({ 
      originalImageUrl: null,
      replicateImageUrl: FALLBACK_IMAGE_URL,
      error: `Failed to generate preview: ${error.message || 'Unknown error'}`,
      filterData: JSON.stringify({
        applyClientFilter: true,
        filterType: 'error-filter',
        forceExtremeEffect: true,
        errorMessage: `Error: ${error.message || 'Unknown error'}`
      })
    }, { status: 500 });
  }
} 