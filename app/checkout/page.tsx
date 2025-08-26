'use client'

import { useRouter } from 'next/navigation'
import { ChevronRight, Package, CreditCard, User, MapPin, Check } from 'lucide-react'

export default function CheckoutPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Checkout Coming Soon</h1>
            <p className="text-gray-600">
              Our checkout system is currently being set up. 
              Please contact us directly to place your order for a hand-painted oil painting.
            </p>
          </div>
          
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 mb-8">
            <h2 className="font-semibold text-gray-900 mb-2">How to Order:</h2>
            <ol className="list-decimal list-inside space-y-2 text-gray-700">
              <li>Upload your photo and preview the AI transformation</li>
              <li>Email us at orders@oilpainting.app with your image</li>
              <li>We&apos;ll provide a quote and timeline</li>
              <li>Once approved, our artists will hand-paint your custom oil painting</li>
            </ol>
          </div>

          <div className="flex justify-center">
            <button
              onClick={() => router.push('/')}
              className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold rounded-full hover:from-amber-600 hover:to-orange-700 transform hover:scale-105 transition-all duration-200"
            >
              Back to Home
              <ChevronRight className="ml-2 h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}