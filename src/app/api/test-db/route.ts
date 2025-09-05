import { NextResponse } from "next/server";

export async function GET() {
  const dbUrl = process.env.DATABASE_URL || "NOT_SET";
  
  // Hide password for security
  const sanitized = dbUrl.replace(/:[^:@]+@/, ':****@');
  
  // Check if using pooler (port 6543) or direct (port 5432)
  const isPooler = dbUrl.includes(':6543');
  const hasPoolerHost = dbUrl.includes('pooler.supabase.com');
  
  return NextResponse.json({
    status: "Database configuration check",
    usingPooler: isPooler,
    hasPoolerHost: hasPoolerHost,
    connectionString: sanitized,
    recommendation: isPooler && hasPoolerHost 
      ? "✅ Correct pooler configuration" 
      : "❌ Should use pooler connection on port 6543"
  });
}