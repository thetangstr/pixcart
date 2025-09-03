import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user from database and check if admin
    const dbUser = await prisma.user.findUnique({
      where: { email: user.email! }
    });

    if (!dbUser || !dbUser.isAdmin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    // Get all sprints
    const sprints = await prisma.sprint.findMany({
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        _count: {
          select: {
            feedback: true
          }
        }
      }
    });

    return NextResponse.json({ sprints });
  } catch (error) {
    console.error("Error fetching sprints:", error);
    return NextResponse.json({ error: "Failed to fetch sprints" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user from database and check if admin
    const dbUser = await prisma.user.findUnique({
      where: { email: user.email! }
    });

    if (!dbUser || !dbUser.isAdmin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const { name, description, status, startDate, endDate } = await request.json();

    if (!name) {
      return NextResponse.json({ error: "Sprint name is required" }, { status: 400 });
    }

    // Create sprint
    const sprint = await prisma.sprint.create({
      data: {
        name,
        description,
        status: status || 'planning',
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
      }
    });

    return NextResponse.json({ sprint });
  } catch (error) {
    console.error("Error creating sprint:", error);
    return NextResponse.json({ error: "Failed to create sprint" }, { status: 500 });
  }
}