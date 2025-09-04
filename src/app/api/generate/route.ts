import { NextRequest, NextResponse } from "next/server";
import { generateOilPaintingPreview, styleFilters, PaintingStyle } from "@/lib/gemini";
import { createClient } from "@/lib/supabase/server";
import { PrismaClient } from "@prisma/client";
import { checkImageGenerationLimit, checkIPRateLimit, incrementIPUsage } from "@/lib/rate-limit";

const prisma = new PrismaClient();

function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const real = request.headers.get('x-real-ip');
  const client = request.headers.get('x-client-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  if (real) {
    return real;
  }
  if (client) {
    return client;
  }
  
  // Fallback for local development
  return '127.0.0.1';
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication (optional now)
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    let limitStatus;
    let isAuthenticated = false;
    
    if (!authError && user) {
      // Authenticated user flow
      isAuthenticated = true;
      
      // Check if user is allowlisted
      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { isAllowlisted: true, isAdmin: true }
      });

      if (!dbUser?.isAllowlisted && !dbUser?.isAdmin) {
        return NextResponse.json(
          { error: "Access denied. Please wait for your account to be approved." },
          { status: 403 }
        );
      }

      // Check user rate limit
      limitStatus = await checkImageGenerationLimit(user.id);
      if (!limitStatus.allowed) {
        return NextResponse.json(
          { 
            error: `Daily limit reached (${limitStatus.limit} images per day)`,
            remaining: 0,
            limit: limitStatus.limit,
            resetsAt: limitStatus.resetsAt,
            usedToday: limitStatus.usedToday
          },
          { status: 429 }
        );
      }
    } else {
      // Non-authenticated user flow (IP-based rate limiting)
      const clientIP = getClientIP(request);
      
      limitStatus = await checkIPRateLimit(clientIP);
      if (!limitStatus.allowed) {
        return NextResponse.json(
          { 
            error: `IP limit reached (${limitStatus.limit} image per IP per day)`,
            remaining: 0,
            limit: limitStatus.limit,
            resetsAt: limitStatus.resetsAt,
            usedToday: limitStatus.usedToday
          },
          { status: 429 }
        );
      }
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
    if (!["renaissance", "van_gogh", "monet"].includes(style)) {
      return NextResponse.json(
        { error: "Invalid style selected" },
        { status: 400 }
      );
    }

    console.log(`Generating ${style} style preview for ${isAuthenticated ? `user ${user.id}` : `IP ${getClientIP(request)}`}`);

    let dbUserId: string;

    if (isAuthenticated && user) {
      // Get user from database for tracking
      let dbUser = await prisma.user.findUnique({
        where: { email: user.email! },
        select: { id: true }
      });

      // Create user if they don't exist
      if (!dbUser) {
        dbUser = await prisma.user.create({
          data: {
            id: user.id,
            email: user.email!,
            name: user.user_metadata?.full_name || null,
            image: user.user_metadata?.avatar_url || null,
          },
          select: { id: true }
        });
      }
      dbUserId = dbUser.id;
    } else {
      // Use a placeholder for non-authenticated users
      dbUserId = `ip_${getClientIP(request)}`;
    }

    // Call Gemini API to generate the styled image
    const { generatedImage, description } = await generateOilPaintingPreview(
      imageData,
      style as PaintingStyle,
      dbUserId
    );

    // Increment usage counters after successful generation
    if (isAuthenticated && user) {
      // User rate limit is tracked in the generateOilPaintingPreview function
    } else {
      // Increment IP usage
      await incrementIPUsage(getClientIP(request));
    }

    // Get CSS filter for additional enhancement if needed
    const cssFilter = styleFilters[style as PaintingStyle];

    // Calculate pricing based on style
    const basePrices: Record<PaintingStyle, number> = {
      renaissance: 149.99,
      van_gogh: 179.99,
      monet: 169.99
    };

    // Get updated limit status after generation
    let updatedLimitStatus;
    if (isAuthenticated && user) {
      updatedLimitStatus = await checkImageGenerationLimit(user.id);
    } else {
      updatedLimitStatus = await checkIPRateLimit(getClientIP(request));
    }

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
      },
      usage: {
        remaining: updatedLimitStatus.remaining,
        limit: updatedLimitStatus.limit,
        usedToday: updatedLimitStatus.usedToday,
        resetsAt: updatedLimitStatus.resetsAt
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