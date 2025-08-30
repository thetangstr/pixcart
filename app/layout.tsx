import './globals.css'
import type { Metadata } from 'next'

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
        {children}
      </body>
    </html>
  )
}