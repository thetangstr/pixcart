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

    // Check if user is admin
    const adminUser = await prisma.user.findUnique({
      where: { email: user.email! },
      select: { isAdmin: true }
    });

    if (!adminUser?.isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get all feedback
    const feedback = await prisma.feedback.findMany({
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true
          }
        },
        sprint: {
          select: {
            id: true,
            name: true,
            status: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ feedback });
  } catch (error) {
    console.error("Error fetching feedback:", error);
    return NextResponse.json({ error: "Failed to fetch feedback" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
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

    const { updates } = await request.json();

    if (!Array.isArray(updates)) {
      return NextResponse.json({ error: "Updates must be an array" }, { status: 400 });
    }

    // Process bulk updates
    const results = await Promise.all(
      updates.map(async (update: any) => {
        const { id, ...updateData } = update;
        
        // Clean up undefined values and handle sprintId
        const cleanData: any = {};
        Object.keys(updateData).forEach(key => {
          if (updateData[key] !== undefined) {
            if (key === 'sprintId' && updateData[key] === '') {
              cleanData[key] = null;
            } else {
              cleanData[key] = updateData[key];
            }
          }
        });

        try {
          const updated = await prisma.feedback.update({
            where: { id },
            data: cleanData,
            include: {
              user: {
                select: {
                  id: true,
                  email: true,
                  name: true
                }
              },
              sprint: {
                select: {
                  id: true,
                  name: true,
                  status: true
                }
              }
            }
          });
          return { success: true, feedback: updated };
        } catch (updateError) {
          console.error(`Error updating feedback ${id}:`, updateError);
          return { success: false, id, error: 'Update failed' };
        }
      })
    );

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    return NextResponse.json({ 
      message: `Updated ${successful} items, ${failed} failed`,
      results 
    });
  } catch (error) {
    console.error("Error bulk updating feedback:", error);
    return NextResponse.json({ error: "Failed to bulk update feedback" }, { status: 500 });
  }
}