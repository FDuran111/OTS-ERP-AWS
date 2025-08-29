import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Lightweight DB check
    await query('SELECT 1 as health_check');
    
    // S3 check is optional - skipping to keep it fast
    // Could add: await s3.headBucket({ Bucket: process.env.S3_BUCKET! });
    
    return NextResponse.json({ 
      ok: true, 
      v: process.env.APP_VERSION ?? "dev",
      timestamp: new Date().toISOString()
    }, { status: 200 });
  } catch (err) {
    console.error("Health check failed:", err);
    return NextResponse.json({ 
      ok: false,
      error: "Health check failed"
    }, { status: 500 });
  }
}