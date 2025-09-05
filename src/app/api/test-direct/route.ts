import { NextResponse } from "next/server";

// Test endpoint to verify direct database connection
export async function GET() {
  try {
    // Use direct connection for testing
    const directUrl = "postgresql://postgres:anhuali11men@db.mqkqyigujbamrvebrhsd.supabase.co:5432/postgres";
    
    // Simple test query using fetch to Supabase REST API
    const projectRef = "mqkqyigujbamrvebrhsd";
    const apiUrl = `https://${projectRef}.supabase.co/rest/v1/User?select=count`;
    
    // Note: This would need the service role key to work properly
    // For now, just return the connection info
    
    return NextResponse.json({
      test: "Direct connection test",
      projectRef: projectRef,
      connectionType: "direct",
      port: 5432,
      note: "If tables exist and SQL queries work in Supabase UI, the issue is with pooler authentication",
      suggestion: "Check for 'Connection pooling' or 'Database URL' section in Supabase dashboard"
    });
  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      code: error.code
    }, { status: 500 });
  }
}