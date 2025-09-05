import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function GET(request: NextRequest) {
  const results = {
    timestamp: new Date().toISOString(),
    checks: {
      geminiKey: false,
      geminiModel: false,
      supabaseAuth: false,
      userEmail: null,
      isAdmin: false,
      databaseConnection: false,
      canGenerate: false
    },
    errors: []
  };

  // 1. Check Gemini API Key
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      results.checks.geminiKey = true;
      
      // 2. Test Gemini Model
      try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ 
          model: "models/gemini-2.5-flash-image-preview" 
        });
        results.checks.geminiModel = true;
        
        // Quick test
        const result = await model.generateContent("Say 'working'");
        const response = await result.response;
        if (response.text()) {
          results.checks.canGenerate = true;
        }
      } catch (e: any) {
        results.errors.push(`Gemini model error: ${e.message}`);
      }
    } else {
      results.errors.push("GEMINI_API_KEY not found");
    }
  } catch (e: any) {
    results.errors.push(`Gemini setup error: ${e.message}`);
  }

  // 3. Check Supabase Auth
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (user && !error) {
      results.checks.supabaseAuth = true;
      results.checks.userEmail = user.email;
      
      // 4. Check if admin
      if (user.email === 'thetangstr@gmail.com') {
        results.checks.isAdmin = true;
      }
      
      // 5. Check database
      try {
        const dbUser = await prisma.user.findUnique({
          where: { email: user.email || "" }
        });
        if (dbUser) {
          results.checks.databaseConnection = true;
        }
      } catch (e: any) {
        results.errors.push(`Database error: ${e.message}`);
      }
    } else if (error) {
      results.errors.push(`Auth error: ${error.message}`);
    }
  } catch (e: any) {
    results.errors.push(`Supabase error: ${e.message}`);
  }

  // Determine overall status
  const allGood = Object.entries(results.checks)
    .filter(([key]) => key !== 'userEmail')
    .every(([_, value]) => value === true);

  return NextResponse.json({
    ...results,
    status: allGood ? "✅ READY TO GENERATE" : "❌ ISSUES FOUND",
    solution: !allGood ? "Check the errors array for details" : null
  }, { status: 200 });
}