"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/app/providers";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { 
  Bug, 
  Lightbulb, 
  Zap, 
  HelpCircle, 
  Filter, 
  Search, 
  MessageSquare,
  Calendar,
  User,
  AlertTriangle,
  CheckCircle,
  Clock,
  Archive,
  Edit,
  Trash2,
  Plus,
  MoreHorizontal
} from "lucide-react";

interface Feedback {
  id: string;
  type: 'bug' | 'feature' | 'improvement' | 'other';
  message: string;
  expectedBehavior?: string;
  actualBehavior?: string;
  rating?: number;
  page: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  adminNotes?: string;
  sprintId?: string;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
  sprint?: {
    id: string;
    name: string;
    status: string;
  };
}

interface Sprint {
  id: string;
  name: string;
  description?: string;
  status: 'planning' | 'active' | 'completed';
  startDate?: string;
  endDate?: string;
}

const statusColors = {
  open: "bg-blue-100 text-blue-800",
  in_progress: "bg-yellow-100 text-yellow-800", 
  resolved: "bg-green-100 text-green-800",
  closed: "bg-gray-100 text-gray-800"
};

const priorityColors = {
  low: "bg-gray-100 text-gray-800",
  medium: "bg-blue-100 text-blue-800",
  high: "bg-orange-100 text-orange-800",
  critical: "bg-red-100 text-red-800"
};

const typeIcons = {
  bug: Bug,
  feature: Lightbulb,
  improvement: Zap,
  other: HelpCircle
};

export default function AdminFeedbackPage() {
  const { user } = useAuth();
  const router = useRouter();
  
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFeedback, setSelectedFeedback] = useState<string[]>([]);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Edit dialog state
  const [editingFeedback, setEditingFeedback] = useState<Feedback | null>(null);
  const [editForm, setEditForm] = useState({
    status: '',
    priority: '',
    adminNotes: '',
    sprintId: ''
  });

  // Sprint dialog state
  const [createSprintOpen, setCreateSprintOpen] = useState(false);
  const [sprintForm, setSprintForm] = useState({
    name: '',
    description: '',
    status: 'planning' as Sprint['status']
  });

  useEffect(() => {
    if (!user) {
      router.push('/auth/signin');
      return;
    }
    
    // Check if user is admin (you might want to add proper admin check)
    fetchFeedback();
    fetchSprints();
  }, [user, router]);

  const fetchFeedback = async () => {
    try {
      const response = await fetch('/api/admin/feedback');
      if (response.ok) {
        const data = await response.json();
        setFeedback(data.feedback || []);
      }
    } catch (error) {
      console.error('Error fetching feedback:', error);
      toast.error('Failed to fetch feedback');
    } finally {
      setLoading(false);
    }
  };

  const fetchSprints = async () => {
    try {
      const response = await fetch('/api/admin/sprints');
      if (response.ok) {
        const data = await response.json();
        setSprints(data.sprints || []);
      }
    } catch (error) {
      console.error('Error fetching sprints:', error);
    }
  };

  const handleEditFeedback = (feedbackItem: Feedback) => {
    setEditingFeedback(feedbackItem);
    setEditForm({
      status: feedbackItem.status,
      priority: feedbackItem.priority,
      adminNotes: feedbackItem.adminNotes || '',
      sprintId: feedbackItem.sprintId || ''
    });
  };

  const handleUpdateFeedback = async () => {
    if (!editingFeedback) return;
    
    try {
      const response = await fetch(`/api/admin/feedback/${editingFeedback.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      });
      
      if (response.ok) {
        toast.success('Feedback updated successfully');
        setEditingFeedback(null);
        fetchFeedback();
      } else {
        throw new Error('Failed to update feedback');
      }
    } catch (error) {
      console.error('Error updating feedback:', error);
      toast.error('Failed to update feedback');
    }
  };

  const handleBulkAction = async (action: string, value?: string) => {
    if (selectedFeedback.length === 0) {
      toast.error('Please select feedback items first');
      return;
    }

    try {
      const updates = selectedFeedback.map(id => ({
        id,
        [action]: value
      }));

      const response = await fetch('/api/admin/feedback', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates })
      });

      if (response.ok) {
        toast.success(`Updated ${selectedFeedback.length} items`);
        setSelectedFeedback([]);
        fetchFeedback();
      } else {
        throw new Error('Failed to update feedback');
      }
    } catch (error) {
      console.error('Error with bulk action:', error);
      toast.error('Failed to perform bulk action');
    }
  };

  const handleCreateSprint = async () => {
    try {
      const response = await fetch('/api/admin/sprints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sprintForm)
      });

      if (response.ok) {
        toast.success('Sprint created successfully');
        setCreateSprintOpen(false);
        setSprintForm({ name: '', description: '', status: 'planning' });
        fetchSprints();
      } else {
        throw new Error('Failed to create sprint');
      }
    } catch (error) {
      console.error('Error creating sprint:', error);
      toast.error('Failed to create sprint');
    }
  };

  const filteredFeedback = feedback.filter(item => {
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || item.priority === priorityFilter;
    const matchesType = typeFilter === 'all' || item.type === typeFilter;
    const matchesSearch = searchQuery === '' || 
      item.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.user.email.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesStatus && matchesPriority && matchesType && matchesSearch;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Feedback Management</h1>
          <p className="text-gray-600">Manage user feedback and feature requests</p>
        </div>
        
        <div className="flex gap-3">
          <Dialog open={createSprintOpen} onOpenChange={setCreateSprintOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                New Sprint
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Sprint</DialogTitle>
                <DialogDescription>
                  Create a new sprint to organize feedback and development tasks.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Sprint Name</label>
                  <Input
                    value={sprintForm.name}
                    onChange={(e) => setSprintForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Sprint 1, Q1 2024 Features"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Description</label>
                  <Textarea
                    value={sprintForm.description}
                    onChange={(e) => setSprintForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Sprint goals and objectives..."
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Status</label>
                  <Select value={sprintForm.status} onValueChange={(value) => setSprintForm(prev => ({ ...prev, status: value as Sprint['status'] }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="planning">Planning</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateSprintOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateSprint} disabled={!sprintForm.name}>
                  Create Sprint
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters and Search */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search feedback..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-64"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="bug">Bug</SelectItem>
                <SelectItem value="feature">Feature</SelectItem>
                <SelectItem value="improvement">Improvement</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Bulk Actions */}
          {selectedFeedback.length > 0 && (
            <div className="mt-4 p-3 bg-orange-50 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm text-orange-700">
                  {selectedFeedback.length} item(s) selected
                </span>
                <div className="flex gap-2">
                  <Select onValueChange={(value) => handleBulkAction('status', value)}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Set Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Select onValueChange={(value) => handleBulkAction('priority', value)}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Set Priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="critical">Critical</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Select onValueChange={(value) => handleBulkAction('sprintId', value)}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Assign Sprint" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">No Sprint</SelectItem>
                      {sprints.map(sprint => (
                        <SelectItem key={sprint.id} value={sprint.id}>
                          {sprint.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Feedback List */}
      <div className="space-y-4">
        {filteredFeedback.map((item) => {
          const TypeIcon = typeIcons[item.type];
          
          return (
            <Card key={item.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <Checkbox
                    checked={selectedFeedback.includes(item.id)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedFeedback([...selectedFeedback, item.id]);
                      } else {
                        setSelectedFeedback(selectedFeedback.filter(id => id !== item.id));
                      }
                    }}
                  />
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <TypeIcon className="w-4 h-4 text-gray-500" />
                      <Badge className={statusColors[item.status]}>
                        {item.status.replace('_', ' ')}
                      </Badge>
                      <Badge className={priorityColors[item.priority]}>
                        {item.priority}
                      </Badge>
                      {item.sprint && (
                        <Badge variant="outline">
                          Sprint: {item.sprint.name}
                        </Badge>
                      )}
                      <span className="text-sm text-gray-500">
                        {item.type}
                      </span>
                    </div>
                    
                    <h3 className="font-medium text-gray-900 mb-2">{item.message}</h3>
                    
                    {item.expectedBehavior && (
                      <div className="mb-2 p-2 bg-red-50 rounded border-l-4 border-red-200">
                        <p className="text-sm font-medium text-red-800">Expected:</p>
                        <p className="text-sm text-red-700">{item.expectedBehavior}</p>
                      </div>
                    )}
                    
                    {item.actualBehavior && (
                      <div className="mb-2 p-2 bg-yellow-50 rounded border-l-4 border-yellow-200">
                        <p className="text-sm font-medium text-yellow-800">Actual:</p>
                        <p className="text-sm text-yellow-700">{item.actualBehavior}</p>
                      </div>
                    )}
                    
                    {item.adminNotes && (
                      <div className="mb-2 p-2 bg-blue-50 rounded border-l-4 border-blue-200">
                        <p className="text-sm font-medium text-blue-800">Admin Notes:</p>
                        <p className="text-sm text-blue-700">{item.adminNotes}</p>
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between mt-4 text-sm text-gray-500">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {item.user.name}
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(item.createdAt).toLocaleDateString()}
                        </div>
                        {item.page && (
                          <div className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                            {item.page}
                          </div>
                        )}
                        {item.rating && (
                          <div className="flex items-center gap-1">
                            <span>⭐</span>
                            {item.rating}/5
                          </div>
                        )}
                      </div>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditFeedback(item)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
        
        {filteredFeedback.length === 0 && (
          <div className="text-center py-12">
            <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No feedback found matching your filters.</p>
          </div>
        )}
      </div>

      {/* Edit Feedback Dialog */}
      <Dialog open={!!editingFeedback} onOpenChange={() => setEditingFeedback(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Feedback</DialogTitle>
            <DialogDescription>
              Update feedback status, priority, and add admin notes.
            </DialogDescription>
          </DialogHeader>
          
          {editingFeedback && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Status</label>
                  <Select value={editForm.status} onValueChange={(value) => setEditForm(prev => ({ ...prev, status: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="text-sm font-medium">Priority</label>
                  <Select value={editForm.priority} onValueChange={(value) => setEditForm(prev => ({ ...prev, priority: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium">Sprint Assignment</label>
                <Select value={editForm.sprintId} onValueChange={(value) => setEditForm(prev => ({ ...prev, sprintId: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select sprint" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No Sprint</SelectItem>
                    {sprints.map(sprint => (
                      <SelectItem key={sprint.id} value={sprint.id}>
                        {sprint.name} ({sprint.status})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium">Admin Notes</label>
                <Textarea
                  value={editForm.adminNotes}
                  onChange={(e) => setEditForm(prev => ({ ...prev, adminNotes: e.target.value }))}
                  placeholder="Add internal notes about this feedback..."
                  rows={3}
                />
              </div>
              
              <div className="bg-gray-50 p-3 rounded">
                <p className="text-sm font-medium text-gray-700 mb-1">Original Feedback:</p>
                <p className="text-sm text-gray-600">{editingFeedback.message}</p>
                {editingFeedback.expectedBehavior && (
                  <>
                    <p className="text-sm font-medium text-gray-700 mt-2 mb-1">Expected Behavior:</p>
                    <p className="text-sm text-gray-600">{editingFeedback.expectedBehavior}</p>
                  </>
                )}
                {editingFeedback.actualBehavior && (
                  <>
                    <p className="text-sm font-medium text-gray-700 mt-2 mb-1">Actual Behavior:</p>
                    <p className="text-sm text-gray-600">{editingFeedback.actualBehavior}</p>
                  </>
                )}
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingFeedback(null)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateFeedback}>
              Update Feedback
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}