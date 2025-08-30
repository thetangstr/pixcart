import './globals.css'
import type { Metadata } from 'next'
import Providers from './providers'
import Link from 'next/link'
import { Palette } from 'lucide-react'
import AuthButton from './components/AuthButton'

export const metadata: Metadata = {
  title: 'Oil Painting Converter - Transform Photos into Art',
  description: 'Convert your photos into stunning oil paintings using AI technology.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100">
        <Providers>
          {/* Navigation */}
          <nav className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center h-16">
                <Link href="/" className="flex items-center gap-2">
                  <Palette className="w-8 h-8 text-amber-600" />
                  <span className="font-bold text-xl text-gray-900">Oil Painting AI</span>
                </Link>
                <div className="flex items-center gap-6">
                  <Link href="/upload" className="text-gray-700 hover:text-amber-600 transition-colors">
                    Create
                  </Link>
                  <Link href="/gallery" className="text-gray-700 hover:text-amber-600 transition-colors">
                    Gallery
                  </Link>
                  <AuthButton />
                </div>
              </div>
            </div>
          </nav>
          {children}
        </Providers>
      </body>
    </html>
  )
}