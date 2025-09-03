"use client";

import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from "framer-motion";
import { AlertTriangle, Home, RefreshCw } from "lucide-react";
import Link from "next/link";

const errorMessages: Record<string, { title: string; description: string }> = {
  Configuration: {
    title: "Server Configuration Error",
    description: "There's a problem with the server configuration. Please contact support."
  },
  AccessDenied: {
    title: "Access Denied",
    description: "You don't have permission to access this resource."
  },
  Verification: {
    title: "Verification Error",
    description: "The verification link is invalid or has expired."
  },
  Default: {
    title: "Authentication Error",
    description: "An unexpected error occurred during authentication. Please try again."
  },
  CredentialsSignin: {
    title: "Invalid Credentials",
    description: "The email or password you entered is incorrect."
  },
  OAuthSignin: {
    title: "OAuth Sign-in Error",
    description: "There was an error signing in with your OAuth provider."
  },
  OAuthCallback: {
    title: "OAuth Callback Error",
    description: "There was an error processing the OAuth callback."
  },
  OAuthCreateAccount: {
    title: "OAuth Account Creation Error",
    description: "Could not create an account with your OAuth provider."
  },
  EmailCreateAccount: {
    title: "Email Account Creation Error",
    description: "Could not create an account with your email."
  },
  Callback: {
    title: "Callback Error",
    description: "There was an error in the authentication callback."
  },
  OAuthAccountNotLinked: {
    title: "Account Not Linked",
    description: "This OAuth account is not linked to any existing account. Please sign in with your email and link your account in settings."
  },
  EmailSignin: {
    title: "Email Sign-in Error",
    description: "Unable to send email. Please try again later."
  },
  SessionRequired: {
    title: "Session Required",
    description: "You must be signed in to access this page."
  }
};

export default function AuthErrorPage() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error") || "Default";
  
  const errorInfo = errorMessages[error] || errorMessages.Default;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 via-white to-orange-50 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md"
      >
        <Card className="shadow-2xl border-0 bg-white/80 backdrop-blur">
          <CardHeader className="text-center space-y-4">
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="mx-auto w-16 h-16 bg-gradient-to-r from-red-500 to-orange-500 rounded-full flex items-center justify-center"
            >
              <AlertTriangle className="w-8 h-8 text-white" />
            </motion.div>
            <div>
              <CardTitle className="text-2xl font-bold text-red-600">
                {errorInfo.title}
              </CardTitle>
              <CardDescription className="text-gray-600 mt-2">
                {errorInfo.description}
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="p-4 bg-red-50 border border-red-200 rounded-lg"
            >
              <p className="text-sm text-red-700">
                <strong>Error Code:</strong> {error}
              </p>
            </motion.div>

            <div className="space-y-2 text-sm text-gray-600">
              <p><strong>What you can try:</strong></p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Clear your browser cache and cookies</li>
                <li>Disable browser extensions temporarily</li>
                <li>Try using an incognito/private window</li>
                <li>Check your internet connection</li>
                {error === "OAuthAccountNotLinked" && (
                  <li>Sign in with email first, then link your OAuth account</li>
                )}
              </ul>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col space-y-3">
            <Link href="/auth/signin" className="w-full">
              <Button className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
            </Link>
            
            <Link href="/" className="w-full">
              <Button variant="outline" className="w-full">
                <Home className="w-4 h-4 mr-2" />
                Go Home
              </Button>
            </Link>
          </CardFooter>
        </Card>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-center mt-6 space-y-2"
        >
          <p className="text-sm text-gray-600">
            Still having trouble? Contact our support team.
          </p>
          <Link
            href="/support"
            className="text-sm text-purple-600 hover:text-purple-700 underline"
          >
            Get Help
          </Link>
        </motion.div>
      </motion.div>
    </div>
  );
}