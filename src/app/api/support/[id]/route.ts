import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const replySchema = z.object({
  message: z.string().min(1, "Message is required"),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const ticketId = params.id;

    // Get specific ticket
    const ticket = await prisma.supportTicket.findFirst({
      where: {
        id: ticketId,
        userId: user.id // Ensure user can only access their own tickets
      },
      include: {
        replies: {
          orderBy: { createdAt: 'asc' }
        },
        user: {
          select: {
            name: true,
            email: true
          }
        }
      }
    });

    if (!ticket) {
      return NextResponse.json(
        { error: "Support ticket not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: ticket.id,
      subject: ticket.subject,
      message: ticket.message,
      status: ticket.status,
      priority: ticket.priority,
      category: ticket.category,
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt,
      replies: ticket.replies.map(reply => ({
        id: reply.id,
        message: reply.message,
        isStaff: reply.isStaff,
        createdAt: reply.createdAt
      })),
      user: ticket.user
    });

  } catch (error) {
    console.error("Get Support Ticket API Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const ticketId = params.id;

    // Verify user owns this ticket
    const ticket = await prisma.supportTicket.findFirst({
      where: {
        id: ticketId,
        userId: user.id
      }
    });

    if (!ticket) {
      return NextResponse.json(
        { error: "Support ticket not found" },
        { status: 404 }
      );
    }

    // Don't allow replies to closed tickets
    if (ticket.status === "CLOSED") {
      return NextResponse.json(
        { error: "Cannot reply to closed tickets" },
        { status: 400 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const { message } = replySchema.parse(body);

    // Create reply
    const reply = await prisma.ticketReply.create({
      data: {
        ticketId: ticketId,
        message: message,
        isStaff: false // Customer reply
      }
    });

    // Update ticket status to IN_PROGRESS if it was OPEN
    if (ticket.status === "OPEN") {
      await prisma.supportTicket.update({
        where: { id: ticketId },
        data: { status: "IN_PROGRESS" }
      });
    }

    return NextResponse.json({
      id: reply.id,
      message: reply.message,
      isStaff: reply.isStaff,
      createdAt: reply.createdAt,
      ticketStatus: ticket.status === "OPEN" ? "IN_PROGRESS" : ticket.status
    });

  } catch (error) {
    console.error("Reply Support Ticket API Error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const ticketId = params.id;
    const body = await request.json();

    // Verify user owns this ticket
    const ticket = await prisma.supportTicket.findFirst({
      where: {
        id: ticketId,
        userId: user.id
      }
    });

    if (!ticket) {
      return NextResponse.json(
        { error: "Support ticket not found" },
        { status: 404 }
      );
    }

    // Only allow status updates for now
    const allowedStatuses = ["OPEN", "CLOSED"];
    if (body.status && allowedStatuses.includes(body.status)) {
      const updatedTicket = await prisma.supportTicket.update({
        where: { id: ticketId },
        data: { status: body.status }
      });

      return NextResponse.json({
        id: updatedTicket.id,
        status: updatedTicket.status,
        message: "Ticket status updated successfully"
      });
    }

    return NextResponse.json(
      { error: "Invalid update operation" },
      { status: 400 }
    );

  } catch (error) {
    console.error("Update Support Ticket API Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}