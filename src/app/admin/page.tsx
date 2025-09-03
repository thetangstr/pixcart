"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/app/providers";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserPlus, Users, MessageSquare, Shield, Search, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";

interface User {
  id: string;
  email: string;
  name: string | null;
  isBetaTester: boolean;
  isAdmin: boolean;
  createdAt: string;
}

interface Feedback {
  id: string;
  userId: string;
  user: { email: string; name: string | null };
  page: string;
  type: string;
  message: string;
  rating: number | null;
  status: string;
  createdAt: string;
}

export default function AdminPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [searchEmail, setSearchEmail] = useState("");
  const [newBetaEmail, setNewBetaEmail] = useState("");
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingFeedback, setLoadingFeedback] = useState(true);

  useEffect(() => {
    checkAdminStatus();
  }, [user, loading]);

  const checkAdminStatus = async () => {
    if (!loading && user) {
      try {
        const response = await fetch('/api/user/beta-status');
        const data = await response.json();
        if (data.isAdmin) {
          setIsAdmin(true);
          fetchUsers();
          fetchFeedback();
        } else {
          router.push('/');
        }
      } catch (error) {
        console.error('Error checking admin status:', error);
        router.push('/');
      }
    } else if (!loading && !user) {
      router.push('/auth/signin?callbackUrl=/admin');
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/admin/users');
      const data = await response.json();
      setUsers(data.users || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchFeedback = async () => {
    try {
      const response = await fetch('/api/admin/feedback');
      const data = await response.json();
      setFeedback(data.feedback || []);
    } catch (error) {
      console.error('Error fetching feedback:', error);
      toast.error('Failed to load feedback');
    } finally {
      setLoadingFeedback(false);
    }
  };

  const toggleBetaTester = async (userId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/beta`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isBetaTester: !currentStatus })
      });
      
      if (response.ok) {
        toast.success(`Beta tester status ${!currentStatus ? 'granted' : 'revoked'}`);
        fetchUsers();
      }
    } catch (error) {
      toast.error('Failed to update user');
    }
  };

  const addBetaTester = async () => {
    if (!newBetaEmail) return;
    
    try {
      const response = await fetch('/api/admin/users/add-beta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newBetaEmail })
      });
      
      if (response.ok) {
        toast.success('Beta tester added successfully');
        setNewBetaEmail('');
        fetchUsers();
      }
    } catch (error) {
      toast.error('Failed to add beta tester');
    }
  };

  const updateFeedbackStatus = async (feedbackId: string, status: string) => {
    try {
      const response = await fetch(`/api/admin/feedback/${feedbackId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      
      if (response.ok) {
        toast.success('Feedback status updated');
        fetchFeedback();
      }
    } catch (error) {
      toast.error('Failed to update feedback');
    }
  };

  if (loading || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600" />
      </div>
    );
  }

  const filteredUsers = users.filter(u => 
    u.email.toLowerCase().includes(searchEmail.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 py-8">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-gray-900 font-playfair">Admin Dashboard</h1>
          <p className="text-gray-600">Manage beta testers and feedback</p>
        </motion.div>

        <Tabs defaultValue="users" className="space-y-6">
          <TabsList>
            <TabsTrigger value="users">
              <Users className="w-4 h-4 mr-2" />
              Users
            </TabsTrigger>
            <TabsTrigger value="feedback">
              <MessageSquare className="w-4 h-4 mr-2" />
              Feedback
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-6">
            {/* Add Beta Tester */}
            <Card>
              <CardHeader>
                <CardTitle>Add Beta Tester</CardTitle>
                <CardDescription>Grant beta access to a user by email</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Input
                    type="email"
                    placeholder="Enter email address"
                    value={newBetaEmail}
                    onChange={(e) => setNewBetaEmail(e.target.value)}
                    className="flex-1"
                  />
                  <Button onClick={addBetaTester} className="bg-amber-600 hover:bg-amber-700">
                    <UserPlus className="w-4 h-4 mr-2" />
                    Add Beta Tester
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Users List */}
            <Card>
              <CardHeader>
                <CardTitle>All Users</CardTitle>
                <CardDescription>Manage user roles and beta access</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Search by email..."
                      value={searchEmail}
                      onChange={(e) => setSearchEmail(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                {loadingUsers ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600 mx-auto" />
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredUsers.map((user) => (
                      <div key={user.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <div className="font-medium">{user.email}</div>
                          {user.name && <div className="text-sm text-gray-500">{user.name}</div>}
                          <div className="flex gap-2 mt-1">
                            {user.isAdmin && (
                              <Badge className="bg-red-100 text-red-800">
                                <Shield className="w-3 h-3 mr-1" />
                                Admin
                              </Badge>
                            )}
                            {user.isBetaTester && (
                              <Badge className="bg-green-100 text-green-800">
                                Beta Tester
                              </Badge>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleBetaTester(user.id, user.isBetaTester)}
                          disabled={user.isAdmin}
                        >
                          {user.isBetaTester ? (
                            <>
                              <XCircle className="w-4 h-4 mr-1" />
                              Revoke Beta
                            </>
                          ) : (
                            <>
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Grant Beta
                            </>
                          )}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="feedback" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Beta Feedback</CardTitle>
                <CardDescription>Review and manage user feedback</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingFeedback ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600 mx-auto" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    {feedback.map((item) => (
                      <div key={item.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <div className="font-medium">{item.user.email}</div>
                            <div className="text-sm text-gray-500">
                              {new Date(item.createdAt).toLocaleDateString()} • {item.page}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={item.type === 'bug' ? 'destructive' : 'default'}>
                              {item.type}
                            </Badge>
                            <select
                              value={item.status}
                              onChange={(e) => updateFeedbackStatus(item.id, e.target.value)}
                              className="text-sm border rounded px-2 py-1"
                            >
                              <option value="NEW">New</option>
                              <option value="REVIEWED">Reviewed</option>
                              <option value="IN_PROGRESS">In Progress</option>
                              <option value="RESOLVED">Resolved</option>
                              <option value="ARCHIVED">Archived</option>
                            </select>
                          </div>
                        </div>
                        <p className="text-gray-700">{item.message}</p>
                        {item.rating && (
                          <div className="mt-2">
                            Rating: {"⭐".repeat(item.rating)}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}