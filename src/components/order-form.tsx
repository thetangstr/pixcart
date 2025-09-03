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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { MapPin, CreditCard, Truck, User, Phone, Mail, MessageSquare } from "lucide-react";
import { PaintingStyle } from "./style-selector";

const orderSchema = z.object({
  // Customer Information
  customerName: z.string().min(2, "Name must be at least 2 characters"),
  customerEmail: z.string().email("Invalid email address"),
  customerPhone: z.string().min(10, "Phone number must be at least 10 digits"),

  // Shipping Information
  shippingAddress: z.string().min(5, "Address must be at least 5 characters"),
  shippingCity: z.string().min(2, "City must be at least 2 characters"),
  shippingState: z.string().min(2, "State is required"),
  shippingZipCode: z.string().min(5, "ZIP code must be at least 5 digits"),
  shippingCountry: z.string().min(2, "Country is required"),

  // Order Details
  size: z.string().min(1, "Please select a canvas size"),
  frameOption: z.string().min(1, "Please select a frame option"),
  rushOrder: z.boolean().default(false),
  specialInstructions: z.string().optional(),
});

type OrderFormData = z.infer<typeof orderSchema>;

interface OrderFormProps {
  imageData: string;
  selectedStyle: PaintingStyle;
  onSubmit: (formData: OrderFormData & { 
    totalAmount: number;
    imageData: string;
    selectedStyle: PaintingStyle;
  }) => void;
  isLoading?: boolean;
  estimatedPrice?: number;
  canvasOptions?: Array<{ size: string; price: number }>;
}

const canvasSizes = [
  { id: "8x10", name: "8\" x 10\"", price: 0, description: "Perfect for desks and shelves" },
  { id: "11x14", name: "11\" x 14\"", price: 30, description: "Great for smaller walls" },
  { id: "16x20", name: "16\" x 20\"", price: 60, description: "Most popular size" },
  { id: "18x24", name: "18\" x 24\"", price: 90, description: "Premium size for impact" },
  { id: "24x30", name: "24\" x 30\"", price: 150, description: "Large statement piece" },
];

const frameOptions = [
  { id: "none", name: "No Frame", price: 0, description: "Canvas only" },
  { id: "basic", name: "Basic Frame", price: 25, description: "Simple black frame" },
  { id: "premium", name: "Premium Frame", price: 50, description: "Elegant wooden frame" },
  { id: "luxury", name: "Luxury Frame", price: 100, description: "Hand-crafted ornate frame" },
];

const basePrice = {
  classic: 129,
  van_gogh: 149,
  monet: 139,
};

const states = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY"
];

export default function OrderForm({ imageData, selectedStyle, onSubmit, isLoading = false, estimatedPrice, canvasOptions }: OrderFormProps) {
  const [selectedSize, setSelectedSize] = useState("");
  const [selectedFrame, setSelectedFrame] = useState("");
  const [rushOrder, setRushOrder] = useState(false);

  // Use dynamic pricing from AI preview if available, otherwise fall back to default
  const effectiveCanvasSizes = canvasOptions?.map((option, index) => ({
    id: option.size.replace(/["\s]/g, '').toLowerCase(),
    name: option.size,
    price: index === 0 ? 0 : option.price - (canvasOptions[0]?.price || 0),
    description: canvasSizes[index]?.description || "Custom size"
  })) || canvasSizes;

  const effectiveBasePrice = estimatedPrice || basePrice[selectedStyle];

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors }
  } = useForm<OrderFormData>({
    resolver: zodResolver(orderSchema)
  });

  const calculateTotal = () => {
    const stylePrice = effectiveBasePrice;
    const sizePrice = effectiveCanvasSizes.find(s => s.id === selectedSize)?.price || 0;
    const framePrice = frameOptions.find(f => f.id === selectedFrame)?.price || 0;
    const rushPrice = rushOrder ? 50 : 0;
    const shipping = 15;
    
    return stylePrice + sizePrice + framePrice + rushPrice + shipping;
  };

  const onFormSubmit = (data: OrderFormData) => {
    onSubmit({
      ...data,
      totalAmount: calculateTotal(),
      imageData,
      selectedStyle
    });
  };

  const totalAmount = calculateTotal();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-gray-900">Complete Your Order</h2>
        <p className="text-gray-600">Fill in your details to receive your custom pet portrait</p>
      </div>

      <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Order Summary */}
          <div className="lg:col-span-1">
            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CreditCard className="w-5 h-5 mr-2" />
                  Order Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="aspect-square rounded-lg overflow-hidden bg-gray-100">
                  <img
                    src={imageData.startsWith('data:') ? imageData : `data:image/jpeg;base64,${imageData}`}
                    alt="Your pet"
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="font-medium capitalize">{selectedStyle.replace('_', ' ')} Style</span>
                    <span>${effectiveBasePrice}</span>
                  </div>
                  
                  {selectedSize && (
                    <div className="flex justify-between">
                      <span>Canvas Size ({effectiveCanvasSizes.find(s => s.id === selectedSize)?.name})</span>
                      <span>+${effectiveCanvasSizes.find(s => s.id === selectedSize)?.price}</span>
                    </div>
                  )}
                  
                  {selectedFrame && selectedFrame !== "none" && (
                    <div className="flex justify-between">
                      <span>{frameOptions.find(f => f.id === selectedFrame)?.name}</span>
                      <span>+${frameOptions.find(f => f.id === selectedFrame)?.price}</span>
                    </div>
                  )}
                  
                  {rushOrder && (
                    <div className="flex justify-between">
                      <span>Rush Order (5-7 days)</span>
                      <span>+$50</span>
                    </div>
                  )}
                  
                  <div className="flex justify-between">
                    <span>Shipping</span>
                    <span>$15</span>
                  </div>
                  
                  <Separator />
                  
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total</span>
                    <span>${totalAmount}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Form Fields */}
          <div className="lg:col-span-2 space-y-6">
            {/* Customer Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <User className="w-5 h-5 mr-2" />
                  Customer Information
                </CardTitle>
                <CardDescription>
                  Your contact details for order updates
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="customerName">Full Name *</Label>
                    <Input
                      id="customerName"
                      {...register("customerName")}
                      className={errors.customerName ? "border-red-500" : ""}
                    />
                    {errors.customerName && (
                      <p className="text-sm text-red-500">{errors.customerName.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="customerPhone">Phone Number *</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        id="customerPhone"
                        {...register("customerPhone")}
                        className={`pl-10 ${errors.customerPhone ? "border-red-500" : ""}`}
                        placeholder="(555) 123-4567"
                      />
                    </div>
                    {errors.customerPhone && (
                      <p className="text-sm text-red-500">{errors.customerPhone.message}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="customerEmail">Email Address *</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      id="customerEmail"
                      type="email"
                      {...register("customerEmail")}
                      className={`pl-10 ${errors.customerEmail ? "border-red-500" : ""}`}
                      placeholder="your@email.com"
                    />
                  </div>
                  {errors.customerEmail && (
                    <p className="text-sm text-red-500">{errors.customerEmail.message}</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Shipping Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <MapPin className="w-5 h-5 mr-2" />
                  Shipping Address
                </CardTitle>
                <CardDescription>
                  Where should we send your custom portrait?
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="shippingAddress">Street Address *</Label>
                  <Input
                    id="shippingAddress"
                    {...register("shippingAddress")}
                    className={errors.shippingAddress ? "border-red-500" : ""}
                    placeholder="123 Main Street"
                  />
                  {errors.shippingAddress && (
                    <p className="text-sm text-red-500">{errors.shippingAddress.message}</p>
                  )}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="shippingCity">City *</Label>
                    <Input
                      id="shippingCity"
                      {...register("shippingCity")}
                      className={errors.shippingCity ? "border-red-500" : ""}
                    />
                    {errors.shippingCity && (
                      <p className="text-sm text-red-500">{errors.shippingCity.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="shippingState">State *</Label>
                    <Select onValueChange={(value) => setValue("shippingState", value)}>
                      <SelectTrigger className={errors.shippingState ? "border-red-500" : ""}>
                        <SelectValue placeholder="Select state" />
                      </SelectTrigger>
                      <SelectContent>
                        {states.map((state) => (
                          <SelectItem key={state} value={state}>
                            {state}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.shippingState && (
                      <p className="text-sm text-red-500">{errors.shippingState.message}</p>
                    )}
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="shippingZipCode">ZIP Code *</Label>
                    <Input
                      id="shippingZipCode"
                      {...register("shippingZipCode")}
                      className={errors.shippingZipCode ? "border-red-500" : ""}
                      placeholder="12345"
                    />
                    {errors.shippingZipCode && (
                      <p className="text-sm text-red-500">{errors.shippingZipCode.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="shippingCountry">Country *</Label>
                    <Select onValueChange={(value) => setValue("shippingCountry", value)}>
                      <SelectTrigger className={errors.shippingCountry ? "border-red-500" : ""}>
                        <SelectValue placeholder="Select country" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="US">United States</SelectItem>
                        <SelectItem value="CA">Canada</SelectItem>
                        <SelectItem value="UK">United Kingdom</SelectItem>
                        <SelectItem value="AU">Australia</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.shippingCountry && (
                      <p className="text-sm text-red-500">{errors.shippingCountry.message}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Canvas & Frame Options */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Truck className="w-5 h-5 mr-2" />
                  Canvas & Frame Options
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <Label>Canvas Size *</Label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {effectiveCanvasSizes.map((size) => (
                      <motion.div
                        key={size.id}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <div
                          onClick={() => {
                            setSelectedSize(size.id);
                            setValue("size", size.id);
                          }}
                          className={`
                            p-4 border rounded-lg cursor-pointer transition-all
                            ${selectedSize === size.id 
                              ? 'border-purple-500 bg-purple-50' 
                              : 'border-gray-200 hover:border-gray-300'
                            }
                          `}
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium">{size.name}</p>
                              <p className="text-sm text-gray-600">{size.description}</p>
                            </div>
                            <p className="font-medium">
                              {size.price === 0 ? 'Included' : `+$${size.price}`}
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                  {errors.size && (
                    <p className="text-sm text-red-500">{errors.size.message}</p>
                  )}
                </div>

                <div className="space-y-3">
                  <Label>Frame Option *</Label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {frameOptions.map((frame) => (
                      <motion.div
                        key={frame.id}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <div
                          onClick={() => {
                            setSelectedFrame(frame.id);
                            setValue("frameOption", frame.id);
                          }}
                          className={`
                            p-4 border rounded-lg cursor-pointer transition-all
                            ${selectedFrame === frame.id 
                              ? 'border-purple-500 bg-purple-50' 
                              : 'border-gray-200 hover:border-gray-300'
                            }
                          `}
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium">{frame.name}</p>
                              <p className="text-sm text-gray-600">{frame.description}</p>
                            </div>
                            <p className="font-medium">
                              {frame.price === 0 ? 'Free' : `+$${frame.price}`}
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                  {errors.frameOption && (
                    <p className="text-sm text-red-500">{errors.frameOption.message}</p>
                  )}
                </div>

                <div className="flex items-center space-x-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <input
                    type="checkbox"
                    id="rushOrder"
                    checked={rushOrder}
                    onChange={(e) => {
                      setRushOrder(e.target.checked);
                      setValue("rushOrder", e.target.checked);
                    }}
                    className="w-4 h-4 text-yellow-600 border-gray-300 rounded focus:ring-yellow-500"
                  />
                  <div className="flex-1">
                    <Label htmlFor="rushOrder" className="font-medium cursor-pointer">
                      Rush Order (+$50)
                    </Label>
                    <p className="text-sm text-gray-600">
                      Get your portrait in 5-7 business days instead of 2-3 weeks
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Special Instructions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <MessageSquare className="w-5 h-5 mr-2" />
                  Special Instructions
                </CardTitle>
                <CardDescription>
                  Any special requests or notes for the artist? (Optional)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  {...register("specialInstructions")}
                  placeholder="e.g., Please emphasize the blue eyes, include the red collar, focus on the playful expression..."
                  rows={4}
                />
              </CardContent>
            </Card>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 py-6 text-lg font-semibold"
            >
              {isLoading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3" />
                  Processing Order...
                </div>
              ) : (
                `Complete Order - $${totalAmount}`
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}