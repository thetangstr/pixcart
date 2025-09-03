"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/app/providers";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, MessageSquare, Clock, CheckCircle, AlertCircle, Search, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import TicketForm from "@/components/ticket-form";
import { format } from "@/lib/date-utils";
import Link from "next/link";
import { toast } from "sonner";

interface SupportTicket {
  id: string;
  subject: string;
  status: string;
  priority: string;
  category?: string;
  createdAt: string;
  updatedAt: string;
  lastReply?: {
    id: string;
    message: string;
    isStaff: boolean;
    createdAt: string;
  } | null;
}

interface PaginationData {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
}

const statusConfig = {
  OPEN: { color: "bg-blue-100 text-blue-800", icon: AlertCircle, label: "Open" },
  IN_PROGRESS: { color: "bg-yellow-100 text-yellow-800", icon: Clock, label: "In Progress" },
  RESOLVED: { color: "bg-green-100 text-green-800", icon: CheckCircle, label: "Resolved" },
  CLOSED: { color: "bg-gray-100 text-gray-800", icon: CheckCircle, label: "Closed" },
};

const priorityConfig = {
  LOW: { color: "bg-gray-100 text-gray-800", label: "Low" },
  MEDIUM: { color: "bg-blue-100 text-blue-800", label: "Medium" },
  HIGH: { color: "bg-orange-100 text-orange-800", label: "High" },
  URGENT: { color: "bg-red-100 text-red-800", label: "Urgent" },
};

export default function SupportPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("tickets");
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [filteredTickets, setFilteredTickets] = useState<SupportTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [pagination, setPagination] = useState<PaginationData>({
    page: 1,
    limit: 10,
    totalCount: 0,
    totalPages: 1
  });

  // Redirect to sign in if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth/signin?callbackUrl=/support");
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (user && activeTab === "tickets") {
      fetchTickets();
    }
  }, [user, activeTab]);

  useEffect(() => {
    filterTickets();
  }, [tickets, searchTerm, statusFilter]);

  const fetchTickets = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/support?page=${pagination.page}&limit=${pagination.limit}`);
      
      if (response.ok) {
        const data = await response.json();
        setTickets(data.tickets || []);
        setPagination(data.pagination);
      } else {
        toast.error("Failed to fetch support tickets");
      }
    } catch (error) {
      console.error("Error fetching tickets:", error);
      toast.error("Failed to load support tickets");
    } finally {
      setIsLoading(false);
    }
  };

  const filterTickets = () => {
    let filtered = [...tickets];

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(ticket =>
        ticket.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ticket.id.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by status
    if (statusFilter !== "all") {
      filtered = filtered.filter(ticket => ticket.status === statusFilter);
    }

    // Sort by creation date (newest first)
    filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    setFilteredTickets(filtered);
  };

  const handleCreateTicket = async (ticketData: any) => {
    try {
      setIsCreating(true);
      const response = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(ticketData)
      });

      if (response.ok) {
        toast.success("Support ticket created successfully!");
        setActiveTab("tickets");
        await fetchTickets();
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || "Failed to create support ticket");
        throw new Error("Failed to create ticket");
      }
    } catch (error) {
      console.error("Error creating ticket:", error);
      throw error;
    } finally {
      setIsCreating(false);
    }
  };

  if (loading || (isLoading && activeTab === "tickets")) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600" />
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-gray-900">Support Center</h1>
          <p className="text-gray-600 mt-1">
            Get help with your orders, technical issues, or general questions
          </p>
        </motion.div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="tickets" className="flex items-center">
              <MessageSquare className="w-4 h-4 mr-2" />
              My Tickets
            </TabsTrigger>
            <TabsTrigger value="create" className="flex items-center">
              <Plus className="w-4 h-4 mr-2" />
              Create Ticket
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tickets" className="space-y-6">
            {/* Search and Filter */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center text-lg">
                    <Filter className="w-5 h-5 mr-2" />
                    Filter Tickets
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                          placeholder="Search tickets by subject or ID..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>

                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-full sm:w-48">
                        <SelectValue placeholder="Filter by status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Tickets</SelectItem>
                        <SelectItem value="OPEN">Open</SelectItem>
                        <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                        <SelectItem value="RESOLVED">Resolved</SelectItem>
                        <SelectItem value="CLOSED">Closed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {(searchTerm || statusFilter !== "all") && (
                    <div className="mt-4 flex items-center justify-between">
                      <p className="text-sm text-gray-600">
                        Showing {filteredTickets.length} of {tickets.length} tickets
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSearchTerm("");
                          setStatusFilter("all");
                        }}
                      >
                        Clear Filters
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Tickets List */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              {filteredTickets.length > 0 ? (
                <div className="grid gap-4">
                  {filteredTickets.map((ticket, index) => (
                    <motion.div
                      key={ticket.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 + index * 0.1 }}
                    >
                      <Card className="hover:shadow-md transition-shadow duration-200">
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3 mb-2">
                                <h3 className="font-semibold text-lg">{ticket.subject}</h3>
                                <Badge className={statusConfig[ticket.status as keyof typeof statusConfig]?.color || "bg-gray-100 text-gray-800"}>
                                  {statusConfig[ticket.status as keyof typeof statusConfig]?.label || ticket.status}
                                </Badge>
                                <Badge variant="outline" className={priorityConfig[ticket.priority as keyof typeof priorityConfig]?.color || "bg-gray-100 text-gray-800"}>
                                  {priorityConfig[ticket.priority as keyof typeof priorityConfig]?.label || ticket.priority}
                                </Badge>
                              </div>
                              
                              <p className="text-sm text-gray-600 mb-3">
                                Ticket #{ticket.id.slice(-8)} • {ticket.category || "General"}
                              </p>
                              
                              <div className="flex items-center space-x-4 text-sm text-gray-500">
                                <span>Created {format(new Date(ticket.createdAt), "MMM d, yyyy")}</span>
                                {ticket.lastReply && (
                                  <span>
                                    Last reply {format(new Date(ticket.lastReply.createdAt), "MMM d, yyyy")}
                                    {ticket.lastReply.isStaff && " by Staff"}
                                  </span>
                                )}
                              </div>
                            </div>
                            
                            <Link href={`/support/${ticket.id}`}>
                              <Button variant="outline" size="sm">
                                View Details
                              </Button>
                            </Link>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              ) : tickets.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-12">
                    <MessageSquare className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-600 mb-2">No support tickets yet</h3>
                    <p className="text-gray-500 mb-6 max-w-md mx-auto">
                      You haven't created any support tickets. If you need help with an order or have questions, create a ticket and we'll assist you.
                    </p>
                    <Button 
                      onClick={() => setActiveTab("create")}
                      className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Create Support Ticket
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="text-center py-12">
                    <Search className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-600 mb-2">No matching tickets</h3>
                    <p className="text-gray-500 mb-6">
                      Try adjusting your search term or filters to find what you're looking for.
                    </p>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSearchTerm("");
                        setStatusFilter("all");
                      }}
                    >
                      Clear Filters
                    </Button>
                  </CardContent>
                </Card>
              )}
            </motion.div>
          </TabsContent>

          <TabsContent value="create">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <TicketForm onSubmit={handleCreateTicket} isLoading={isCreating} />
            </motion.div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}