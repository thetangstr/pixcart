"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Send, MessageSquare, Tag, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

const ticketSchema = z.object({
  subject: z.string().min(5, "Subject must be at least 5 characters"),
  message: z.string().min(10, "Message must be at least 10 characters"),
  category: z.string().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
});

type TicketFormData = z.infer<typeof ticketSchema>;

interface TicketFormProps {
  onSubmit: (data: TicketFormData) => Promise<void>;
  isLoading?: boolean;
}

const categories = [
  { id: "order_issue", name: "Order Issue", description: "Problems with existing orders" },
  { id: "payment", name: "Payment", description: "Billing and payment questions" },
  { id: "shipping", name: "Shipping", description: "Delivery and shipping concerns" },
  { id: "quality", name: "Quality", description: "Art quality or revision requests" },
  { id: "technical", name: "Technical", description: "Website or technical issues" },
  { id: "general", name: "General", description: "General questions and feedback" },
];

const priorities = [
  { 
    value: "LOW", 
    label: "Low", 
    color: "text-green-600", 
    bg: "bg-green-50", 
    description: "General questions, non-urgent issues" 
  },
  { 
    value: "MEDIUM", 
    label: "Medium", 
    color: "text-yellow-600", 
    bg: "bg-yellow-50", 
    description: "Standard support requests" 
  },
  { 
    value: "HIGH", 
    label: "High", 
    color: "text-orange-600", 
    bg: "bg-orange-50", 
    description: "Order problems, payment issues" 
  },
  { 
    value: "URGENT", 
    label: "Urgent", 
    color: "text-red-600", 
    bg: "bg-red-50", 
    description: "Critical issues requiring immediate attention" 
  },
];

export default function TicketForm({ onSubmit, isLoading = false }: TicketFormProps) {
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedPriority, setSelectedPriority] = useState("MEDIUM");

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors }
  } = useForm<TicketFormData>({
    resolver: zodResolver(ticketSchema),
    defaultValues: {
      priority: "MEDIUM"
    }
  });

  const handleFormSubmit = async (data: TicketFormData) => {
    try {
      await onSubmit(data);
      toast.success("Support ticket created successfully!");
    } catch (error) {
      toast.error("Failed to create support ticket");
    }
  };

  const selectedPriorityInfo = priorities.find(p => p.value === selectedPriority);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <MessageSquare className="w-5 h-5 mr-2" />
            Create Support Ticket
          </CardTitle>
          <CardDescription>
            Describe your issue and we'll get back to you as soon as possible
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
            {/* Subject */}
            <div className="space-y-2">
              <Label htmlFor="subject">Subject *</Label>
              <Input
                id="subject"
                {...register("subject")}
                placeholder="Brief description of your issue"
                className={errors.subject ? "border-red-500" : ""}
              />
              {errors.subject && (
                <p className="text-sm text-red-500 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.subject.message}
                </p>
              )}
            </div>

            {/* Category */}
            <div className="space-y-3">
              <Label>Category</Label>
              <div className="grid gap-3 sm:grid-cols-2">
                {categories.map((category) => (
                  <motion.div
                    key={category.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div
                      onClick={() => {
                        setSelectedCategory(category.id);
                        setValue("category", category.id);
                      }}
                      className={`
                        p-4 border rounded-lg cursor-pointer transition-all
                        ${selectedCategory === category.id 
                          ? 'border-purple-500 bg-purple-50' 
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }
                      `}
                    >
                      <div className="flex items-start space-x-3">
                        <Tag className="w-5 h-5 text-purple-600 mt-0.5" />
                        <div>
                          <p className="font-medium text-sm">{category.name}</p>
                          <p className="text-xs text-gray-600 mt-1">{category.description}</p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Priority */}
            <div className="space-y-3">
              <Label>Priority</Label>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {priorities.map((priority) => (
                  <motion.div
                    key={priority.value}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div
                      onClick={() => {
                        setSelectedPriority(priority.value);
                        setValue("priority", priority.value as any);
                      }}
                      className={`
                        p-3 border rounded-lg cursor-pointer transition-all text-center
                        ${selectedPriority === priority.value 
                          ? `border-current ${priority.bg} ${priority.color}` 
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }
                      `}
                    >
                      <AlertTriangle className={`w-4 h-4 mx-auto mb-1 ${priority.color}`} />
                      <p className="font-medium text-sm">{priority.label}</p>
                      <p className="text-xs text-gray-600 mt-1">{priority.description}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Message */}
            <div className="space-y-2">
              <Label htmlFor="message">Message *</Label>
              <Textarea
                id="message"
                {...register("message")}
                placeholder="Please describe your issue in detail. Include any relevant order numbers, error messages, or steps you've already tried..."
                rows={6}
                className={errors.message ? "border-red-500" : ""}
              />
              {errors.message && (
                <p className="text-sm text-red-500 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.message.message}
                </p>
              )}
            </div>

            {/* Priority Info */}
            {selectedPriorityInfo && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className={`p-4 rounded-lg border ${selectedPriorityInfo.bg}`}
              >
                <div className="flex items-center space-x-2">
                  <AlertTriangle className={`w-4 h-4 ${selectedPriorityInfo.color}`} />
                  <span className={`font-medium text-sm ${selectedPriorityInfo.color}`}>
                    {selectedPriorityInfo.label} Priority Selected
                  </span>
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  {selectedPriorityInfo.description}
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  Expected response time: {
                    selectedPriority === "URGENT" ? "Within 2 hours" :
                    selectedPriority === "HIGH" ? "Within 4 hours" :
                    selectedPriority === "MEDIUM" ? "Within 24 hours" :
                    "Within 48 hours"
                  }
                </p>
              </motion.div>
            )}

            {/* Tips */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">Tips for faster resolution:</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Include your order number if this is order-related</li>
                <li>• Describe what you expected to happen vs. what actually happened</li>
                <li>• Include any error messages you received</li>
                <li>• Mention what device/browser you're using for technical issues</li>
              </ul>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            >
              {isLoading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Creating Ticket...
                </div>
              ) : (
                <div className="flex items-center">
                  <Send className="w-4 h-4 mr-2" />
                  Create Support Ticket
                </div>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
}