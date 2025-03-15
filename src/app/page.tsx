import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800 py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-5xl font-bold mb-6">Transform Your Photos into Beautiful Hand-Painted Art</h1>
            <p className="text-xl mb-8 text-gray-600 dark:text-gray-300">
              Upload your favorite photo and our AI will show you a preview of your painting. Our skilled artists will then create a stunning hand-painted masterpiece just for you.
            </p>
            <Link 
              href="/upload"
              className="bg-blue-600 text-white px-8 py-4 rounded-full text-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              Start Your Painting
            </Link>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="text-center p-6">
              <div className="bg-blue-100 dark:bg-gray-700 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">1. Upload Your Photo</h3>
              <p className="text-gray-600 dark:text-gray-300">Choose your favorite photo to be transformed into a painting</p>
            </div>
            <div className="text-center p-6">
              <div className="bg-blue-100 dark:bg-gray-700 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">2. Preview AI Generation</h3>
              <p className="text-gray-600 dark:text-gray-300">See an instant AI-generated preview of your painting</p>
            </div>
            <div className="text-center p-6">
              <div className="bg-blue-100 dark:bg-gray-700 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">3. Order & Receive</h3>
              <p className="text-gray-600 dark:text-gray-300">Place your order and receive your hand-painted masterpiece</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-gray-50 dark:bg-gray-800 py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-8">Why Choose Us</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="p-6">
                <h3 className="text-xl font-semibold mb-2">Professional Artists</h3>
                <p className="text-gray-600 dark:text-gray-300">Our skilled artists bring years of experience to create your perfect painting</p>
              </div>
              <div className="p-6">
                <h3 className="text-xl font-semibold mb-2">AI-Powered Preview</h3>
                <p className="text-gray-600 dark:text-gray-300">See how your painting will look before placing an order</p>
              </div>
              <div className="p-6">
                <h3 className="text-xl font-semibold mb-2">Quality Materials</h3>
                <p className="text-gray-600 dark:text-gray-300">Premium canvas and oil paints for lasting beauty</p>
              </div>
              <div className="p-6">
                <h3 className="text-xl font-semibold mb-2">100% Satisfaction</h3>
                <p className="text-gray-600 dark:text-gray-300">Love your painting or get your money back</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-6">Ready to Transform Your Photo?</h2>
          <Link 
            href="/upload"
            className="bg-blue-600 text-white px-8 py-4 rounded-full text-lg font-semibold hover:bg-blue-700 transition-colors inline-block"
          >
            Start Your Painting Now
          </Link>
        </div>
      </section>
    </div>
  );
}
