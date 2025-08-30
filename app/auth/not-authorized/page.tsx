'use client'

// import { signOut } from 'next-auth/react' // NextAuth removed
import { AlertCircle, LogOut, Mail } from 'lucide-react'
import Link from 'next/link'

export default function NotAuthorized() {
  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-8">
          {/* Icon and Title */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center p-3 bg-red-100 rounded-full mb-4">
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Restricted</h1>
            <p className="text-gray-600">
              Your email is not authorized to access this application.
            </p>
          </div>

          {/* Info Box */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-amber-800">
              <strong>This is a private application.</strong> Only whitelisted users can access the Oil Painting App. 
              If you believe you should have access, please contact the administrator.
            </p>
          </div>

          {/* Contact Admin */}
          <div className="mb-6">
            <h2 className="text-sm font-semibold text-gray-700 mb-2">Need Access?</h2>
            <p className="text-sm text-gray-600 mb-3">
              Contact the administrator to request access:
            </p>
            <a
              href="mailto:thetangstr@gmail.com?subject=Oil Painting App Access Request"
              className="inline-flex items-center text-amber-600 hover:text-amber-700"
            >
              <Mail className="h-4 w-4 mr-2" />
              thetangstr@gmail.com
            </a>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={() => window.location.href = '/auth/signin'} // signOut removed
              className="w-full flex items-center justify-center px-4 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold rounded-lg hover:from-amber-600 hover:to-orange-700 transition-all duration-200"
            >
              <LogOut className="h-5 w-5 mr-2" />
              Sign Out & Try Different Account
            </button>

            <Link
              href="/"
              className="w-full flex items-center justify-center px-4 py-3 border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-all duration-200"
            >
              Go to Homepage
            </Link>
          </div>

          {/* Footer Note */}
          <p className="mt-6 text-center text-xs text-gray-500">
            If you just signed in, your access request may be pending approval.
          </p>
        </div>
      </div>
    </div>
  )
}