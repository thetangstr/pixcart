import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { event, variant, metadata, timestamp } = body;

    // Store analytics event (you could expand this with a proper analytics model)
    // For now, we'll use the ApiUsage table with a special type
    await prisma.apiUsage.create({
      data: {
        apiType: 'ab_test',
        endpoint: 'landing_page',
        model: variant,
        operation: event,
        success: true,
        metadata: metadata || {},
        createdAt: timestamp ? new Date(timestamp) : new Date()
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Analytics tracking error:", error);
    return NextResponse.json(
      { error: "Failed to track event" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get A/B test results
    const results = await prisma.apiUsage.groupBy({
      by: ['model', 'operation'],
      where: {
        apiType: 'ab_test',
        endpoint: 'landing_page'
      },
      _count: true
    });

    const summary = {
      simple: {
        views: 0,
        conversions: 0
      },
      detailed: {
        views: 0,
        conversions: 0
      }
    };

    results.forEach(result => {
      const variant = result.model as 'simple' | 'detailed';
      if (variant === 'simple' || variant === 'detailed') {
        if (result.operation === 'page_view') {
          summary[variant].views = result._count;
        } else if (result.operation === 'conversion') {
          summary[variant].conversions = result._count;
        }
      }
    });

    // Calculate conversion rates
    const simpleRate = summary.simple.views > 0 
      ? (summary.simple.conversions / summary.simple.views * 100).toFixed(2)
      : '0';
    
    const detailedRate = summary.detailed.views > 0
      ? (summary.detailed.conversions / summary.detailed.views * 100).toFixed(2)
      : '0';

    return NextResponse.json({
      summary,
      conversionRates: {
        simple: `${simpleRate}%`,
        detailed: `${detailedRate}%`
      }
    });
  } catch (error) {
    console.error("Analytics fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}