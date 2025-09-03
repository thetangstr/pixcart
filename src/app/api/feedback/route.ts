import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user from database
    let dbUser = await prisma.user.findUnique({
      where: { email: user.email! }
    });

    // Create user if doesn't exist
    if (!dbUser) {
      dbUser = await prisma.user.create({
        data: {
          email: user.email!,
          name: user.user_metadata?.name || user.email!.split('@')[0],
          image: user.user_metadata?.avatar_url
        }
      });
    }

    const { type, message, expectedBehavior, actualBehavior, rating, page } = await request.json();

    // Create feedback
    const feedback = await prisma.feedback.create({
      data: {
        userId: dbUser.id,
        type,
        message,
        expectedBehavior,
        actualBehavior,
        rating,
        page,
        status: 'open',
        priority: 'medium'
      }
    });

    return NextResponse.json({ success: true, feedback });
  } catch (error) {
    console.error("Error creating feedback:", error);
    return NextResponse.json({ error: "Failed to create feedback" }, { status: 500 });
  }
}