import { query } from './db'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { v4 as uuidv4 } from 'uuid'
import crypto from 'crypto'

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-for-development'
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required')
}
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d'

// Types for Customer Portal
export interface CustomerPortalUser {
  id: string
  customerId: string
  email: string
  firstName?: string
  lastName?: string
  phoneNumber?: string
  isActive: boolean
  isEmailVerified: boolean
  lastLoginAt?: Date
  createdAt: Date
  updatedAt: Date
}

export interface CustomerPortalSession {
  id: string
  userId: string
  sessionToken: string
  ipAddress?: string
  userAgent?: string
  isActive: boolean
  expiresAt: Date
  createdAt: Date
}

export interface CustomerPortalUserWithCustomer extends CustomerPortalUser {
  customer: {
    id: string
    firstName: string
    lastName: string
    companyName?: string
    phone?: string
    email?: string
    address?: string
    city?: string
    state?: string
    zip?: string
  }
}

// Password utilities
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12
  return await bcrypt.hash(password, saltRounds)
}

export async function comparePassword(password: string, hashedPassword: string): Promise<boolean> {
  return await bcrypt.compare(password, hashedPassword)
}

// JWT utilities for customer portal
export function generateCustomerToken(payload: any): string {
  return jwt.sign(
    { 
      ...payload, 
      type: 'customer',
      iat: Math.floor(Date.now() / 1000)
    },
    JWT_SECRET as string,
    { expiresIn: JWT_EXPIRES_IN }
  )
}

export function verifyCustomerToken(token: string): any {
  try {
    const decoded = jwt.verify(token, JWT_SECRET as string) as any
    if (decoded.type !== 'customer') {
      throw new Error('Invalid token type')
    }
    return decoded
  } catch (error) {
    throw new Error('Invalid token')
  }
}

// Generate secure random tokens
export function generateSecureToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

// Create customer portal user
export async function createCustomerPortalUser(data: {
  customerId: string
  email: string
  password: string
  firstName?: string
  lastName?: string
  phoneNumber?: string
}): Promise<CustomerPortalUser> {
  // Check if user already exists
  const existingResult = await query(
    'SELECT id FROM "CustomerPortalUser" WHERE email = $1 OR "customerId" = $2',
    [data.email, data.customerId]
  )

  if (existingResult.rows.length > 0) {
    throw new Error('Customer portal user already exists')
  }

  const hashedPassword = await hashPassword(data.password)
  const emailVerificationToken = generateSecureToken()

  const result = await query(
    `INSERT INTO "CustomerPortalUser" (
      id, "customerId", email, password, "firstName", "lastName", 
      "phoneNumber", "isActive", "isEmailVerified", "emailVerificationToken",
      "createdAt", "updatedAt"
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
    RETURNING id, "customerId", email, "firstName", "lastName", "phoneNumber", 
             "isActive", "isEmailVerified", "lastLoginAt", "createdAt", "updatedAt"`,
    [
      uuidv4(),
      data.customerId,
      data.email,
      hashedPassword,
      data.firstName || null,
      data.lastName || null,
      data.phoneNumber || null,
      true, // isActive
      false, // isEmailVerified
      emailVerificationToken
    ]
  )

  // Create default preferences
  await query(
    `INSERT INTO "CustomerPortalPreferences" (
      id, "customerId", "createdAt", "updatedAt"
    ) VALUES ($1, $2, NOW(), NOW())`,
    [uuidv4(), data.customerId]
  )

  return result.rows[0]
}

// Authenticate customer portal user
export async function authenticateCustomerPortalUser(
  email: string, 
  password: string,
  ipAddress?: string,
  userAgent?: string
): Promise<{ user: CustomerPortalUserWithCustomer; token: string; session: CustomerPortalSession }> {
  // Find user with customer data
  const result = await query(
    `SELECT 
      cpu.*,
      c.id as "customer_id",
      c."firstName" as "customer_firstName",
      c."lastName" as "customer_lastName", 
      c."companyName" as "customer_companyName",
      c.phone as "customer_phone",
      c.email as "customer_email",
      c.address as "customer_address",
      c.city as "customer_city",
      c.state as "customer_state",
      c.zip as "customer_zip"
    FROM "CustomerPortalUser" cpu
    JOIN "Customer" c ON cpu."customerId" = c.id
    WHERE cpu.email = $1 AND cpu."isActive" = true`,
    [email]
  )

  const userData = result.rows[0]
  if (!userData) {
    throw new Error('Invalid email or password')
  }

  // Check if account is locked
  if (userData.lockedUntil && new Date(userData.lockedUntil) > new Date()) {
    throw new Error('Account is temporarily locked due to multiple failed login attempts')
  }

  // Verify password
  const isValidPassword = await comparePassword(password, userData.password)
  if (!isValidPassword) {
    // Increment login attempts
    await incrementLoginAttempts(userData.id)
    throw new Error('Invalid email or password')
  }

  // Reset login attempts on successful login
  await resetLoginAttempts(userData.id)

  // Update last login
  await query(
    'UPDATE "CustomerPortalUser" SET "lastLoginAt" = NOW() WHERE id = $1',
    [userData.id]
  )

  // Create session
  const sessionToken = generateSecureToken()
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 7) // 7 days

  const sessionResult = await query(
    `INSERT INTO "CustomerPortalSession" (
      id, "userId", "sessionToken", "ipAddress", "userAgent", 
      "isActive", "expiresAt", "createdAt"
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
    RETURNING *`,
    [
      uuidv4(),
      userData.id,
      sessionToken,
      ipAddress || null,
      userAgent || null,
      true,
      expiresAt
    ]
  )

  // Transform user data
  const user: CustomerPortalUserWithCustomer = {
    id: userData.id,
    customerId: userData.customerId,
    email: userData.email,
    firstName: userData.firstName,
    lastName: userData.lastName,
    phoneNumber: userData.phoneNumber,
    isActive: userData.isActive,
    isEmailVerified: userData.isEmailVerified,
    lastLoginAt: userData.lastLoginAt,
    createdAt: userData.createdAt,
    updatedAt: userData.updatedAt,
    customer: {
      id: userData.customer_id,
      firstName: userData.customer_firstName,
      lastName: userData.customer_lastName,
      companyName: userData.customer_companyName,
      phone: userData.customer_phone,
      email: userData.customer_email,
      address: userData.customer_address,
      city: userData.customer_city,
      state: userData.customer_state,
      zip: userData.customer_zip
    }
  }

  // Generate JWT token
  const token = generateCustomerToken({
    id: user.id,
    customerId: user.customerId,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    sessionId: sessionResult.rows[0].id
  })

  return {
    user,
    token,
    session: sessionResult.rows[0]
  }
}

// Get customer portal user by token
export async function getCustomerPortalUserByToken(token: string): Promise<CustomerPortalUserWithCustomer | null> {
  try {
    const decoded = verifyCustomerToken(token)
    
    // Verify session is still active
    const sessionResult = await query(
      `SELECT * FROM "CustomerPortalSession" 
       WHERE id = $1 AND "isActive" = true AND "expiresAt" > NOW()`,
      [decoded.sessionId]
    )

    if (sessionResult.rows.length === 0) {
      return null
    }

    // Get user with customer data
    const result = await query(
      `SELECT 
        cpu.*,
        c.id as "customer_id",
        c."firstName" as "customer_firstName",
        c."lastName" as "customer_lastName", 
        c."companyName" as "customer_companyName",
        c.phone as "customer_phone",
        c.email as "customer_email",
        c.address as "customer_address",
        c.city as "customer_city",
        c.state as "customer_state",
        c.zip as "customer_zip"
      FROM "CustomerPortalUser" cpu
      JOIN "Customer" c ON cpu."customerId" = c.id
      WHERE cpu.id = $1 AND cpu."isActive" = true`,
      [decoded.id]
    )

    if (result.rows.length === 0) {
      return null
    }

    const userData = result.rows[0]
    return {
      id: userData.id,
      customerId: userData.customerId,
      email: userData.email,
      firstName: userData.firstName,
      lastName: userData.lastName,
      phoneNumber: userData.phoneNumber,
      isActive: userData.isActive,
      isEmailVerified: userData.isEmailVerified,
      lastLoginAt: userData.lastLoginAt,
      createdAt: userData.createdAt,
      updatedAt: userData.updatedAt,
      customer: {
        id: userData.customer_id,
        firstName: userData.customer_firstName,
        lastName: userData.customer_lastName,
        companyName: userData.customer_companyName,
        phone: userData.customer_phone,
        email: userData.customer_email,
        address: userData.customer_address,
        city: userData.customer_city,
        state: userData.customer_state,
        zip: userData.customer_zip
      }
    }
  } catch (error) {
    return null
  }
}

// Logout customer portal user
export async function logoutCustomerPortalUser(sessionId: string): Promise<void> {
  await query(
    'UPDATE "CustomerPortalSession" SET "isActive" = false WHERE id = $1',
    [sessionId]
  )
}

// Helper functions for login attempts
async function incrementLoginAttempts(userId: string): Promise<void> {
  const result = await query(
    'SELECT "loginAttempts" FROM "CustomerPortalUser" WHERE id = $1',
    [userId]
  )
  
  const currentAttempts = (result.rows[0]?.loginAttempts || 0) + 1
  const lockUntil = currentAttempts >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null // Lock for 15 minutes

  await query(
    'UPDATE "CustomerPortalUser" SET "loginAttempts" = $1, "lockedUntil" = $2 WHERE id = $3',
    [currentAttempts, lockUntil, userId]
  )
}

async function resetLoginAttempts(userId: string): Promise<void> {
  await query(
    'UPDATE "CustomerPortalUser" SET "loginAttempts" = 0, "lockedUntil" = NULL WHERE id = $1',
    [userId]
  )
}

// Password reset functionality
export async function initiatePasswordReset(email: string): Promise<string> {
  const user = await query(
    'SELECT id FROM "CustomerPortalUser" WHERE email = $1 AND "isActive" = true',
    [email]
  )

  if (user.rows.length === 0) {
    throw new Error('User not found')
  }

  const resetToken = generateSecureToken()
  const resetExpires = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

  await query(
    'UPDATE "CustomerPortalUser" SET "passwordResetToken" = $1, "passwordResetExpires" = $2 WHERE id = $3',
    [resetToken, resetExpires, user.rows[0].id]
  )

  return resetToken
}

// Reset password with token
export async function resetPasswordWithToken(token: string, newPassword: string): Promise<void> {
  const user = await query(
    `SELECT id FROM "CustomerPortalUser" 
     WHERE "passwordResetToken" = $1 AND "passwordResetExpires" > NOW() AND "isActive" = true`,
    [token]
  )

  if (user.rows.length === 0) {
    throw new Error('Invalid or expired reset token')
  }

  const hashedPassword = await hashPassword(newPassword)

  await query(
    `UPDATE "CustomerPortalUser" 
     SET password = $1, "passwordResetToken" = NULL, "passwordResetExpires" = NULL, "updatedAt" = NOW()
     WHERE id = $2`,
    [hashedPassword, user.rows[0].id]
  )
}

// Email verification
export async function verifyEmail(token: string): Promise<void> {
  const user = await query(
    'SELECT id FROM "CustomerPortalUser" WHERE "emailVerificationToken" = $1 AND "isActive" = true',
    [token]
  )

  if (user.rows.length === 0) {
    throw new Error('Invalid verification token')
  }

  await query(
    `UPDATE "CustomerPortalUser" 
     SET "isEmailVerified" = true, "emailVerificationToken" = NULL, "updatedAt" = NOW()
     WHERE id = $1`,
    [user.rows[0].id]
  )
}