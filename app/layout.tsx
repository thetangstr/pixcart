import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Navigation from './components/Navigation'
import Footer from './components/Footer'
import ClientLayout from './components/ClientLayout'
import GoogleAnalytics from './components/GoogleAnalytics'
import FloatingFeedbackButton from './components/FloatingFeedbackButton'
import Providers from './providers'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Oil Painting Converter - Transform Photos into Art | AI Art Generator',
  description: 'Convert your photos into stunning oil paintings using advanced AI technology. Transform pet portraits, landscapes, and selfies into museum-quality artwork in seconds. Free online tool.',
  keywords: 'oil painting converter, AI art generator, photo to painting, pet portrait oil painting, digital art transformation, AI painting app, turn photo into painting, oil painting effect, online art converter, AI artist',
  authors: [{ name: 'Oil Painting Converter' }],
  creator: 'Oil Painting Converter',
  publisher: 'Oil Painting Converter',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    title: 'Oil Painting Converter - Transform Photos into Art',
    description: 'Convert your photos into beautiful oil paintings using AI. Perfect for pet portraits, landscapes, and personal photos.',
    url: 'https://oilpainting.app',
    siteName: 'Oil Painting Converter',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Oil Painting Converter Preview',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Oil Painting Converter - AI Art Generator',
    description: 'Transform your photos into stunning oil paintings with AI',
    images: ['/twitter-image.jpg'],
  },
  alternates: {
    canonical: 'https://oilpainting.app',
  },
  verification: {
    google: 'google-site-verification-code',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="scroll-smooth">
      <head>
        <GoogleAnalytics />
      </head>
      <body className={`${inter.className} min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100`}>
        <Providers>
          <ClientLayout>
            <Navigation />
            <main className="relative">
              {children}
            </main>
            <Footer />
            <FloatingFeedbackButton />
          </ClientLayout>
        </Providers>
      </body>
    </html>
  )
}