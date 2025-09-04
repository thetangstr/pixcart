"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Upload } from "lucide-react";

const styles = [
  { name: "Renaissance", icon: "🎨" },
  { name: "Van Gogh", icon: "🌌" },
  { name: "Monet", icon: "🌸" },
];

export default function Home() {
  return (
    <div className="container mx-auto px-4 py-20">
      <div className="max-w-2xl mx-auto text-center">
        {/* Title */}
        <h1 className="text-6xl font-bold mb-12 text-gray-900">
          Pet → Oil Painting
        </h1>

        {/* Upload Button */}
        <Link href="/create">
          <Button size="lg" className="mb-12 h-16 px-8 text-xl">
            <Upload className="mr-3 h-6 w-6" />
            Upload Photo
          </Button>
        </Link>

        {/* Style Options */}
        <div className="grid grid-cols-3 gap-6">
          {styles.map((style) => (
            <Card key={style.name} className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
              <div className="text-4xl mb-3">{style.icon}</div>
              <h3 className="font-semibold">{style.name}</h3>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}