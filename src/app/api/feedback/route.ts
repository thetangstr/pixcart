import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user from database - first try by ID, then by email
    let dbUser = await prisma.user.findUnique({
      where: { id: user.id }
    });

    // If not found by ID, try by email (for backwards compatibility)
    if (!dbUser && user.email) {
      dbUser = await prisma.user.findUnique({
        where: { email: user.email }
      });
    }

    // Create user if doesn't exist
    if (!dbUser) {
      dbUser = await prisma.user.create({
        data: {
          id: user.id,
          email: user.email || `user_${user.id}@pixcart.com`,
          name: user.user_metadata?.name || user.user_metadata?.full_name || (user.email ? user.email.split('@')[0] : `user_${user.id}`),
          image: user.user_metadata?.avatar_url,
          dailyImageLimit: 10,
          isBetaTester: true,
          isAllowlisted: true
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