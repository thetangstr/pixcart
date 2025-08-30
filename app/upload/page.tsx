'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Upload, Lock } from 'lucide-react'
import Link from 'next/link'

export default function UploadPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/auth/signin?callbackUrl=/upload')
    }
  }, [session, status, router])

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-600"></div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-200">
            <Lock className="w-12 h-12 text-amber-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Sign In Required
            </h2>
            <p className="text-gray-600 mb-6">
              Please sign in to create oil paintings
            </p>
            <Link
              href="/auth/signin?callbackUrl=/upload"
              className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold rounded-lg hover:from-amber-600 hover:to-orange-700 transition-all duration-200 shadow-lg"
            >
              Sign In to Continue
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Create Your Oil Painting
          </h1>
          <p className="text-xl text-gray-600 mb-2">
            Welcome back, {session.user?.name || session.user?.email}!
          </p>
          <p className="text-gray-600">
            Transform your photos into beautiful oil paintings
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-200">
          <div className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center hover:border-amber-400 transition-colors">
            <div className="p-4 bg-gradient-to-br from-amber-500 to-orange-600 rounded-full w-fit mx-auto mb-6">
              <Upload className="h-12 w-12 text-white" />
            </div>
            <h3 className="text-2xl font-semibold text-gray-900 mb-4">
              Drop your image here
            </h3>
            <p className="text-gray-500 mb-6 text-lg">
              or click to browse your files
            </p>
            <button className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold rounded-full hover:from-amber-600 hover:to-orange-700 transform hover:scale-105 transition-all duration-200 shadow-lg">
              Choose Image
            </button>
            <p className="text-sm text-gray-400 mt-4">
              Supports: JPG, PNG, GIF, WebP (Max 10MB)
            </p>
          </div>

          <div className="mt-8 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-800">
              <strong>✨ Pro Tip:</strong> For best results, use high-quality photos with good lighting and clear subjects.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}