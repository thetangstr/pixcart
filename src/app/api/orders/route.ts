import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createOrderSchema = z.object({
  // Image and style
  imageData: z.string().min(1),
  selectedStyle: z.enum(["classic", "van_gogh", "monet"]),
  
  // Customer information
  customerName: z.string().min(2),
  customerEmail: z.string().email(),
  customerPhone: z.string().min(10),
  
  // Shipping information
  shippingAddress: z.string().min(5),
  shippingCity: z.string().min(2),
  shippingState: z.string().min(2),
  shippingZipCode: z.string().min(5),
  shippingCountry: z.string().min(2),
  
  // Order details
  size: z.string().min(1),
  frameOption: z.string().min(1),
  rushOrder: z.boolean().default(false),
  specialInstructions: z.string().optional(),
  totalAmount: z.number().positive(),
});

export async function POST(request: NextRequest) {
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

    // Parse and validate request body
    const body = await request.json();
    const orderData = createOrderSchema.parse(body);

    // Create order in database
    const order = await prisma.order.create({
      data: {
        userId: user.id,
        status: "PENDING",
        totalAmount: orderData.totalAmount,
        
        // Image and style
        originalImage: orderData.imageData,
        selectedStyle: orderData.selectedStyle,
        
        // Shipping information  
        shippingName: orderData.customerName,
        shippingEmail: orderData.customerEmail,
        shippingPhone: orderData.customerPhone,
        shippingAddress: orderData.shippingAddress,
        shippingCity: orderData.shippingCity,
        shippingState: orderData.shippingState,
        shippingZipCode: orderData.shippingZipCode,
        shippingCountry: orderData.shippingCountry,
        
        // Order details stored in artistNotes for now
        artistNotes: JSON.stringify({
          size: orderData.size,
          frameOption: orderData.frameOption,
          rushOrder: orderData.rushOrder,
          specialInstructions: orderData.specialInstructions,
        }),
        
        // Set estimated delivery
        estimatedDelivery: orderData.rushOrder 
          ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
          : new Date(Date.now() + 21 * 24 * 60 * 60 * 1000), // 21 days
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          }
        }
      }
    });

    // Create order history entry
    await prisma.orderHistory.create({
      data: {
        orderId: order.id,
        status: "PENDING",
        notes: "Order created successfully"
      }
    });

    return NextResponse.json({
      id: order.id,
      status: order.status,
      totalAmount: order.totalAmount,
      estimatedDelivery: order.estimatedDelivery,
      createdAt: order.createdAt
    });

  } catch (error) {
    console.error("Orders API Error:", error);

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

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;

    // Get user's orders
    const orders = await prisma.order.findMany({
      where: {
        userId: user.id
      },
      include: {
        orderHistory: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      },
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: limit
    });

    // Get total count for pagination
    const totalCount = await prisma.order.count({
      where: {
        userId: user.id
      }
    });

    return NextResponse.json({
      orders: orders.map(order => ({
        id: order.id,
        status: order.status,
        selectedStyle: order.selectedStyle,
        totalAmount: order.totalAmount,
        estimatedDelivery: order.estimatedDelivery,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        originalImage: order.originalImage,
        aiPreviewImage: order.aiPreviewImage,
        shippingName: order.shippingName,
        lastUpdate: order.orderHistory[0]
      })),
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit)
      }
    });

  } catch (error) {
    console.error("Get Orders API Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}