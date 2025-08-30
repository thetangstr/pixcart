'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/app/lib/supabase'
import type { User } from '@supabase/supabase-js'
import { Upload, Lock } from 'lucide-react'
import Link from 'next/link'

export default function UploadPage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
      if (!session) {
        router.push('/auth/signin')
      }
    })
  }, [router, supabase.auth])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-amber-600"></div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <Lock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Authentication Required
          </h1>
          <p className="text-gray-600 mb-6">
            Please sign in to upload and convert your images to oil paintings.
          </p>
          <Link
            href="/auth/signin"
            className="inline-flex items-center px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
          >
            Sign In to Continue
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen py-12">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-8">
          <Upload className="w-16 h-16 text-amber-600 mx-auto mb-4" />
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Upload Your Image
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Transform your photos into beautiful oil paintings with AI. 
            Upload any image and watch it become a masterpiece.
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-200">
          <div className="text-center">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 hover:border-amber-400 transition-colors">
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-2">
                <span className="font-medium">Click to upload</span> or drag and drop
              </p>
              <p className="text-sm text-gray-500">
                PNG, JPG, or WEBP (MAX. 10MB)
              </p>
            </div>
          </div>

          <div className="mt-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              How it works:
            </h3>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-xl font-bold text-amber-600">1</span>
                </div>
                <h4 className="font-medium text-gray-900 mb-1">Upload</h4>
                <p className="text-sm text-gray-600">
                  Choose your favorite photo
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-xl font-bold text-amber-600">2</span>
                </div>
                <h4 className="font-medium text-gray-900 mb-1">Convert</h4>
                <p className="text-sm text-gray-600">
                  AI transforms it into oil painting
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-xl font-bold text-amber-600">3</span>
                </div>
                <h4 className="font-medium text-gray-900 mb-1">Download</h4>
                <p className="text-sm text-gray-600">
                  Get your beautiful artwork
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}