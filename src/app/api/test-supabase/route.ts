import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    
    // Test database connection using Supabase client
    const { data, error } = await supabase
      .from('User')
      .select('count')
      .limit(1);
    
    if (error) {
      return NextResponse.json({
        status: "error",
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      }, { status: 500 });
    }
    
    // Also test if we can count IP usage
    const { count, error: ipError } = await supabase
      .from('IPUsage')
      .select('*', { count: 'exact', head: true });
    
    return NextResponse.json({
      status: "success",
      message: "Supabase client connection working!",
      userTableAccessible: !error,
      ipUsageTableAccessible: !ipError,
      ipUsageCount: count || 0,
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL?.split('.')[0]?.replace('https://', '') || 'unknown'
    });
  } catch (error: any) {
    return NextResponse.json({
      status: "error",
      message: error.message || "Unknown error",
      stack: error.stack
    }, { status: 500 });
  }
}