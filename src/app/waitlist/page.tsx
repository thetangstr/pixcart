"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/app/providers";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Clock, 
  Users, 
  Star, 
  CheckCircle, 
  Mail,
  Palette,
  Sparkles,
  ArrowRight
} from "lucide-react";

interface WaitlistStatus {
  isWaitlisted: boolean;
  isAllowlisted: boolean;
  position?: number;
  totalWaitlisted?: number;
  joinedAt?: string;
  estimatedWaitTime?: string;
}

export default function WaitlistPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [waitlistStatus, setWaitlistStatus] = useState<WaitlistStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkWaitlistStatus();
  }, [user, loading]);

  const checkWaitlistStatus = async () => {
    if (!loading && user) {
      try {
        const response = await fetch('/api/user/beta-status');
        const data = await response.json();
        
        // If user is allowlisted, redirect to dashboard
        if (data.isAllowlisted) {
          router.push('/dashboard');
          return;
        }
        
        setWaitlistStatus(data);
      } catch (error) {
        console.error('Error checking waitlist status:', error);
      } finally {
        setIsLoading(false);
      }
    } else if (!loading && !user) {
      router.push('/auth/signin?callbackUrl=/waitlist');
    }
  };

  if (loading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600" />
      </div>
    );
  }

  if (!waitlistStatus) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50">
        <Card className="max-w-md mx-4">
          <CardContent className="pt-6">
            <p className="text-center text-gray-600">Unable to load waitlist status</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 py-12">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-4xl mx-auto"
        >
          {/* Header */}
          <div className="text-center mb-12">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2 }}
              className="mx-auto w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mb-6"
            >
              <Palette className="w-10 h-10 text-amber-600" />
            </motion.div>
            <h1 className="text-4xl font-bold text-gray-900 font-playfair mb-4">
              Welcome to PixCart Beta
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              You're on our exclusive waitlist! We're carefully onboarding users to ensure 
              the best experience with our AI-powered pet portrait service.
            </p>
          </div>

          {/* Status Card */}
          <Card className="mb-8 border-2 border-amber-200 shadow-lg">
            <CardHeader className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Clock className="w-5 h-5 text-amber-600" />
                <CardTitle className="text-2xl text-amber-800">Waitlist Status</CardTitle>
              </div>
              <CardDescription className="text-lg">
                {waitlistStatus.isAllowlisted ? (
                  <Badge className="bg-green-100 text-green-800 text-lg px-4 py-2">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Approved! Redirecting...
                  </Badge>
                ) : (
                  <Badge className="bg-amber-100 text-amber-800 text-lg px-4 py-2">
                    <Clock className="w-4 h-4 mr-2" />
                    On Waitlist
                  </Badge>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center space-y-6">
              {waitlistStatus.position && waitlistStatus.totalWaitlisted && (
                <div className="bg-amber-50 p-6 rounded-lg">
                  <div className="text-3xl font-bold text-amber-700 mb-2">
                    #{waitlistStatus.position}
                  </div>
                  <p className="text-amber-600">
                    Your position out of {waitlistStatus.totalWaitlisted.toLocaleString()} users
                  </p>
                </div>
              )}
              
              {waitlistStatus.joinedAt && (
                <div className="text-center">
                  <p className="text-gray-600">
                    <strong>Joined:</strong> {new Date(waitlistStatus.joinedAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
              )}

              {waitlistStatus.estimatedWaitTime && (
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-blue-800 font-medium">
                    Estimated wait time: {waitlistStatus.estimatedWaitTime}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* What to Expect */}
          <div className="grid md:grid-cols-2 gap-8 mb-12">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-600" />
                  What's Coming
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-amber-500 rounded-full mt-2 flex-shrink-0" />
                  <p className="text-gray-700">
                    AI-powered pet portrait generation with multiple artistic styles
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-amber-500 rounded-full mt-2 flex-shrink-0" />
                  <p className="text-gray-700">
                    Professional artists will hand-paint your AI preview
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-amber-500 rounded-full mt-2 flex-shrink-0" />
                  <p className="text-gray-700">
                    High-quality canvas prints delivered to your door
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-amber-500 rounded-full mt-2 flex-shrink-0" />
                  <p className="text-gray-700">
                    Beta access to new features and styles first
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-amber-600" />
                  Beta Benefits
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3">
                  <Star className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
                  <p className="text-gray-700">
                    <strong>Early Access:</strong> Be among the first to experience PixCart
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <Star className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
                  <p className="text-gray-700">
                    <strong>Special Pricing:</strong> Exclusive beta user discounts
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <Star className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
                  <p className="text-gray-700">
                    <strong>Direct Input:</strong> Shape the product with your feedback
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <Star className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
                  <p className="text-gray-700">
                    <strong>Priority Support:</strong> Get help faster as a beta tester
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Contact */}
          <Card className="text-center bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200">
            <CardContent className="pt-6">
              <Mail className="w-8 h-8 text-amber-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Questions? We're Here to Help
              </h3>
              <p className="text-gray-600 mb-4">
                Reach out to us anytime while you're waiting. We'd love to hear from you!
              </p>
              <Button 
                className="bg-amber-600 hover:bg-amber-700"
                onClick={() => router.push('/support')}
              >
                Contact Support
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>

          {/* Footer Message */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-center mt-12 text-gray-500"
          >
            <p>
              We'll notify you by email as soon as your access is approved.
            </p>
            <p className="mt-2">
              Thank you for your patience and for being part of the PixCart beta community!
            </p>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}