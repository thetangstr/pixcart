import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Navigation from './components/Navigation'
import Footer from './components/Footer'
import FeedbackButton from './components/FeedbackButton'
import Providers from './providers'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Oil Painting Converter - Transform Photos into Art',
  description: 'Convert your photos into beautiful oil paintings using AI. Create stunning artistic masterpieces with our advanced image transformation technology.',
  keywords: 'oil painting, AI art, image conversion, photo to painting, digital art',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className={`${inter.className} min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100`}>
        <Providers>
          <Navigation />
          <main className="relative">
            {children}
          </main>
          <Footer />
          <FeedbackButton />
        </Providers>
      </body>
    </html>
  )
}