import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user is beta tester in database - first try by ID, then by email
    let dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { isBetaTester: true, isAdmin: true }
    });

    // If not found by ID, try by email (for backwards compatibility)
    if (!dbUser && user.email) {
      dbUser = await prisma.user.findUnique({
        where: { email: user.email },
        select: { isBetaTester: true, isAdmin: true }
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
          isBetaTester: false, // New users are not beta testers by default
          isAllowlisted: isAdminEmail, // Only admin is auto-allowlisted
          isWaitlisted: !isAdminEmail, // Others go to waitlist
          isAdmin: isAdminEmail
        },
        select: { isBetaTester: true, isAdmin: true }
      });
    }

    // Double-check admin status for the specific email
    const isAdmin = dbUser?.isAdmin || user.email === 'thetangstr@gmail.com';

    return NextResponse.json({ 
      isBetaTester: dbUser?.isBetaTester || false,
      isAdmin: isAdmin
    });
  } catch (error) {
    console.error("Error checking beta status:", error);
    return NextResponse.json({ isBetaTester: false });
  }
}