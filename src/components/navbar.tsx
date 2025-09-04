"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Palette, User, Package, HelpCircle, LogOut, Settings, Shield } from "lucide-react";
import { useAuth } from "@/app/providers";
import { createClient } from "@/lib/supabase/client";

export function Navbar() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const supabase = createClient();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (user) {
        try {
          // Check email first for immediate admin access
          if (user.email === 'thetangstr@gmail.com') {
            setIsAdmin(true);
            return;
          }
          
          const response = await fetch('/api/user/beta-status');
          if (response.ok) {
            const data = await response.json();
            setIsAdmin(data.isAdmin || user.email === 'thetangstr@gmail.com');
          }
        } catch (error) {
          console.error('Error checking admin status:', error);
          // Still check email even if API fails
          if (user.email === 'thetangstr@gmail.com') {
            setIsAdmin(true);
          }
        }
      }
    };
    checkAdminStatus();
  }, [user]);

  const handleSignIn = () => {
    router.push("/auth/signin");
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  return (
    <nav className="border-b bg-white/50 backdrop-blur-md sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold text-xl">
          <Palette className="h-6 w-6 text-purple-600" />
          <span>PixCart</span>
        </Link>

        <div className="flex items-center gap-4">
          {loading ? (
            <div className="h-8 w-8 animate-pulse bg-gray-200 rounded-full" />
          ) : user ? (
            <>
              <Link href="/create">
                <Button variant="default" className="bg-purple-600 hover:bg-purple-700">
                  Create Portrait
                </Button>
              </Link>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={user.user_metadata?.avatar_url || ""} alt={user.email || ""} />
                      <AvatarFallback>{user.email?.[0]?.toUpperCase() || "U"}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  {isAdmin && (
                    <>
                      <DropdownMenuItem asChild>
                        <Link href="/admin" className="flex items-center gap-2 text-purple-600 font-medium">
                          <Shield className="h-4 w-4" />
                          <span>Admin Console</span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </>
                  )}
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard" className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      <span>Dashboard</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/orders" className="flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      <span>My Orders</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/profile" className="flex items-center gap-2">
                      <Settings className="h-4 w-4" />
                      <span>Profile Settings</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/support" className="flex items-center gap-2">
                      <HelpCircle className="h-4 w-4" />
                      <span>Support</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={handleSignOut}
                    className="flex items-center gap-2 text-red-600 cursor-pointer"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Sign Out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <Button 
              onClick={handleSignIn}
              className="bg-purple-600 hover:bg-purple-700"
            >
              Sign In
            </Button>
          )}
        </div>
      </div>
    </nav>
  );
}