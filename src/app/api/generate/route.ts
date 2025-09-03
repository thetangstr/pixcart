import { NextRequest, NextResponse } from "next/server";
import { generateOilPaintingPreview, styleFilters, PaintingStyle } from "@/lib/gemini";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { imageData, style } = body;

    if (!imageData || !style) {
      return NextResponse.json(
        { error: "Image data and style are required" },
        { status: 400 }
      );
    }

    // Validate style
    if (!["classic", "van_gogh", "monet"].includes(style)) {
      return NextResponse.json(
        { error: "Invalid style selected" },
        { status: 400 }
      );
    }

    console.log(`Generating ${style} style preview for user ${user.id}`);

    // Call Gemini API to generate the styled image
    const { generatedImage, description } = await generateOilPaintingPreview(
      imageData,
      style as PaintingStyle
    );

    // Get CSS filter for additional enhancement if needed
    const cssFilter = styleFilters[style as PaintingStyle];

    // Calculate pricing based on style
    const basePrices: Record<PaintingStyle, number> = {
      classic: 149.99,
      van_gogh: 179.99,
      monet: 169.99
    };

    const response = {
      success: true,
      preview: {
        originalImage: imageData,
        styledImage: generatedImage,
        cssFilter: cssFilter,
        description: description,
        style: style,
        estimatedPrice: basePrices[style as PaintingStyle],
        processingTime: "2-3 weeks",
        canvasOptions: [
          { size: "16x20", price: basePrices[style as PaintingStyle] },
          { size: "20x24", price: basePrices[style as PaintingStyle] + 50 },
          { size: "24x36", price: basePrices[style as PaintingStyle] + 100 }
        ]
      }
    };

    return NextResponse.json(response);

  } catch (error: any) {
    console.error("Generation error:", error);
    return NextResponse.json(
      { 
        error: error.message || "Failed to generate preview",
        details: process.env.NODE_ENV === "development" ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}