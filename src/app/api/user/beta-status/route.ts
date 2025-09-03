import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      return NextResponse.json({ isBetaTester: false });
    }

    // Check if user is beta tester in database
    const dbUser = await prisma.user.findUnique({
      where: { email: user.email! },
      select: { isBetaTester: true, isAdmin: true }
    });

    return NextResponse.json({ 
      isBetaTester: dbUser?.isBetaTester || false,
      isAdmin: dbUser?.isAdmin || false 
    });
  } catch (error) {
    console.error("Error checking beta status:", error);
    return NextResponse.json({ isBetaTester: false });
  }
}