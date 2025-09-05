import { NextRequest, NextResponse } from "next/server";
import { generateOilPaintingPreview, styleFilters, PaintingStyle } from "@/lib/gemini";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { checkImageGenerationLimit, checkIPRateLimit, incrementIPUsage, incrementUserImageUsage } from "@/lib/rate-limit-supabase";

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
    // Check request size (limit to 2MB)
    const contentLength = request.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > 2 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Request payload too large. Maximum size is 2MB." },
        { status: 413 }
      );
    }
    
    // Check authentication (optional now)
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    let limitStatus;
    let isAuthenticated = false;
    
    if (!authError && user) {
      // Authenticated user flow
      isAuthenticated = true;
      
      // Check if user is allowlisted - first try by ID, then by email
      let dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { isAllowlisted: true, isAdmin: true }
      });

      // If not found by ID, try by email
      if (!dbUser && user.email) {
        dbUser = await prisma.user.findUnique({
          where: { email: user.email },
          select: { isAllowlisted: true, isAdmin: true }
        });
      }

      // Create user if they don't exist (waitlisted by default)
      if (!dbUser) {
        const isAdminEmail = user.email === 'thetangstr@gmail.com';
        dbUser = await prisma.user.create({
          data: {
            id: user.id,
            email: user.email || `user_${user.id}@pixcart.com`,
            dailyImageLimit: isAdminEmail ? 999 : 10,
            isAllowlisted: isAdminEmail, // Only admin is auto-allowlisted
            isWaitlisted: !isAdminEmail, // Others go to waitlist
            isBetaTester: false,
            isAdmin: isAdminEmail
          },
          select: { isAllowlisted: true, isAdmin: true }
        });
      }

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
    
    // Validate image data size (base64 string shouldn't exceed 2MB)
    if (imageData.length > 2 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Image data too large. Please use a smaller image (max 2MB)." },
        { status: 413 }
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
      // Get user from database for tracking - first try by ID, then by email
      let dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { id: true }
      });

      // If not found by ID, try by email (for backwards compatibility)
      if (!dbUser && user.email) {
        dbUser = await prisma.user.findUnique({
          where: { email: user.email },
          select: { id: true }
        });
      }

      // Create user if they don't exist (waitlisted by default)
      if (!dbUser) {
        const isAdminEmail = user.email === 'thetangstr@gmail.com';
        dbUser = await prisma.user.create({
          data: {
            id: user.id,
            email: user.email || `user_${user.id}@pixcart.com`,
            name: user.user_metadata?.full_name || null,
            image: user.user_metadata?.avatar_url || null,
            dailyImageLimit: isAdminEmail ? 999 : 10,
            isAllowlisted: isAdminEmail,
            isWaitlisted: !isAdminEmail,
            isAdmin: isAdminEmail
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
      // Increment user usage
      await incrementUserImageUsage(user.id);
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
    
    // More detailed error response for debugging
    const errorMessage = error.message || "Failed to generate preview";
    const errorResponse: any = { 
      error: errorMessage,
      code: error.code || 'UNKNOWN_ERROR'
    };
    
    // Add more details in development
    if (process.env.NODE_ENV === "development") {
      errorResponse.details = error.stack;
      errorResponse.name = error.name;
    }
    
    // Log the full error for debugging
    console.error("Full error object:", {
      name: error.name,
      message: error.message,
      code: error.code,
      stack: error.stack
    });
    
    return NextResponse.json(errorResponse, { status: 500 });
  }
}