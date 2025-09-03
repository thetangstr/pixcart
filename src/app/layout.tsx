import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { Navbar } from "@/components/navbar";
import { Toaster } from "@/components/ui/sonner";
import dynamic from "next/dynamic";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair" });

// Dynamically import FeedbackWidget to avoid SSR issues
const FeedbackWidget = dynamic(() => import("@/components/feedback-widget"), {
  ssr: false,
});

export const metadata: Metadata = {
  title: "PixCart - Transform Your Pet Photos into Oil Paintings",
  description: "Turn your beloved pet photos into stunning oil painting masterpieces with AI-powered transformation and professional artist creation.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable}`}>
      <body className={`${inter.className} bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50`}>
        <Providers>
          <Navbar />
          <main className="min-h-screen">
            {children}
          </main>
          <FeedbackWidget />
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
