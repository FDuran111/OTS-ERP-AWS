import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { initiatePasswordReset, resetPasswordWithToken } from '@/lib/customer-auth'

const initiateResetSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
})

const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters')
    .regex(/(?=.*[a-z])/, 'Password must contain at least one lowercase letter')
    .regex(/(?=.*[A-Z])/, 'Password must contain at least one uppercase letter')
    .regex(/(?=.*\d)/, 'Password must contain at least one number'),
  confirmPassword: z.string()
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

// POST /api/customer-portal/auth/reset-password - Initiate password reset
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Check if this is an initiate request or reset request
    if ('token' in body) {
      // This is a password reset with token
      const { token, newPassword } = resetPasswordSchema.parse(body)
      
      await resetPasswordWithToken(token, newPassword)
      
      return NextResponse.json({
        success: true,
        message: 'Password has been reset successfully. You can now log in with your new password.'
      })
      
    } else {
      // This is an initiate password reset request
      const { email } = initiateResetSchema.parse(body)
      
      try {
        const resetToken = await initiatePasswordReset(email)
        
        // In production, send email with reset link
        // For now, we'll just return success (in real app, don't return the token)
        console.log('Password reset initiated for:', email)
        console.log('Reset token (dev only):', resetToken)
        
        return NextResponse.json({
          success: true,
          message: 'If an account with that email exists, you will receive a password reset link.',
          // In production, remove this:
          ...(process.env.NODE_ENV === 'development' && { resetToken })
        })
        
      } catch (error: any) {
        // Don't reveal if email exists or not for security
        return NextResponse.json({
          success: true,
          message: 'If an account with that email exists, you will receive a password reset link.'
        })
      }
    }

  } catch (error: any) {
    console.error('Password reset error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid input data', 
          details: error.errors 
        },
        { status: 400 }
      )
    }

    if (error.message.includes('Invalid or expired')) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired reset token' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { success: false, error: 'Password reset failed' },
      { status: 500 }
    )
  }
}