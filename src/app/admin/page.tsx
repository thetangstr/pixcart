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
import { 
  UserPlus, 
  Users, 
  MessageSquare, 
  Shield, 
  Search, 
  CheckCircle, 
  XCircle, 
  BarChart3,
  DollarSign,
  Clock,
  TrendingUp,
  Activity,
  UserCheck,
  UserX,
  Settings,
  Zap,
  Edit3,
  Save,
  X
} from "lucide-react";
import { toast } from "sonner";

interface User {
  id: string;
  email: string;
  name: string | null;
  isBetaTester: boolean;
  isAdmin: boolean;
  isAllowlisted: boolean;
  isWaitlisted: boolean;
  approvedAt: string | null;
  joinedWaitlistAt: string;
  createdAt: string;
  dailyImageLimit?: number;
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

interface UsageAnalytics {
  totalCost: number;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  successRate: number;
  uniqueUsers: number;
  userStats: Array<{
    email: string;
    userId: string;
    count: number;
    cost: number;
    success: number;
    failed: number;
  }>;
  operationStats: Record<string, {
    count: number;
    cost: number;
    success: number;
    failed: number;
  }>;
  dailyUsage: Array<{
    date: string;
    requests: number;
    cost: number;
    successful: number;
    failed: number;
  }>;
}

interface PlatformStats {
  totalUsers: number;
  allowlistedUsers: number;
  waitlistedUsers: number;
  totalOrders: number;
  recentSignups: number;
  allowlistRate: number;
}

export default function AdminPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [usageAnalytics, setUsageAnalytics] = useState<UsageAnalytics | null>(null);
  const [platformStats, setPlatformStats] = useState<PlatformStats | null>(null);
  const [searchEmail, setSearchEmail] = useState("");
  const [newBetaEmail, setNewBetaEmail] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingFeedback, setLoadingFeedback] = useState(true);
  const [loadingAnalytics, setLoadingAnalytics] = useState(true);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editingLimit, setEditingLimit] = useState<number>(10);

  useEffect(() => {
    checkAdminStatus();
  }, [user, loading]);

  const checkAdminStatus = async () => {
    if (!loading && user) {
      try {
        const response = await fetch('/api/user/beta-status');
        const data = await response.json();
        
        // Also check email directly for admin access
        const isAdminUser = data.isAdmin || user.email === 'thetangstr@gmail.com';
        
        if (isAdminUser) {
          setIsAdmin(true);
          fetchUsers();
          fetchFeedback();
          fetchUsageAnalytics();
        } else {
          // Redirect to dashboard instead of home to avoid redirect loop
          router.push('/dashboard');
        }
      } catch (error) {
        console.error('Error checking admin status:', error);
        router.push('/dashboard');
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

  const fetchUsageAnalytics = async () => {
    try {
      const response = await fetch('/api/admin/usage');
      const data = await response.json();
      setUsageAnalytics(data.analytics);
      setPlatformStats(data.platformStats);
    } catch (error) {
      console.error('Error fetching usage analytics:', error);
      toast.error('Failed to load usage analytics');
    } finally {
      setLoadingAnalytics(false);
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

  const toggleAllowlistStatus = async (userId: string, action: 'approve' | 'reject') => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/allowlist`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
      
      if (response.ok) {
        toast.success(`User ${action === 'approve' ? 'approved' : 'rejected'} successfully`);
        fetchUsers();
      }
    } catch (error) {
      toast.error(`Failed to ${action} user`);
    }
  };

  const handleBulkAction = async (action: 'approve_bulk' | 'reject_bulk') => {
    if (selectedUsers.size === 0) {
      toast.error('Please select users first');
      return;
    }

    try {
      const response = await fetch('/api/admin/usage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          userIds: Array.from(selectedUsers)
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        toast.success(data.message);
        setSelectedUsers(new Set());
        fetchUsers();
      } else {
        toast.error(data.error);
      }
    } catch (error) {
      toast.error('Failed to perform bulk action');
    }
  };

  const updateUserLimit = async (userId: string, newLimit: number) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/limit`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dailyLimit: newLimit })
      });
      
      if (response.ok) {
        toast.success('Daily limit updated successfully');
        setEditingUserId(null);
        fetchUsers();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to update limit');
      }
    } catch (error) {
      toast.error('Failed to update user limit');
    }
  };

  const startEditing = (userId: string, currentLimit: number) => {
    setEditingUserId(userId);
    setEditingLimit(currentLimit);
  };

  const cancelEditing = () => {
    setEditingUserId(null);
    setEditingLimit(10);
  };

  const toggleUserSelection = (userId: string) => {
    const newSelection = new Set(selectedUsers);
    if (newSelection.has(userId)) {
      newSelection.delete(userId);
    } else {
      newSelection.add(userId);
    }
    setSelectedUsers(newSelection);
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

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">
              <BarChart3 className="w-4 h-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="allowlist">
              <UserCheck className="w-4 h-4 mr-2" />
              Allowlist
            </TabsTrigger>
            <TabsTrigger value="users">
              <Users className="w-4 h-4 mr-2" />
              Users
            </TabsTrigger>
            <TabsTrigger value="limits">
              <Settings className="w-4 h-4 mr-2" />
              Rate Limits
            </TabsTrigger>
            <TabsTrigger value="usage">
              <Activity className="w-4 h-4 mr-2" />
              Usage Analytics
            </TabsTrigger>
            <TabsTrigger value="feedback">
              <MessageSquare className="w-4 h-4 mr-2" />
              Feedback
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Users</p>
                      <p className="text-2xl font-bold">{platformStats?.totalUsers || 0}</p>
                    </div>
                    <Users className="w-8 h-8 text-amber-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Allowlisted</p>
                      <p className="text-2xl font-bold text-green-600">{platformStats?.allowlistedUsers || 0}</p>
                    </div>
                    <UserCheck className="w-8 h-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Waitlisted</p>
                      <p className="text-2xl font-bold text-amber-600">{platformStats?.waitlistedUsers || 0}</p>
                    </div>
                    <Clock className="w-8 h-8 text-amber-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Cost</p>
                      <p className="text-2xl font-bold text-red-600">
                        ${usageAnalytics?.totalCost?.toFixed(2) || '0.00'}
                      </p>
                    </div>
                    <DollarSign className="w-8 h-8 text-red-600" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>API Usage Overview</CardTitle>
                  <CardDescription>Last 30 days</CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingAnalytics ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600 mx-auto" />
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex justify-between">
                        <span>Total Requests:</span>
                        <span className="font-bold">{usageAnalytics?.totalRequests || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Success Rate:</span>
                        <span className="font-bold text-green-600">
                          {usageAnalytics?.successRate?.toFixed(1) || 0}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Active Users:</span>
                        <span className="font-bold">{usageAnalytics?.uniqueUsers || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Total Cost:</span>
                        <span className="font-bold">${usageAnalytics?.totalCost?.toFixed(4) || '0.0000'}</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Platform Growth</CardTitle>
                  <CardDescription>User acquisition metrics</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span>Recent Signups (7d):</span>
                      <span className="font-bold">{platformStats?.recentSignups || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Allowlist Rate:</span>
                      <span className="font-bold">
                        {platformStats?.allowlistRate?.toFixed(1) || 0}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Orders:</span>
                      <span className="font-bold">{platformStats?.totalOrders || 0}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Allowlist Management Tab */}
          <TabsContent value="allowlist" className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-semibold">Allowlist Management</h2>
                <p className="text-gray-600">Approve or reject users waiting for access</p>
              </div>
              {selectedUsers.size > 0 && (
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleBulkAction('approve_bulk')}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <UserCheck className="w-4 h-4 mr-2" />
                    Approve Selected ({selectedUsers.size})
                  </Button>
                  <Button
                    onClick={() => handleBulkAction('reject_bulk')}
                    variant="outline"
                    className="border-red-200 text-red-600 hover:bg-red-50"
                  >
                    <UserX className="w-4 h-4 mr-2" />
                    Reject Selected ({selectedUsers.size})
                  </Button>
                </div>
              )}
            </div>

            <Card>
              <CardContent className="pt-6">
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
                    {filteredUsers
                      .filter(user => !user.isAdmin) // Don't show admin users
                      .map((user) => (
                        <div key={user.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center space-x-3">
                            <input
                              type="checkbox"
                              checked={selectedUsers.has(user.id)}
                              onChange={() => toggleUserSelection(user.id)}
                              className="rounded border-gray-300"
                            />
                            <div>
                              <div className="font-medium">{user.email}</div>
                              {user.name && <div className="text-sm text-gray-500">{user.name}</div>}
                              <div className="flex gap-2 mt-1">
                                {user.isAllowlisted && (
                                  <Badge className="bg-green-100 text-green-800">
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    Allowlisted
                                  </Badge>
                                )}
                                {user.isWaitlisted && (
                                  <Badge className="bg-amber-100 text-amber-800">
                                    <Clock className="w-3 h-3 mr-1" />
                                    Waitlisted
                                  </Badge>
                                )}
                                <Badge variant="outline" className="text-xs">
                                  Joined: {new Date(user.joinedWaitlistAt).toLocaleDateString()}
                                </Badge>
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            {!user.isAllowlisted && (
                              <Button
                                size="sm"
                                onClick={() => toggleAllowlistStatus(user.id, 'approve')}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                <UserCheck className="w-4 h-4 mr-1" />
                                Approve
                              </Button>
                            )}
                            {user.isAllowlisted && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => toggleAllowlistStatus(user.id, 'reject')}
                                className="border-red-200 text-red-600 hover:bg-red-50"
                              >
                                <UserX className="w-4 h-4 mr-1" />
                                Revoke
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="limits" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>User Rate Limits</CardTitle>
                <CardDescription>Manage daily generation limits for users</CardDescription>
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
                  <div className="space-y-3">
                    {filteredUsers
                      .filter(user => !user.isAdmin && user.isAllowlisted) // Only show allowlisted non-admin users
                      .map((user) => (
                        <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg bg-white hover:bg-gray-50">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3">
                              <div>
                                <div className="font-medium text-gray-900">{user.email}</div>
                                {user.name && <div className="text-sm text-gray-500">{user.name}</div>}
                                <div className="flex gap-2 mt-1">
                                  <Badge className="bg-green-100 text-green-800">
                                    <Zap className="w-3 h-3 mr-1" />
                                    Allowlisted
                                  </Badge>
                                  <Badge variant="outline" className="text-xs">
                                    Joined: {new Date(user.createdAt).toLocaleDateString()}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-3">
                            {editingUserId === user.id ? (
                              <div className="flex items-center space-x-2">
                                <Input
                                  type="number"
                                  min="0"
                                  max="1000"
                                  value={editingLimit}
                                  onChange={(e) => setEditingLimit(parseInt(e.target.value) || 0)}
                                  className="w-20 text-center"
                                  placeholder="Limit"
                                />
                                <Button
                                  size="sm"
                                  onClick={() => updateUserLimit(user.id, editingLimit)}
                                  className="bg-green-600 hover:bg-green-700"
                                >
                                  <Save className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={cancelEditing}
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            ) : (
                              <div className="flex items-center space-x-2">
                                <div className="text-sm text-gray-600">
                                  Daily Limit: <span className="font-semibold">{user.dailyImageLimit || 10}</span>
                                </div>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => startEditing(user.id, user.dailyImageLimit || 10)}
                                  className="flex items-center"
                                >
                                  <Edit3 className="w-4 h-4 mr-1" />
                                  Edit
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                      
                    {filteredUsers.filter(user => !user.isAdmin && user.isAllowlisted).length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        {searchEmail ? 'No users found matching your search.' : 'No allowlisted users found.'}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

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
                        <div className="flex-1">
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
                            {user.isAllowlisted && (
                              <Badge className="bg-blue-100 text-blue-800">
                                <Zap className="w-3 h-3 mr-1" />
                                Daily Limit: {user.dailyImageLimit || 10}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {user.isAllowlisted && !user.isAdmin && (
                            editingUserId === user.id ? (
                              <div className="flex items-center space-x-1">
                                <Input
                                  type="number"
                                  min="0"
                                  max="1000"
                                  value={editingLimit}
                                  onChange={(e) => setEditingLimit(parseInt(e.target.value) || 0)}
                                  className="w-16 text-center text-xs"
                                  placeholder="Limit"
                                />
                                <Button
                                  size="sm"
                                  onClick={() => updateUserLimit(user.id, editingLimit)}
                                  className="bg-green-600 hover:bg-green-700 px-2 py-1 text-xs"
                                >
                                  <Save className="w-3 h-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={cancelEditing}
                                  className="px-2 py-1 text-xs"
                                >
                                  <X className="w-3 h-3" />
                                </Button>
                              </div>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => startEditing(user.id, user.dailyImageLimit || 10)}
                                className="text-xs"
                              >
                                <Settings className="w-3 h-3 mr-1" />
                                Set Limit
                              </Button>
                            )
                          )}
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
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Usage Analytics Tab */}
          <TabsContent value="usage" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>API Usage Analytics</CardTitle>
                <CardDescription>Monitor system usage and costs</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingAnalytics ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600 mx-auto" />
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Usage Summary */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-blue-600">Total Requests</p>
                            <p className="text-2xl font-bold text-blue-800">
                              {usageAnalytics?.totalRequests || 0}
                            </p>
                          </div>
                          <Activity className="w-8 h-8 text-blue-600" />
                        </div>
                      </div>
                      
                      <div className="bg-green-50 p-4 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-green-600">Success Rate</p>
                            <p className="text-2xl font-bold text-green-800">
                              {usageAnalytics?.successRate?.toFixed(1) || 0}%
                            </p>
                          </div>
                          <TrendingUp className="w-8 h-8 text-green-600" />
                        </div>
                      </div>
                      
                      <div className="bg-red-50 p-4 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-red-600">Total Cost</p>
                            <p className="text-2xl font-bold text-red-800">
                              ${usageAnalytics?.totalCost?.toFixed(4) || '0.0000'}
                            </p>
                          </div>
                          <DollarSign className="w-8 h-8 text-red-600" />
                        </div>
                      </div>
                    </div>

                    {/* Top Users by Usage */}
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Top Users by API Usage</h3>
                      <div className="space-y-2">
                        {usageAnalytics?.userStats?.slice(0, 10).map((userStat, index) => (
                          <div key={userStat.email} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center space-x-3">
                              <div className="w-6 h-6 bg-amber-100 rounded-full flex items-center justify-center text-sm font-bold text-amber-800">
                                {index + 1}
                              </div>
                              <div>
                                <div className="font-medium">{userStat.email}</div>
                                <div className="text-sm text-gray-500">
                                  Success: {userStat.success} | Failed: {userStat.failed}
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-bold">{userStat.count} requests</div>
                              <div className="text-sm text-gray-600">
                                ${userStat.cost.toFixed(4)}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Operations Breakdown */}
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Operations Breakdown</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {Object.entries(usageAnalytics?.operationStats || {}).map(([operation, stats]) => (
                          <div key={operation} className="border rounded-lg p-4">
                            <div className="flex justify-between items-center mb-2">
                              <h4 className="font-medium capitalize">{operation.replace('_', ' ')}</h4>
                              <Badge variant="outline">{stats.count} calls</Badge>
                            </div>
                            <div className="space-y-1 text-sm text-gray-600">
                              <div className="flex justify-between">
                                <span>Success Rate:</span>
                                <span className="text-green-600">
                                  {stats.count > 0 ? ((stats.success / stats.count) * 100).toFixed(1) : 0}%
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span>Total Cost:</span>
                                <span>${stats.cost.toFixed(4)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Failed:</span>
                                <span className="text-red-600">{stats.failed}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Daily Usage Chart */}
                    {usageAnalytics?.dailyUsage && usageAnalytics.dailyUsage.length > 0 && (
                      <div>
                        <h3 className="text-lg font-semibold mb-4">Daily Usage Trend (Last 30 Days)</h3>
                        <div className="border rounded-lg p-4">
                          <div className="text-sm text-gray-500 mb-2">
                            Note: This is a simplified view. Integrate with a charting library for better visualization.
                          </div>
                          <div className="space-y-2">
                            {usageAnalytics.dailyUsage.slice(-7).map((day) => (
                              <div key={day.date} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                <span className="font-medium">{day.date}</span>
                                <div className="flex space-x-4 text-sm">
                                  <span className="text-blue-600">{day.requests} requests</span>
                                  <span className="text-green-600">{day.successful} success</span>
                                  <span className="text-red-600">{day.failed} failed</span>
                                  <span className="font-semibold">${day.cost.toFixed(4)}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
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