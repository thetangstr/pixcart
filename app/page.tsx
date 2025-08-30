import Link from 'next/link'
import { ArrowRight, Upload, Sparkles, Image, Zap, Shield, Heart } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            {/* Badge */}
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-white/60 backdrop-blur-sm border border-amber-200 text-amber-800 text-sm font-medium mb-8">
              <Sparkles className="h-4 w-4 mr-2" />
              Transform Photos into Masterpieces
            </div>

            {/* Main Headline */}
            <h1 className="text-5xl lg:text-7xl font-bold text-gray-900 mb-8">
              Turn Your Photos Into
              <span className="block bg-gradient-to-r from-amber-500 to-orange-600 bg-clip-text text-transparent">
                Beautiful Oil Paintings
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-xl lg:text-2xl text-gray-600 max-w-3xl mx-auto mb-12 leading-relaxed">
              Get a stunning hand-painted oil painting of your cherished photo. 
              AI preview in seconds, then our master artists create your custom artwork.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link
                href="/upload"
                className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold rounded-full hover:from-amber-600 hover:to-orange-700 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                <Upload className="h-5 w-5 mr-2" />
                Start Creating
                <ArrowRight className="h-5 w-5 ml-2" />
              </Link>
              
              <Link
                href="/gallery"
                className="inline-flex items-center px-8 py-4 bg-white/80 backdrop-blur-sm text-gray-800 font-semibold rounded-full hover:bg-white border border-gray-200 hover:border-amber-300 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                <Image className="h-5 w-5 mr-2" />
                View Gallery
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-white/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Why Choose Our Oil Painting Converter?
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Professional-grade AI technology that transforms your memories into artistic masterpieces
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="group p-8 bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-amber-200">
              <div className="p-3 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl w-fit mb-6 group-hover:scale-110 transition-transform duration-200">
                <Zap className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Lightning Fast</h3>
              <p className="text-gray-600 leading-relaxed">
                Transform your photos in seconds using our optimized AI pipeline. No waiting, no delays - just instant artistic magic.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="group p-8 bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-amber-200">
              <div className="p-3 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl w-fit mb-6 group-hover:scale-110 transition-transform duration-200">
                <Shield className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Secure & Private</h3>
              <p className="text-gray-600 leading-relaxed">
                Your photos are processed securely and never stored permanently. Complete privacy and data protection guaranteed.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="group p-8 bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-amber-200">
              <div className="p-3 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl w-fit mb-6 group-hover:scale-110 transition-transform duration-200">
                <Heart className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Hand-Painted Quality</h3>
              <p className="text-gray-600 leading-relaxed">
                Real artists hand-paint your custom oil painting on canvas. Museum-quality artwork that will last generations.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-r from-amber-500 to-orange-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl lg:text-5xl font-bold text-white mb-6">
            Ready to Create Your Masterpiece?
          </h2>
          <p className="text-xl text-amber-100 mb-8 max-w-2xl mx-auto">
            Join thousands of users who have transformed their photos into stunning oil paintings.
          </p>
          <Link
            href="/upload"
            className="inline-flex items-center px-8 py-4 bg-white text-amber-600 font-semibold rounded-full hover:bg-amber-50 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            <Upload className="h-5 w-5 mr-2" />
            Start Converting Now
            <ArrowRight className="h-5 w-5 ml-2" />
          </Link>
        </div>
      </section>
    </div>
  )
}