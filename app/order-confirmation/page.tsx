'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle, Package, Truck, Home } from 'lucide-react'

export default function OrderConfirmation() {
  const searchParams = useSearchParams()
  const orderId = searchParams.get('orderId')
  const [orderDetails, setOrderDetails] = useState<any>(null)

  useEffect(() => {
    if (orderId) {
      // Fetch order details
      fetch(`/api/orders/${orderId}`)
        .then(res => res.json())
        .then(data => setOrderDetails(data))
        .catch(console.error)
    }
  }, [orderId])

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Success Message */}
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="h-12 w-12 text-green-600" />
          </div>
          
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Order Confirmed!
          </h1>
          
          <p className="text-lg text-gray-600 mb-8">
            Thank you for your order. Your oil painting will be printed and shipped soon.
          </p>

          {/* Order Number */}
          <div className="bg-gray-50 rounded-lg p-6 mb-8">
            <p className="text-sm text-gray-500 mb-2">Order Number</p>
            <p className="text-2xl font-mono font-bold text-gray-900">{orderId}</p>
            <p className="text-sm text-gray-500 mt-2">
              A confirmation email has been sent to your email address
            </p>
          </div>

          {/* Order Timeline */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-6">What Happens Next?</h2>
            <div className="space-y-4">
              <div className="flex items-start text-left">
                <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="h-5 w-5 text-amber-600" />
                </div>
                <div className="ml-4">
                  <p className="font-medium text-gray-900">Order Received</p>
                  <p className="text-sm text-gray-600">Your order has been successfully placed</p>
                </div>
              </div>
              
              <div className="flex items-start text-left">
                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Package className="h-5 w-5 text-gray-400" />
                </div>
                <div className="ml-4">
                  <p className="font-medium text-gray-900">Printing</p>
                  <p className="text-sm text-gray-600">Your oil painting will be printed within 2-3 business days</p>
                </div>
              </div>
              
              <div className="flex items-start text-left">
                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Truck className="h-5 w-5 text-gray-400" />
                </div>
                <div className="ml-4">
                  <p className="font-medium text-gray-900">Shipping</p>
                  <p className="text-sm text-gray-600">Your order will be shipped within 5-7 business days</p>
                </div>
              </div>
            </div>
          </div>

          {/* Estimated Delivery */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 mb-8">
            <p className="text-sm text-amber-800 mb-1">Estimated Delivery</p>
            <p className="text-xl font-semibold text-amber-900">
              {new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              href="/"
              className="flex-1 inline-flex items-center justify-center px-6 py-3 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 transition-colors"
            >
              <Home className="h-5 w-5 mr-2" />
              Back to Home
            </Link>
            <Link
              href="/upload"
              className="flex-1 inline-flex items-center justify-center px-6 py-3 bg-amber-600 text-white font-semibold rounded-lg hover:bg-amber-700 transition-colors"
            >
              Create Another Painting
            </Link>
          </div>
        </div>

        {/* Customer Support */}
        <div className="mt-8 text-center text-sm text-gray-600">
          <p>Have questions about your order?</p>
          <p>Contact us at <a href="mailto:support@oilpaintingapp.com" className="text-amber-600 hover:underline">support@oilpaintingapp.com</a></p>
        </div>
      </div>
    </div>
  )
}