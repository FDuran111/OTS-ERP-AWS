import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Lightweight DB probe - simple SELECT 1
    await query('SELECT 1 as health_check');
    
    return NextResponse.json({ 
      ok: true, 
      v: process.env.APP_VERSION ?? "dev",
      timestamp: new Date().toISOString()
    }, { status: 200 });
  } catch (error) {
    console.error('Health check failed:', error);
    return NextResponse.json({ 
      ok: false,
      error: "Health check failed"
    }, { status: 500 });
  }
}