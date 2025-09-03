"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquarePlus, X, Send, Bug, Lightbulb, Zap, HelpCircle, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { usePathname } from "next/navigation";
import { useAuth } from "@/app/providers";

const feedbackTypes = [
  { value: "bug", label: "Bug Report", icon: Bug, color: "text-red-500" },
  { value: "feature", label: "Feature Request", icon: Lightbulb, color: "text-blue-500" },
  { value: "improvement", label: "Improvement", icon: Zap, color: "text-yellow-500" },
  { value: "other", label: "Other", icon: HelpCircle, color: "text-gray-500" },
];

export default function FeedbackWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [type, setType] = useState("improvement");
  const [message, setMessage] = useState("");
  const [expectedBehavior, setExpectedBehavior] = useState("");
  const [actualBehavior, setActualBehavior] = useState("");
  const [rating, setRating] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const pathname = usePathname();
  const { user } = useAuth();

  // Show feedback widget to all logged in users
  if (!user) return null;

  const handleSubmit = async () => {
    if (!message.trim()) {
      toast.error("Please enter your feedback");
      return;
    }

    // For bug reports, require expected and actual behavior
    if (type === "bug" && (!expectedBehavior.trim() || !actualBehavior.trim())) {
      toast.error("Please describe both expected and actual behavior for bug reports");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          message,
          expectedBehavior: expectedBehavior.trim() || undefined,
          actualBehavior: actualBehavior.trim() || undefined,
          rating: rating || undefined,
          page: pathname,
        }),
      });

      if (response.ok) {
        toast.success("Thank you for your feedback! 🎨");
        setMessage("");
        setExpectedBehavior("");
        setActualBehavior("");
        setRating(0);
        setIsOpen(false);
      } else {
        throw new Error("Failed to submit feedback");
      }
    } catch (error) {
      toast.error("Failed to submit feedback. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* Floating Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-gradient-to-r from-orange-500 to-orange-600 rounded-full shadow-lg flex items-center justify-center text-white hover:shadow-xl transition-all hover:from-orange-600 hover:to-orange-700"
          >
            <MessageSquarePlus className="w-6 h-6" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Feedback Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ x: 400, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 400, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed bottom-6 right-6 z-50 w-96 bg-white rounded-xl shadow-2xl border border-orange-200"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-orange-500 to-orange-600 p-4 rounded-t-xl">
              <div className="flex items-center justify-between">
                <div className="text-white">
                  <h3 className="font-semibold text-lg">Feedback</h3>
                  <p className="text-xs opacity-90">Help us improve PixCart</p>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-white/80 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4">
              {/* Feedback Type */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">
                  Feedback Type
                </label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {feedbackTypes.map((feedbackType) => {
                      const Icon = feedbackType.icon;
                      return (
                        <SelectItem key={feedbackType.value} value={feedbackType.value}>
                          <div className="flex items-center">
                            <Icon className={`w-4 h-4 mr-2 ${feedbackType.color}`} />
                            {feedbackType.label}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              {/* Rating */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">
                  How's your experience? (Optional)
                </label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setRating(star === rating ? 0 : star)}
                      className="transition-all"
                    >
                      <Star
                        className={`w-6 h-6 ${
                          star <= rating
                            ? "fill-amber-400 text-amber-400"
                            : "text-gray-300 hover:text-amber-300"
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Expected Behavior (only for bugs) */}
              {type === "bug" && (
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">
                    Expected Behavior
                  </label>
                  <Textarea
                    value={expectedBehavior}
                    onChange={(e) => setExpectedBehavior(e.target.value)}
                    placeholder="What did you expect to happen?"
                    className="min-h-[80px] resize-none border-orange-200 focus:border-orange-400"
                  />
                </div>
              )}

              {/* Actual Behavior (only for bugs) */}
              {type === "bug" && (
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">
                    Actual Behavior
                  </label>
                  <Textarea
                    value={actualBehavior}
                    onChange={(e) => setActualBehavior(e.target.value)}
                    placeholder="What actually happened?"
                    className="min-h-[80px] resize-none border-orange-200 focus:border-orange-400"
                  />
                </div>
              )}

              {/* Message */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">
                  {type === "bug" ? "Additional Details" : "Your Feedback"}
                </label>
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={
                    type === "bug" 
                      ? "Any additional context, steps to reproduce, or other relevant information..."
                      : "Share your thoughts, report bugs, or suggest improvements..."
                  }
                  className="min-h-[100px] resize-none border-orange-200 focus:border-orange-400"
                />
              </div>

              {/* Current Page */}
              <div className="text-xs text-gray-500">
                Feedback from: <span className="font-mono">{pathname}</span>
              </div>

              {/* Submit Button */}
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting || !message.trim()}
                className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white"
              >
                {isSubmitting ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Sending...
                  </div>
                ) : (
                  <div className="flex items-center">
                    <Send className="w-4 h-4 mr-2" />
                    Send Feedback
                  </div>
                )}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}