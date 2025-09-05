import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function GET() {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json({
        status: "error",
        service: "gemini",
        message: "GEMINI_API_KEY is not configured",
        configured: false
      }, { status: 503 });
    }
    
    // Try to initialize the client
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      
      // Just check if we can get the model - don't make actual API calls
      if (model) {
        return NextResponse.json({
          status: "healthy",
          service: "gemini",
          message: "Gemini API is configured and ready",
          configured: true,
          model: "gemini-1.5-flash",
          keyLength: apiKey.length
        });
      }
    } catch (error: any) {
      return NextResponse.json({
        status: "error",
        service: "gemini",
        message: "Invalid API key or configuration error",
        configured: true,
        error: error.message
      }, { status: 503 });
    }
    
  } catch (error: any) {
    return NextResponse.json({
      status: "error",
      service: "gemini",
      message: "Health check failed",
      error: error.message
    }, { status: 500 });
  }
}