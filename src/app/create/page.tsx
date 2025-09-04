"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/app/providers";
import { Upload, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import ImageUploader from "@/components/image-uploader";
import { toast } from "sonner";

type PaintingStyle = "renaissance" | "van_gogh" | "monet";

const styles = [
  { id: "renaissance" as PaintingStyle, name: "Renaissance", icon: "🎨" },
  { id: "van_gogh" as PaintingStyle, name: "Van Gogh", icon: "🌌" },
  { id: "monet" as PaintingStyle, name: "Monet", icon: "🌸" },
];

export default function CreatePage() {
  const { user } = useAuth();
  const [imageData, setImageData] = useState<string>("");
  const [selectedStyle, setSelectedStyle] = useState<PaintingStyle | null>(null);
  const [aiPreview, setAiPreview] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [remainingGens, setRemainingGens] = useState<number | null>(null);

  useEffect(() => {
    fetchUsageStats();
  }, []);

  const fetchUsageStats = async () => {
    try {
      const response = await fetch("/api/user/usage");
      if (response.ok) {
        const data = await response.json();
        setRemainingGens(user ? data.limits.remaining : 1);
      } else if (!user) {
        setRemainingGens(1); // IP-based limit for non-authenticated users
      }
    } catch (error) {
      setRemainingGens(user ? 5 : 1); // Default fallback
    }
  };

  const handleImageUpload = (data: string, file: File) => {
    setImageData(`data:${file.type};base64,${data}`);
  };

  const generatePreview = async () => {
    if (!imageData || !selectedStyle) return;

    setIsGenerating(true);
    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageData,
          style: selectedStyle
        })
      });

      if (!response.ok) {
        if (response.status === 429) {
          toast.error(user ? "Daily limit exceeded" : "IP limit exceeded (1 per IP)");
        } else {
          throw new Error("Generation failed");
        }
        return;
      }

      const data = await response.json();
      setAiPreview(data.preview.styledImage);
      await fetchUsageStats();
      toast.success("Preview generated!");
    } catch (error) {
      toast.error("Failed to generate preview");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto space-y-8">
        
        {/* Usage indicator */}
        {remainingGens !== null && (
          <div className="text-center text-sm text-gray-600">
            {user ? `${remainingGens}/5 today` : "1 free"}
          </div>
        )}

        {/* Upload Area */}
        {!aiPreview && (
          <Card className="p-8">
            <ImageUploader
              onImageUpload={handleImageUpload}
              previewImage={imageData}
            />
          </Card>
        )}

        {/* Style Selection */}
        {imageData && !aiPreview && (
          <div className="grid grid-cols-3 gap-4">
            {styles.map((style) => (
              <Card
                key={style.id}
                className={`p-6 cursor-pointer transition-all hover:shadow-lg ${
                  selectedStyle === style.id ? 'ring-2 ring-purple-500 bg-purple-50' : ''
                }`}
                onClick={() => setSelectedStyle(style.id)}
              >
                <div className="text-4xl mb-2 text-center">{style.icon}</div>
                <h3 className="font-semibold text-center">{style.name}</h3>
              </Card>
            ))}
          </div>
        )}

        {/* Generate Button */}
        {imageData && selectedStyle && !aiPreview && (
          <div className="text-center">
            <Button
              onClick={generatePreview}
              disabled={isGenerating || remainingGens === 0}
              size="lg"
              className="px-8 py-4 text-lg"
            >
              {isGenerating ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3" />
                  Generating...
                </>
              ) : remainingGens === 0 ? (
                user ? "Daily limit reached" : "IP limit reached"
              ) : (
                <>
                  <Sparkles className="mr-2 h-5 w-5" />
                  Generate
                </>
              )}
            </Button>
          </div>
        )}

        {/* Result */}
        {aiPreview && (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <h3 className="font-semibold mb-2">Original</h3>
                <div className="aspect-square rounded-lg overflow-hidden">
                  <img src={imageData} alt="Original" className="w-full h-full object-contain" />
                </div>
              </div>
              <div>
                <h3 className="font-semibold mb-2">AI Preview</h3>
                <div className="aspect-square rounded-lg overflow-hidden border-2 border-purple-200">
                  <img src={aiPreview} alt="AI Preview" className="w-full h-full object-contain" />
                </div>
              </div>
            </div>
            <div className="text-center">
              <Button 
                onClick={() => {
                  setImageData("");
                  setSelectedStyle(null);
                  setAiPreview("");
                }}
                variant="outline"
                className="mr-4"
              >
                Try Another
              </Button>
              <Button>Order Physical Painting</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}