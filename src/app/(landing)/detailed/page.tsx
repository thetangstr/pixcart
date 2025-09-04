"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, Palette, Sparkles, Star, Clock, Shield, ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import FileUpload from "@/components/ui/file-upload";
import Image from "next/image";

const testimonials = [
  {
    name: "Sarah M.",
    rating: 5,
    comment: "My golden retriever looks like royalty! The quality exceeded all expectations.",
    avatar: "🐕"
  },
  {
    name: "Mike D.",
    rating: 5,
    comment: "Incredible transformation. My cat portrait is now the centerpiece of our living room.",
    avatar: "🐱"
  },
  {
    name: "Emily R.",
    rating: 5,
    comment: "Fast delivery and stunning quality. Worth every penny!",
    avatar: "🐰"
  }
];

const features = [
  {
    icon: <Palette className="w-6 h-6" />,
    title: "3 Artistic Styles",
    description: "Choose from Renaissance, Van Gogh, or Monet styles"
  },
  {
    icon: <Sparkles className="w-6 h-6" />,
    title: "AI-Powered Preview",
    description: "See your masterpiece before you buy"
  },
  {
    icon: <Clock className="w-6 h-6" />,
    title: "2-3 Week Delivery",
    description: "Hand-painted by professional artists"
  },
  {
    icon: <Shield className="w-6 h-6" />,
    title: "Satisfaction Guaranteed",
    description: "100% money-back guarantee"
  }
];

export default function DetailedLandingPage() {
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-gradient-mesh">
      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 px-4">
        <div className="absolute inset-0 floating-slow opacity-20">
          <div className="gradient-orb top-20 left-10 w-96 h-96 bg-purple-400" />
          <div className="gradient-orb bottom-20 right-10 w-96 h-96 bg-pink-400" />
        </div>
        
        <div className="max-w-7xl mx-auto text-center relative z-10">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent"
          >
            Transform Your Pet Into
            <br />A Timeless Masterpiece
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-xl md:text-2xl text-gray-600 mb-10 max-w-3xl mx-auto"
          >
            Turn your beloved pet's photo into a stunning oil painting. 
            AI-powered preview, hand-painted by professional artists.
          </motion.p>

          {/* Quick Upload */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="max-w-2xl mx-auto mb-12"
          >
            <FileUpload 
              onFileUpload={(data, file) => {
                if (data && file.name) {
                  const imageUrl = `data:${file.type};base64,${data}`;
                  setUploadedImage(imageUrl);
                }
              }}
              className="glass-card p-8"
            />
            {uploadedImage && (
              <Link href="/create">
                <Button className="mt-4 btn-primary btn-lg group">
                  Continue to Style Selection
                  <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            )}
          </motion.div>

          {/* Trust Badges */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="flex flex-wrap justify-center gap-8 text-gray-600"
          >
            <div className="flex items-center gap-2">
              <Star className="w-5 h-5 text-yellow-500 fill-current" />
              <span>4.9/5 Rating</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-5 h-5 text-green-500" />
              <span>1000+ Happy Customers</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-blue-500" />
              <span>Money-Back Guarantee</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-white/50">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-12">How It Works</h2>
          
          <div className="grid md:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="glass-card p-6 text-center"
              >
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white mx-auto mb-4">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Style Showcase */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-12">Choose Your Style</h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { name: "Renaissance", emoji: "🎨", price: "$149" },
              { name: "Van Gogh", emoji: "🌻", price: "$179" },
              { name: "Monet", emoji: "🌸", price: "$169" }
            ].map((style, index) => (
              <motion.div
                key={style.name}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
                className="painting-frame group cursor-pointer"
              >
                <div className="aspect-[4/5] bg-gradient-to-br from-amber-100 to-orange-100 flex flex-col items-center justify-center">
                  <span className="text-6xl mb-4">{style.emoji}</span>
                  <h3 className="text-2xl font-bold mb-2">{style.name}</h3>
                  <p className="text-3xl font-bold text-purple-600">{style.price}</p>
                  <p className="text-gray-600 mt-2">Starting price</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 px-4 bg-gradient-to-br from-purple-50 to-pink-50">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-12">What Our Customers Say</h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="glass-card p-6"
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="text-4xl">{testimonial.avatar}</div>
                  <div>
                    <h4 className="font-semibold">{testimonial.name}</h4>
                    <div className="flex gap-1">
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <Star key={i} className="w-4 h-4 text-yellow-500 fill-current" />
                      ))}
                    </div>
                  </div>
                </div>
                <p className="text-gray-600 italic">"{testimonial.comment}"</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 text-center">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-4xl font-bold mb-6">Ready to Create Your Masterpiece?</h2>
          <p className="text-xl text-gray-600 mb-8">
            Upload your pet's photo now and see the magic happen with our AI preview.
            No payment required until you're 100% satisfied.
          </p>
          <Link href="/create">
            <Button className="btn-primary btn-lg group">
              Start Your Portrait
              <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
          <p className="mt-4 text-sm text-gray-500">
            Free AI preview • 2-3 week delivery • 100% satisfaction guarantee
          </p>
        </div>
      </section>
    </div>
  );
}