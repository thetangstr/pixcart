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

    // Check if user is admin
    const adminUser = await prisma.user.findUnique({
      where: { email: user.email! },
      select: { isAdmin: true }
    });

    if (!adminUser?.isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { email } = await request.json();

    // Check if user exists
    let targetUser = await prisma.user.findUnique({
      where: { email }
    });

    if (targetUser) {
      // Update existing user
      targetUser = await prisma.user.update({
        where: { email },
        data: { isBetaTester: true }
      });
    } else {
      // Create new user as beta tester
      targetUser = await prisma.user.create({
        data: {
          email,
          isBetaTester: true
        }
      });
    }

    return NextResponse.json({ user: targetUser });
  } catch (error) {
    console.error("Error adding beta tester:", error);
    return NextResponse.json({ error: "Failed to add beta tester" }, { status: 500 });
  }
}