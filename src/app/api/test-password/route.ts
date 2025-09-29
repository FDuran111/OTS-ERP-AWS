import { NextResponse } from 'next/server';
import bcrypt from 'bcrypt';

export async function GET() {
  try {
    // Test if OTS123 matches the hash we have for admin@admin.com
    const password = 'OTS123';
    const hash = '$2b$12$PmZtpIgDcfoKrOvvPWb2g.FC0EpCXBljSZQwbnS393bBakNkAbwTK';
    
    const isValid = await bcrypt.compare(password, hash);
    
    // Also generate a new hash for OTS123 to verify
    const newHash = await bcrypt.hash(password, 12);
    
    return NextResponse.json({
      password_tested: 'OTS123',
      hash_tested: hash,
      is_valid: isValid,
      new_hash_for_comparison: newHash,
      message: isValid ? 'Password matches!' : 'Password does not match'
    });
  } catch (error: any) {
    return NextResponse.json({ 
      error: error.message 
    }, { status: 500 });
  }
}