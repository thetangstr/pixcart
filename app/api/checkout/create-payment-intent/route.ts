import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import fs from 'fs/promises'
import path from 'path'

// Initialize Stripe with your secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder', {
  apiVersion: '2025-07-30.basil'
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { amount, orderData } = body

    // Create a payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount, // Amount in cents
      currency: 'usd',
      metadata: {
        customerName: `${orderData.customerInfo.firstName} ${orderData.customerInfo.lastName}`,
        email: orderData.customerInfo.email,
        size: orderData.orderDetails.size,
        style: orderData.orderDetails.style
      }
    })

    // Generate order ID
    const orderId = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    // Save order to database (using JSON file for simplicity)
    const ordersDir = path.join(process.cwd(), 'data', 'orders')
    await fs.mkdir(ordersDir, { recursive: true })
    
    const orderRecord = {
      orderId,
      ...orderData,
      paymentIntentId: paymentIntent.id,
      status: 'pending',
      createdAt: new Date().toISOString()
    }

    await fs.writeFile(
      path.join(ordersDir, `${orderId}.json`),
      JSON.stringify(orderRecord, null, 2)
    )

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      orderId
    })

  } catch (error) {
    console.error('Error creating payment intent:', error)
    return NextResponse.json(
      { error: 'Failed to create payment intent' },
      { status: 500 }
    )
  }
}