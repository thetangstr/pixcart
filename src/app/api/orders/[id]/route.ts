import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const orderId = params.id;

    // Get specific order
    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        userId: session.user.id // Ensure user can only access their own orders
      },
      include: {
        orderHistory: {
          orderBy: { createdAt: 'desc' }
        },
        user: {
          select: {
            name: true,
            email: true
          }
        }
      }
    });

    if (!order) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      );
    }

    // Parse artist notes
    let orderDetails = {};
    try {
      orderDetails = order.artistNotes ? JSON.parse(order.artistNotes) : {};
    } catch {
      orderDetails = {};
    }

    return NextResponse.json({
      id: order.id,
      status: order.status,
      totalAmount: order.totalAmount,
      selectedStyle: order.selectedStyle,
      originalImage: order.originalImage,
      aiPreviewImage: order.aiPreviewImage,
      estimatedDelivery: order.estimatedDelivery,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      
      // Shipping information
      shipping: {
        name: order.shippingName,
        email: order.shippingEmail,
        phone: order.shippingPhone,
        address: order.shippingAddress,
        city: order.shippingCity,
        state: order.shippingState,
        zipCode: order.shippingZipCode,
        country: order.shippingCountry
      },
      
      // Order details
      details: orderDetails,
      
      // Payment status
      paymentStatus: order.paymentStatus,
      paymentIntentId: order.paymentIntentId,
      
      // History
      history: order.orderHistory.map(h => ({
        id: h.id,
        status: h.status,
        notes: h.notes,
        createdAt: h.createdAt
      })),
      
      // User info
      user: order.user
    });

  } catch (error) {
    console.error("Get Order API Error:", error);
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
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const orderId = params.id;
    const body = await request.json();

    // Verify user owns this order
    const existingOrder = await prisma.order.findFirst({
      where: {
        id: orderId,
        userId: session.user.id
      }
    });

    if (!existingOrder) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      );
    }

    // Only allow updates to certain fields and only if order is still pending
    if (existingOrder.status !== "PENDING") {
      return NextResponse.json(
        { error: "Order cannot be modified after processing has started" },
        { status: 400 }
      );
    }

    const allowedUpdates = {
      shippingName: body.shippingName,
      shippingEmail: body.shippingEmail,
      shippingPhone: body.shippingPhone,
      shippingAddress: body.shippingAddress,
      shippingCity: body.shippingCity,
      shippingState: body.shippingState,
      shippingZipCode: body.shippingZipCode,
      shippingCountry: body.shippingCountry,
    };

    // Remove undefined fields
    const updateData = Object.fromEntries(
      Object.entries(allowedUpdates).filter(([_, value]) => value !== undefined)
    );

    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: updateData
    });

    return NextResponse.json({
      id: updatedOrder.id,
      message: "Order updated successfully"
    });

  } catch (error) {
    console.error("Update Order API Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}