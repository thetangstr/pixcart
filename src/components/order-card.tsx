"use client";

import { motion } from "framer-motion";
import { format } from "@/lib/date-utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Calendar, 
  DollarSign, 
  Eye, 
  Package, 
  Palette, 
  Truck, 
  Clock, 
  CheckCircle,
  AlertCircle,
  XCircle
} from "lucide-react";
import Link from "next/link";

export interface OrderData {
  id: string;
  status: string;
  selectedStyle: string;
  totalAmount: number;
  estimatedDelivery: string | null;
  createdAt: string;
  updatedAt: string;
  originalImage: string;
  aiPreviewImage?: string | null;
  shippingName?: string | null;
  lastUpdate?: {
    status: string;
    notes?: string | null;
    createdAt: string;
  } | null;
}

interface OrderCardProps {
  order: OrderData;
  variant?: "default" | "compact";
}

const statusConfig = {
  PENDING: {
    color: "yellow",
    bg: "bg-yellow-100",
    text: "text-yellow-800",
    border: "border-yellow-200",
    icon: Clock,
    label: "Pending"
  },
  PROCESSING: {
    color: "blue",
    bg: "bg-blue-100", 
    text: "text-blue-800",
    border: "border-blue-200",
    icon: Package,
    label: "Processing"
  },
  AI_GENERATED: {
    color: "purple",
    bg: "bg-purple-100",
    text: "text-purple-800", 
    border: "border-purple-200",
    icon: Palette,
    label: "AI Generated"
  },
  ARTIST_ASSIGNED: {
    color: "indigo",
    bg: "bg-indigo-100",
    text: "text-indigo-800",
    border: "border-indigo-200", 
    icon: Palette,
    label: "Artist Assigned"
  },
  PAINTING: {
    color: "orange",
    bg: "bg-orange-100",
    text: "text-orange-800",
    border: "border-orange-200",
    icon: Palette,
    label: "In Progress"
  },
  QUALITY_CHECK: {
    color: "cyan",
    bg: "bg-cyan-100",
    text: "text-cyan-800",
    border: "border-cyan-200",
    icon: CheckCircle,
    label: "Quality Check"
  },
  SHIPPING: {
    color: "green",
    bg: "bg-green-100",
    text: "text-green-800",
    border: "border-green-200",
    icon: Truck,
    label: "Shipping"
  },
  DELIVERED: {
    color: "emerald",
    bg: "bg-emerald-100", 
    text: "text-emerald-800",
    border: "border-emerald-200",
    icon: CheckCircle,
    label: "Delivered"
  },
  CANCELLED: {
    color: "red",
    bg: "bg-red-100",
    text: "text-red-800",
    border: "border-red-200",
    icon: XCircle,
    label: "Cancelled"
  }
};

export default function OrderCard({ order, variant = "default" }: OrderCardProps) {
  const statusInfo = statusConfig[order.status as keyof typeof statusConfig] || statusConfig.PENDING;
  const StatusIcon = statusInfo.icon;
  
  const styleDisplayName = order.selectedStyle
    ?.replace('_', ' ')
    ?.split(' ')
    ?.map(word => word.charAt(0).toUpperCase() + word.slice(1))
    ?.join(' ') || 'Classic';

  if (variant === "compact") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ y: -2 }}
        transition={{ duration: 0.2 }}
      >
        <Card className="hover:shadow-md transition-shadow duration-200">
          <CardContent className="p-4">
            <div className="flex items-center space-x-4">
              <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                <img
                  src={order.originalImage.startsWith('data:') 
                    ? order.originalImage 
                    : `data:image/jpeg;base64,${order.originalImage}`
                  }
                  alt="Order preview"
                  className="w-full h-full object-cover"
                />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-semibold text-sm truncate">
                    Order #{order.id.slice(-8)}
                  </h3>
                  <Badge className={`${statusInfo.bg} ${statusInfo.text} text-xs px-2 py-1`}>
                    {statusInfo.label}
                  </Badge>
                </div>
                
                <p className="text-xs text-gray-600 mb-1">
                  {styleDisplayName} Style • ${order.totalAmount}
                </p>
                
                <p className="text-xs text-gray-500">
                  {format(new Date(order.createdAt), "MMM d, yyyy")}
                </p>
              </div>
              
              <Link href={`/orders/${order.id}`}>
                <Button size="sm" variant="outline">
                  <Eye className="w-3 h-3 mr-1" />
                  View
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4, shadow: "0 10px 25px rgba(0,0,0,0.1)" }}
      transition={{ duration: 0.3 }}
    >
      <Card className="overflow-hidden hover:shadow-xl transition-all duration-300">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-bold">
              Order #{order.id.slice(-8)}
            </CardTitle>
            <Badge className={`${statusInfo.bg} ${statusInfo.text} px-3 py-1 flex items-center space-x-1`}>
              <StatusIcon className="w-3 h-3" />
              <span>{statusInfo.label}</span>
            </Badge>
          </div>
          
          {order.shippingName && (
            <p className="text-sm text-gray-600">
              for {order.shippingName}
            </p>
          )}
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="flex space-x-4">
            <div className="relative w-24 h-24 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
              <img
                src={order.originalImage.startsWith('data:') 
                  ? order.originalImage 
                  : `data:image/jpeg;base64,${order.originalImage}`
                }
                alt="Order preview"
                className="w-full h-full object-cover"
              />
              
              {order.aiPreviewImage && (
                <div className="absolute top-1 right-1">
                  <div className="w-4 h-4 bg-purple-600 rounded-full flex items-center justify-center">
                    <Palette className="w-2 h-2 text-white" />
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex-1 space-y-2">
              <div className="flex items-center space-x-2">
                <Palette className="w-4 h-4 text-purple-600" />
                <span className="font-medium text-sm">{styleDisplayName} Style</span>
              </div>
              
              <div className="flex items-center space-x-2">
                <DollarSign className="w-4 h-4 text-green-600" />
                <span className="font-bold text-lg">${order.totalAmount}</span>
              </div>
              
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-blue-600" />
                <span className="text-sm text-gray-600">
                  Ordered {format(new Date(order.createdAt), "MMM d, yyyy")}
                </span>
              </div>
            </div>
          </div>

          {order.estimatedDelivery && (
            <div className={`p-3 rounded-lg border ${statusInfo.border} ${statusInfo.bg}`}>
              <div className="flex items-center space-x-2">
                <Truck className={`w-4 h-4 ${statusInfo.text}`} />
                <span className={`text-sm font-medium ${statusInfo.text}`}>
                  Estimated Delivery: {format(new Date(order.estimatedDelivery), "MMM d, yyyy")}
                </span>
              </div>
            </div>
          )}

          {order.lastUpdate && (
            <div className="text-xs text-gray-500">
              <p>Last updated: {format(new Date(order.lastUpdate.createdAt), "MMM d, yyyy 'at' h:mm a")}</p>
              {order.lastUpdate.notes && (
                <p className="mt-1">{order.lastUpdate.notes}</p>
              )}
            </div>
          )}
        </CardContent>

        <CardFooter className="pt-0">
          <div className="w-full flex space-x-2">
            <Link href={`/orders/${order.id}`} className="flex-1">
              <Button className="w-full" variant="outline">
                <Eye className="w-4 h-4 mr-2" />
                View Details
              </Button>
            </Link>
            
            {(order.status === "PENDING" || order.status === "PROCESSING") && (
              <Button variant="outline" size="sm">
                <AlertCircle className="w-4 h-4" />
              </Button>
            )}
          </div>
        </CardFooter>
      </Card>
    </motion.div>
  );
}