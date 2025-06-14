import { prisma } from './prisma'
import { JobPhase } from '@prisma/client'

/**
 * Generates a job number in the format YY-###-SSS
 * YY = Year (2 digits)
 * ### = Sequential number (3 digits, padded with zeros)
 * SSS = Anonymous site code (3 alphanumeric characters)
 */
export async function generateJobNumber(): Promise<string> {
  const year = new Date().getFullYear().toString().slice(-2)
  
  // Get the highest job number for the current year
  const lastJob = await prisma.job.findFirst({
    where: {
      jobNumber: {
        startsWith: `${year}-`
      }
    },
    orderBy: {
      jobNumber: 'desc'
    }
  })
  
  let sequentialNumber = 1
  if (lastJob) {
    const parts = lastJob.jobNumber.split('-')
    if (parts.length >= 2) {
      sequentialNumber = parseInt(parts[1]) + 1
    }
  }
  
  const paddedSequential = sequentialNumber.toString().padStart(3, '0')
  const siteCode = generateSiteCode()
  
  return `${year}-${paddedSequential}-${siteCode}`
}

/**
 * Generates a phase-specific job number
 * Format: YY-###-SSS-PH where PH is the phase code (UG, RI, FN)
 */
export function generatePhaseJobNumber(baseJobNumber: string, phase: JobPhase): string {
  return `${baseJobNumber}-${phase}`
}

/**
 * Generates a purchase order number
 * Format: Job-Phase-VendorCode-##
 */
export async function generatePurchaseOrderNumber(
  jobNumber: string,
  phase: JobPhase | null,
  vendorCode: string
): Promise<string> {
  const baseNumber = phase ? `${jobNumber}-${phase}` : jobNumber
  
  // Get the highest PO number for this job/vendor combination
  const lastPO = await prisma.purchaseOrder.findFirst({
    where: {
      poNumber: {
        startsWith: `${baseNumber}-${vendorCode}-`
      }
    },
    orderBy: {
      poNumber: 'desc'
    }
  })
  
  let poSequence = 1
  if (lastPO) {
    const parts = lastPO.poNumber.split('-')
    const lastSequence = parts[parts.length - 1]
    poSequence = parseInt(lastSequence) + 1
  }
  
  const paddedSequence = poSequence.toString().padStart(2, '0')
  return `${baseNumber}-${vendorCode}-${paddedSequence}`
}

/**
 * Generates a random 3-character anonymous site code
 */
function generateSiteCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let code = ''
  for (let i = 0; i < 3; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}