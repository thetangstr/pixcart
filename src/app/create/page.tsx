"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/app/providers";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ArrowLeft, Sparkles, Eye, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import ImageUploader from "@/components/image-uploader";
import StyleSelector, { PaintingStyle } from "@/components/style-selector";
import OrderForm from "@/components/order-form";
import { toast } from "sonner";

type Step = "upload" | "preview" | "order";

interface StepData {
  imageData?: string;
  imageFile?: File;
  selectedStyle?: PaintingStyle;
  aiPreview?: string;
  aiDescription?: string;
  cssFilter?: string;
  estimatedPrice?: number;
  canvasOptions?: Array<{ size: string; price: number }>;
}

const steps = [
  { id: "upload" as Step, title: "Upload & Style", description: "Upload photo and choose style" },
  { id: "preview" as Step, title: "AI Preview", description: "View AI-generated preview" },
  { id: "order" as Step, title: "Complete Order", description: "Fill in order details" },
];

export default function CreatePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<Step>("upload");
  const [stepData, setStepData] = useState<StepData>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirect to sign in if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth/signin?callbackUrl=/create");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600" />
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect
  }

  const getCurrentStepIndex = () => steps.findIndex(step => step.id === currentStep);
  const isStepCompleted = (stepId: Step) => {
    switch (stepId) {
      case "upload":
        return !!stepData.imageData && !!stepData.selectedStyle;
      case "preview":
        return !!stepData.aiPreview;
      case "order":
        return false; // Never completed until submission
      default:
        return false;
    }
  };

  const canProceedToStep = (stepId: Step) => {
    const stepIndex = steps.findIndex(step => step.id === stepId);
    const currentIndex = getCurrentStepIndex();
    
    // Can always go back
    if (stepIndex <= currentIndex) return true;
    
    // Can only proceed if previous steps are completed
    for (let i = 0; i < stepIndex; i++) {
      if (!isStepCompleted(steps[i].id)) return false;
    }
    return true;
  };

  const handleImageUpload = (imageData: string, file: File) => {
    setStepData(prev => ({ ...prev, imageData: `data:${file.type};base64,${imageData}`, imageFile: file }));
  };

  const handleStyleSelect = (style: PaintingStyle) => {
    setStepData(prev => ({ ...prev, selectedStyle: style }));
  };

  const generatePreview = async () => {
    if (!stepData.imageData || !stepData.selectedStyle) return;

    setIsGenerating(true);
    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageData: stepData.imageData,
          style: stepData.selectedStyle
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to generate preview");
      }

      const data = await response.json();
      setStepData(prev => ({ 
        ...prev, 
        aiPreview: data.preview.styledImage,
        aiDescription: data.preview.description,
        cssFilter: data.preview.cssFilter,
        estimatedPrice: data.preview.estimatedPrice,
        canvasOptions: data.preview.canvasOptions
      }));
      
      toast.success("AI preview generated successfully!");
      // Automatically move to preview step
      setCurrentStep("preview");
    } catch (error: any) {
      console.error("Error generating preview:", error);
      toast.error(error.message || "Failed to generate preview. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleOrderSubmit = async (orderData: any) => {
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderData)
      });

      if (!response.ok) throw new Error("Failed to create order");

      const order = await response.json();
      toast.success("Order created successfully!");
      router.push(`/orders/${order.id}`);
    } catch (error) {
      console.error("Error creating order:", error);
      toast.error("Failed to create order. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const nextStep = async () => {
    const currentIndex = getCurrentStepIndex();
    if (currentIndex < steps.length - 1) {
      const nextStepId = steps[currentIndex + 1].id;
      
      // Generate preview when moving to preview step
      if (nextStepId === "preview" && !stepData.aiPreview) {
        await generatePreview();
      }
      
      setCurrentStep(nextStepId);
    }
  };

  const prevStep = () => {
    const currentIndex = getCurrentStepIndex();
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1].id);
    }
  };

  const goToStep = (stepId: Step) => {
    if (canProceedToStep(stepId)) {
      setCurrentStep(stepId);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50">
      <div className="container mx-auto px-4 py-8">
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between max-w-3xl mx-auto">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <motion.button
                  onClick={() => goToStep(step.id)}
                  disabled={!canProceedToStep(step.id)}
                  className={`
                    relative flex items-center justify-center w-10 h-10 rounded-full font-medium text-sm
                    transition-all duration-300 disabled:cursor-not-allowed
                    ${currentStep === step.id
                      ? "bg-purple-600 text-white shadow-lg"
                      : isStepCompleted(step.id)
                        ? "bg-green-500 text-white hover:bg-green-600"
                        : canProceedToStep(step.id)
                          ? "bg-gray-200 text-gray-600 hover:bg-gray-300"
                          : "bg-gray-100 text-gray-400"
                    }
                  `}
                  whileHover={canProceedToStep(step.id) ? { scale: 1.05 } : {}}
                  whileTap={canProceedToStep(step.id) ? { scale: 0.95 } : {}}
                >
                  {isStepCompleted(step.id) ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : (
                    index + 1
                  )}
                  
                  {currentStep === step.id && (
                    <motion.div
                      className="absolute inset-0 border-2 border-purple-300 rounded-full"
                      initial={{ scale: 1, opacity: 0 }}
                      animate={{ scale: 1.3, opacity: 1 }}
                      transition={{ duration: 0.3 }}
                    />
                  )}
                </motion.button>

                {index < steps.length - 1 && (
                  <div className={`
                    w-12 h-0.5 mx-2 transition-colors duration-300
                    ${isStepCompleted(step.id) ? "bg-green-500" : "bg-gray-200"}
                  `} />
                )}
              </div>
            ))}
          </div>

          <div className="text-center mt-4">
            <h1 className="text-2xl font-bold text-gray-900">
              {steps.find(step => step.id === currentStep)?.title}
            </h1>
            <p className="text-gray-600">
              {steps.find(step => step.id === currentStep)?.description}
            </p>
          </div>
        </div>

        {/* Step Content */}
        <div className="max-w-4xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {currentStep === "upload" && (
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Sparkles className="w-5 h-5 mr-2" />
                        Upload Your Pet's Photo
                      </CardTitle>
                      <CardDescription>
                        Choose a high-quality photo that shows your pet's face clearly.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ImageUploader
                        onImageUpload={handleImageUpload}
                        previewImage={stepData.imageData}
                      />
                    </CardContent>
                  </Card>

                  {stepData.imageData && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5 }}
                    >
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center">
                            <Eye className="w-5 h-5 mr-2" />
                            Choose Your Style
                          </CardTitle>
                          <CardDescription>
                            Select an artistic style for your pet portrait
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <StyleSelector
                            selectedStyle={stepData.selectedStyle || null}
                            onStyleSelect={handleStyleSelect}
                            compact={true}
                          />
                          
                          {stepData.selectedStyle && (
                            <motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              className="mt-6 flex justify-center"
                            >
                              <Button
                                onClick={async () => {
                                  await generatePreview();
                                }}
                                disabled={isGenerating}
                                size="lg"
                                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold px-8 py-6 text-lg"
                              >
                                {isGenerating ? (
                                  <div className="flex items-center">
                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3" />
                                    Creating AI Preview...
                                  </div>
                                ) : (
                                  <>
                                    <Sparkles className="w-5 h-5 mr-2" />
                                    Generate AI Preview
                                  </>
                                )}
                              </Button>
                            </motion.div>
                          )}
                        </CardContent>
                      </Card>
                    </motion.div>
                  )}
                </div>
              )}

              {currentStep === "preview" && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Eye className="w-5 h-5 mr-2" />
                      AI Preview
                    </CardTitle>
                    <CardDescription>
                      Here's how your pet portrait will look in the {stepData.selectedStyle?.replace('_', ' ')} style
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isGenerating ? (
                      <div className="text-center py-12">
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                          className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full mx-auto mb-4"
                        />
                        <h3 className="text-lg font-semibold mb-2">Converting Your Pet Photo...</h3>
                        <p className="text-gray-600">Our AI is transforming your photo into a beautiful {stepData.selectedStyle?.replace('_', ' ')} style painting</p>
                        <p className="text-sm text-gray-500 mt-2">This usually takes 10-20 seconds</p>
                      </div>
                    ) : stepData.aiPreview ? (
                      <div className="space-y-6">
                        <div className="grid gap-6 md:grid-cols-2">
                          <div>
                            <h3 className="font-semibold mb-2">Original Photo</h3>
                            <div className="aspect-square rounded-lg overflow-hidden bg-gray-100">
                              <img
                                src={stepData.imageData}
                                alt="Original"
                                className="w-full h-full object-contain"
                              />
                            </div>
                          </div>
                          
                          <div>
                            <h3 className="font-semibold mb-2 flex items-center">
                              AI Generated Preview
                              <Badge className="ml-2 bg-purple-100 text-purple-800">
                                {stepData.selectedStyle?.replace('_', ' ')} Style
                              </Badge>
                            </h3>
                            <div className="aspect-square rounded-lg overflow-hidden bg-gray-100 border-2 border-purple-200">
                              <img
                                src={stepData.aiPreview}
                                alt="AI Generated Oil Painting Preview"
                                className="w-full h-full object-contain"
                              />
                            </div>
                          </div>
                        </div>

                        {stepData.aiDescription && (
                          <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                            <h4 className="font-medium text-purple-900 mb-2">AI Generated Style:</h4>
                            <p className="text-sm text-purple-800 whitespace-pre-line">{stepData.aiDescription}</p>
                          </div>
                        )}

                        <div className="text-center p-4 bg-blue-50 border border-blue-200 rounded-lg">
                          <AlertCircle className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                          <p className="text-sm text-blue-800">
                            This is an AI-generated preview showing your pet in the selected artistic style.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <Button onClick={generatePreview} className="bg-purple-600 hover:bg-purple-700">
                          <Sparkles className="w-4 h-4 mr-2" />
                          Generate AI Preview
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {currentStep === "order" && stepData.imageData && stepData.selectedStyle && (
                <OrderForm
                  imageData={stepData.imageData}
                  selectedStyle={stepData.selectedStyle}
                  onSubmit={handleOrderSubmit}
                  isLoading={isSubmitting}
                  estimatedPrice={stepData.estimatedPrice}
                  canvasOptions={stepData.canvasOptions}
                />
              )}
            </motion.div>
          </AnimatePresence>

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8">
            <Button
              onClick={prevStep}
              variant="outline"
              disabled={getCurrentStepIndex() === 0}
              className="flex items-center"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Previous
            </Button>

            {currentStep !== "order" && (
              <Button
                onClick={nextStep}
                disabled={!isStepCompleted(currentStep) || (currentStep === "preview" && isGenerating)}
                className="flex items-center bg-amber-600 hover:bg-amber-700"
              >
                {currentStep === "preview" && !stepData.aiPreview ? (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate Preview
                  </>
                ) : (
                  <>
                    Next
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}