"use client";

import { useAuth } from "@/app/providers";
import { createClient } from "@/lib/supabase/client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from "framer-motion";
import { LogOut, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function SignOutPage() {
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const supabase = createClient();
  const router = useRouter();

  const handleSignOut = async () => {
    setIsLoading(true);
    try {
      await supabase.auth.signOut();
      router.push("/");
    } catch (error) {
      console.error("Error signing out:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-white to-pink-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className="shadow-2xl border-0 bg-white/80 backdrop-blur">
          <CardHeader className="text-center space-y-4">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring" }}
              className="mx-auto w-16 h-16 bg-gradient-to-r from-red-500 to-orange-500 rounded-full flex items-center justify-center"
            >
              <LogOut className="w-8 h-8 text-white" />
            </motion.div>
            <div>
              <CardTitle className="text-2xl font-bold">Sign Out</CardTitle>
              <CardDescription>
                Are you sure you want to sign out of PixCart?
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="text-center">
            {user && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="mb-6 p-4 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center justify-center space-x-3">
                  {user.user_metadata?.avatar_url && (
                    <img
                      src={user.user_metadata.avatar_url}
                      alt={user.user_metadata?.name || "User"}
                      className="w-10 h-10 rounded-full"
                    />
                  )}
                  <div>
                    <p className="font-medium">{user.user_metadata?.name || user.email?.split('@')[0]}</p>
                    <p className="text-sm text-gray-600">{user.email}</p>
                  </div>
                </div>
              </motion.div>
            )}
            
            <p className="text-gray-600 mb-6">
              You'll lose access to your dashboard, orders, and saved preferences until you sign in again.
            </p>
          </CardContent>

          <CardFooter className="flex flex-col space-y-3">
            <Button
              onClick={handleSignOut}
              disabled={isLoading}
              className="w-full bg-red-600 hover:bg-red-700 text-white"
            >
              {isLoading ? "Signing out..." : "Yes, Sign Me Out"}
            </Button>
            
            <Button
              onClick={handleCancel}
              variant="outline"
              className="w-full"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Cancel
            </Button>
          </CardFooter>
        </Card>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center mt-6"
        >
          <Link
            href="/"
            className="text-sm text-gray-600 hover:text-gray-800 underline"
          >
            Return to Homepage
          </Link>
        </motion.div>
      </motion.div>
    </div>
  );
}