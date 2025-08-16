'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { loadStripe } from '@stripe/stripe-js'
import {
  Elements,
  CardElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js'
import { ChevronRight, Package, CreditCard, User, MapPin, Check } from 'lucide-react'

// Initialize Stripe (you'll need to add your publishable key)
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || 'pk_test_placeholder')

interface OrderData {
  customerInfo: {
    firstName: string
    lastName: string
    email: string
    phone: string
  }
  shippingAddress: {
    street: string
    apartment?: string
    city: string
    state: string
    zipCode: string
    country: string
  }
  orderDetails: {
    imageUrl: string
    style: string
    size: string
    price: number
  }
}

function CheckoutForm() {
  const router = useRouter()
  const stripe = useStripe()
  const elements = useElements()
  
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [orderData, setOrderData] = useState<OrderData>({
    customerInfo: {
      firstName: '',
      lastName: '',
      email: '',
      phone: ''
    },
    shippingAddress: {
      street: '',
      apartment: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'US'
    },
    orderDetails: {
      imageUrl: '',
      style: 'classic',
      size: '16x20',
      price: 79.99
    }
  })

  // Load image from session storage
  useEffect(() => {
    const savedImage = sessionStorage.getItem('convertedImage')
    const savedStyle = sessionStorage.getItem('selectedStyle')
    if (savedImage) {
      setOrderData(prev => ({
        ...prev,
        orderDetails: {
          ...prev.orderDetails,
          imageUrl: savedImage,
          style: savedStyle || 'classic'
        }
      }))
    }
  }, [])

  const updateCustomerInfo = (field: string, value: string) => {
    setOrderData(prev => ({
      ...prev,
      customerInfo: { ...prev.customerInfo, [field]: value }
    }))
  }

  const updateShippingAddress = (field: string, value: string) => {
    setOrderData(prev => ({
      ...prev,
      shippingAddress: { ...prev.shippingAddress, [field]: value }
    }))
  }

  const updateOrderDetails = (field: string, value: any) => {
    setOrderData(prev => ({
      ...prev,
      orderDetails: { ...prev.orderDetails, [field]: value }
    }))
  }

  const calculateTotal = () => {
    const sizeMultiplier = {
      '8x10': 0.5,
      '11x14': 0.75,
      '16x20': 1,
      '20x24': 1.5,
      '24x36': 2
    }
    return (orderData.orderDetails.price * (sizeMultiplier[orderData.orderDetails.size as keyof typeof sizeMultiplier] || 1)).toFixed(2)
  }

  const handlePayment = async () => {
    if (!stripe || !elements) return

    setLoading(true)
    setError(null)

    try {
      // Create payment intent on backend
      const response = await fetch('/api/checkout/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: Math.round(parseFloat(calculateTotal()) * 100), // Convert to cents
          orderData
        })
      })

      const { clientSecret, orderId } = await response.json()

      // Confirm payment
      const result = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: elements.getElement(CardElement)!,
          billing_details: {
            name: `${orderData.customerInfo.firstName} ${orderData.customerInfo.lastName}`,
            email: orderData.customerInfo.email,
            phone: orderData.customerInfo.phone,
            address: {
              line1: orderData.shippingAddress.street,
              line2: orderData.shippingAddress.apartment,
              city: orderData.shippingAddress.city,
              state: orderData.shippingAddress.state,
              postal_code: orderData.shippingAddress.zipCode,
              country: orderData.shippingAddress.country
            }
          }
        }
      })

      if (result.error) {
        setError(result.error.message || 'Payment failed')
      } else {
        // Payment successful
        router.push(`/order-confirmation?orderId=${orderId}`)
      }
    } catch (err) {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className={`flex items-center ${step >= 1 ? 'text-amber-600' : 'text-gray-400'}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${step >= 1 ? 'bg-amber-600 text-white' : 'bg-gray-200'}`}>
                {step > 1 ? <Check className="h-5 w-5" /> : <User className="h-5 w-5" />}
              </div>
              <span className="ml-2 font-medium">Customer Info</span>
            </div>
            <ChevronRight className="h-5 w-5 text-gray-400" />
            <div className={`flex items-center ${step >= 2 ? 'text-amber-600' : 'text-gray-400'}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-amber-600 text-white' : 'bg-gray-200'}`}>
                {step > 2 ? <Check className="h-5 w-5" /> : <MapPin className="h-5 w-5" />}
              </div>
              <span className="ml-2 font-medium">Shipping</span>
            </div>
            <ChevronRight className="h-5 w-5 text-gray-400" />
            <div className={`flex items-center ${step >= 3 ? 'text-amber-600' : 'text-gray-400'}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${step >= 3 ? 'bg-amber-600 text-white' : 'bg-gray-200'}`}>
                {step > 3 ? <Check className="h-5 w-5" /> : <Package className="h-5 w-5" />}
              </div>
              <span className="ml-2 font-medium">Order Details</span>
            </div>
            <ChevronRight className="h-5 w-5 text-gray-400" />
            <div className={`flex items-center ${step >= 4 ? 'text-amber-600' : 'text-gray-400'}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${step >= 4 ? 'bg-amber-600 text-white' : 'bg-gray-200'}`}>
                <CreditCard className="h-5 w-5" />
              </div>
              <span className="ml-2 font-medium">Payment</span>
            </div>
          </div>
        </div>

        {/* Form Content */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          {/* Step 1: Customer Information */}
          {step === 1 && (
            <div>
              <h2 className="text-2xl font-bold mb-6">Customer Information</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">First Name</label>
                  <input
                    type="text"
                    value={orderData.customerInfo.firstName}
                    onChange={(e) => updateCustomerInfo('firstName', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-amber-500 focus:border-amber-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
                  <input
                    type="text"
                    value={orderData.customerInfo.lastName}
                    onChange={(e) => updateCustomerInfo('lastName', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-amber-500 focus:border-amber-500"
                    required
                  />
                </div>
              </div>
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <input
                  type="email"
                  value={orderData.customerInfo.email}
                  onChange={(e) => updateCustomerInfo('email', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-amber-500 focus:border-amber-500"
                  required
                />
              </div>
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                <input
                  type="tel"
                  value={orderData.customerInfo.phone}
                  onChange={(e) => updateCustomerInfo('phone', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-amber-500 focus:border-amber-500"
                  required
                />
              </div>
              <button
                onClick={() => setStep(2)}
                className="mt-6 w-full bg-amber-600 text-white py-3 rounded-lg font-semibold hover:bg-amber-700 transition-colors"
              >
                Continue to Shipping
              </button>
            </div>
          )}

          {/* Step 2: Shipping Address */}
          {step === 2 && (
            <div>
              <h2 className="text-2xl font-bold mb-6">Shipping Address</h2>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Street Address</label>
                <input
                  type="text"
                  value={orderData.shippingAddress.street}
                  onChange={(e) => updateShippingAddress('street', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-amber-500 focus:border-amber-500"
                  required
                />
              </div>
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Apartment/Suite (Optional)</label>
                <input
                  type="text"
                  value={orderData.shippingAddress.apartment}
                  onChange={(e) => updateShippingAddress('apartment', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-amber-500 focus:border-amber-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                  <input
                    type="text"
                    value={orderData.shippingAddress.city}
                    onChange={(e) => updateShippingAddress('city', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-amber-500 focus:border-amber-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">State</label>
                  <input
                    type="text"
                    value={orderData.shippingAddress.state}
                    onChange={(e) => updateShippingAddress('state', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-amber-500 focus:border-amber-500"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">ZIP Code</label>
                  <input
                    type="text"
                    value={orderData.shippingAddress.zipCode}
                    onChange={(e) => updateShippingAddress('zipCode', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-amber-500 focus:border-amber-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Country</label>
                  <select
                    value={orderData.shippingAddress.country}
                    onChange={(e) => updateShippingAddress('country', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-amber-500 focus:border-amber-500"
                  >
                    <option value="US">United States</option>
                    <option value="CA">Canada</option>
                    <option value="GB">United Kingdom</option>
                    <option value="AU">Australia</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-4 mt-6">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep(3)}
                  className="flex-1 bg-amber-600 text-white py-3 rounded-lg font-semibold hover:bg-amber-700 transition-colors"
                >
                  Continue to Order Details
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Order Details */}
          {step === 3 && (
            <div>
              <h2 className="text-2xl font-bold mb-6">Order Details</h2>
              
              {/* Preview Image */}
              {orderData.orderDetails.imageUrl && (
                <div className="mb-6">
                  <img
                    src={orderData.orderDetails.imageUrl}
                    alt="Your oil painting"
                    className="w-full max-w-md mx-auto rounded-lg shadow-lg"
                  />
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Print Size</label>
                  <select
                    value={orderData.orderDetails.size}
                    onChange={(e) => updateOrderDetails('size', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-amber-500 focus:border-amber-500"
                  >
                    <option value="8x10">8" × 10" - $39.99</option>
                    <option value="11x14">11" × 14" - $59.99</option>
                    <option value="16x20">16" × 20" - $79.99</option>
                    <option value="20x24">20" × 24" - $119.99</option>
                    <option value="24x36">24" × 36" - $159.99</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Frame Style</label>
                  <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-amber-500 focus:border-amber-500">
                    <option value="none">No Frame</option>
                    <option value="black">Black Frame (+$30)</option>
                    <option value="white">White Frame (+$30)</option>
                    <option value="gold">Gold Frame (+$50)</option>
                  </select>
                </div>

                <div className="border-t pt-4">
                  <div className="flex justify-between text-lg font-semibold">
                    <span>Total:</span>
                    <span>${calculateTotal()}</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-4 mt-6">
                <button
                  onClick={() => setStep(2)}
                  className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep(4)}
                  className="flex-1 bg-amber-600 text-white py-3 rounded-lg font-semibold hover:bg-amber-700 transition-colors"
                >
                  Continue to Payment
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Payment */}
          {step === 4 && (
            <div>
              <h2 className="text-2xl font-bold mb-6">Payment Information</h2>
              
              {/* Order Summary */}
              <div className="bg-gray-50 rounded-lg p-6 mb-6">
                <h3 className="font-semibold mb-4">Order Summary</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Oil Painting Print ({orderData.orderDetails.size})</span>
                    <span>${calculateTotal()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Shipping</span>
                    <span>FREE</span>
                  </div>
                  <div className="border-t pt-2 flex justify-between font-semibold">
                    <span>Total</span>
                    <span>${calculateTotal()}</span>
                  </div>
                </div>
              </div>

              {/* Stripe Card Element */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Card Details</label>
                <div className="p-4 border border-gray-300 rounded-lg">
                  <CardElement
                    options={{
                      style: {
                        base: {
                          fontSize: '16px',
                          color: '#424770',
                          '::placeholder': {
                            color: '#aab7c4',
                          },
                        },
                      },
                    }}
                  />
                </div>
              </div>

              {error && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
                  {error}
                </div>
              )}

              <div className="flex gap-4">
                <button
                  onClick={() => setStep(3)}
                  className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
                  disabled={loading}
                >
                  Back
                </button>
                <button
                  onClick={handlePayment}
                  className="flex-1 bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors disabled:opacity-50"
                  disabled={!stripe || loading}
                >
                  {loading ? 'Processing...' : `Pay $${calculateTotal()}`}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function CheckoutPage() {
  return (
    <Elements stripe={stripePromise}>
      <CheckoutForm />
    </Elements>
  )
}