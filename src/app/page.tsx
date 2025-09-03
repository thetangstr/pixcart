"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { motion } from "framer-motion";
import { 
  Palette, 
  Sparkles, 
  Users, 
  Shield, 
  ChevronRight,
  Star,
  Clock,
  Heart
} from "lucide-react";
import { useAuth } from "@/app/providers";
import { useRouter } from "next/navigation";

const styles = [
  {
    name: "Classic Renaissance",
    description: "Timeless elegance with rich colors and dramatic lighting",
    example: "🎨",
  },
  {
    name: "Van Gogh Style",
    description: "Bold, swirling brushstrokes with vibrant colors",
    example: "🌌",
  },
  {
    name: "Monet Impressionist",
    description: "Soft, dreamy atmosphere with gentle pastels",
    example: "🌸",
  },
];

const features = [
  {
    icon: <Sparkles className="h-6 w-6" />,
    title: "AI-Powered Preview",
    description: "See your pet transformed instantly with advanced AI technology",
  },
  {
    icon: <Users className="h-6 w-6" />,
    title: "Professional Artists",
    description: "Real artists create physical paintings based on AI previews",
  },
  {
    icon: <Shield className="h-6 w-6" />,
    title: "Satisfaction Guaranteed",
    description: "100% satisfaction guarantee on all custom paintings",
  },
  {
    icon: <Clock className="h-6 w-6" />,
    title: "Fast Turnaround",
    description: "Receive your custom painting within 2-3 weeks",
  },
];

const testimonials = [
  {
    name: "Sarah Johnson",
    rating: 5,
    comment: "The painting of my golden retriever is absolutely stunning! It captures his personality perfectly.",
  },
  {
    name: "Michael Chen",
    rating: 5,
    comment: "Amazing quality and fast service. My cat looks like royalty in the Renaissance style!",
  },
  {
    name: "Emma Williams",
    rating: 5,
    comment: "Best gift I've ever given. My mom cried when she saw the painting of her beloved poodle.",
  },
];

export default function Home() {
  const { user } = useAuth();
  const router = useRouter();

  return (
    <div className="container mx-auto px-4 py-12">
      {/* Hero Section */}
      <motion.section 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center mb-20"
      >
        <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
          Transform Your Pet Photos into Timeless Art
        </h1>
        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
          Turn your beloved pet photos into stunning oil paintings with AI-powered previews 
          and professional artist creation
        </p>
        <div className="flex gap-4 justify-center">
          {user ? (
            <Link href="/create">
              <Button size="lg" className="bg-purple-600 hover:bg-purple-700">
                Start Creating <ChevronRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          ) : (
            <Button 
              size="lg" 
              className="bg-purple-600 hover:bg-purple-700"
              onClick={() => router.push("/auth/signin")}
            >
              Get Started <ChevronRight className="ml-2 h-5 w-5" />
            </Button>
          )}
          <Link href="#how-it-works">
            <Button size="lg" variant="outline">
              Learn More
            </Button>
          </Link>
        </div>
      </motion.section>

      {/* Style Showcase */}
      <section className="mb-20">
        <h2 className="text-3xl font-bold text-center mb-12">Choose Your Art Style</h2>
        <div className="grid md:grid-cols-3 gap-8">
          {styles.map((style, index) => (
            <motion.div
              key={style.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Card className="p-6 hover:shadow-xl transition-shadow cursor-pointer">
                <div className="text-6xl mb-4 text-center">{style.example}</div>
                <h3 className="text-xl font-semibold mb-2">{style.name}</h3>
                <p className="text-gray-600">{style.description}</p>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="mb-20">
        <h2 className="text-3xl font-bold text-center mb-12">Why Choose PixCart?</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="text-center"
            >
              <div className="inline-flex p-3 rounded-full bg-purple-100 text-purple-600 mb-4">
                {feature.icon}
              </div>
              <h3 className="font-semibold mb-2">{feature.title}</h3>
              <p className="text-gray-600 text-sm">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="mb-20 bg-gray-50 -mx-4 px-4 py-16">
        <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
        <div className="max-w-4xl mx-auto">
          <div className="space-y-8">
            {[
              { step: 1, title: "Upload Your Photo", desc: "Choose your favorite pet photo" },
              { step: 2, title: "Select Art Style", desc: "Pick from Classic, Van Gogh, or Monet styles" },
              { step: 3, title: "AI Preview", desc: "See your AI-generated oil painting preview instantly" },
              { step: 4, title: "Place Order", desc: "Order a physical painting created by professional artists" },
              { step: 5, title: "Receive Your Art", desc: "Get your custom oil painting delivered to your door" },
            ].map((item, index) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="flex items-center gap-4"
              >
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold">
                  {item.step}
                </div>
                <div>
                  <h3 className="font-semibold">{item.title}</h3>
                  <p className="text-gray-600">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="mb-20">
        <h2 className="text-3xl font-bold text-center mb-12">What Our Customers Say</h2>
        <div className="grid md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={testimonial.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Card className="p-6">
                <div className="flex mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-gray-600 mb-4">"{testimonial.comment}"</p>
                <p className="font-semibold">- {testimonial.name}</p>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <motion.section 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="text-center bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-2xl p-12"
      >
        <h2 className="text-3xl font-bold mb-4">Ready to Create Your Masterpiece?</h2>
        <p className="text-xl mb-8 opacity-90">
          Join thousands of pet lovers who've transformed their photos into art
        </p>
        {user ? (
          <Link href="/create">
            <Button size="lg" variant="secondary">
              Create Your Portrait Now <Heart className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        ) : (
          <Button 
            size="lg" 
            variant="secondary"
            onClick={() => router.push("/auth/signin")}
          >
            Get Started Free <Heart className="ml-2 h-5 w-5" />
          </Button>
        )}
      </motion.section>
    </div>
  );
}