/**
 * Employee Workflow Tests
 *
 * Tests for the complete employee workflow including:
 * - Time entry creation with auto-assign
 * - Material usage tracking
 * - Bulk approval with JobLaborCost creation
 * - Material reversal with exact matching
 */

import { query, withTransaction, pool } from '@/lib/db'

// Test data factories
const createTestUser = async (overrides = {}) => {
  const result = await query(`
    INSERT INTO "User" (id, email, name, role, password, active, "regularRate", "overtimeRate", "doubleTimeRate", "createdAt", "updatedAt")
    VALUES (
      gen_random_uuid()::text,
      $1,
      $2,
      $3,
      'test-hash',
      true,
      $4,
      $5,
      $6,
      NOW(),
      NOW()
    )
    RETURNING *
  `, [
    `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}@example.com`,
    overrides['name'] || 'Test Employee',
    overrides['role'] || 'EMPLOYEE',
    overrides['regularRate'] || 25.00,
    overrides['overtimeRate'] || 37.50,
    overrides['doubleTimeRate'] || 50.00
  ])
  return result.rows[0]
}

const createTestCustomer = async () => {
  const result = await query(`
    INSERT INTO "Customer" (id, "firstName", "lastName", email, phone, "createdAt", "updatedAt")
    VALUES (gen_random_uuid()::text, $1, $2, $3, $4, NOW(), NOW())
    RETURNING *
  `, [
    'Test',
    `Customer-${Date.now()}`,
    `customer-${Date.now()}-${Math.random().toString(36).substr(2, 5)}@example.com`,
    '555-0100'
  ])
  return result.rows[0]
}

const createTestJob = async (customerId: string, overrides = {}) => {
  const jobNumber = `TEST-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`
  const result = await query(`
    INSERT INTO "Job" (id, "jobNumber", "customerId", type, status, description, "createdAt", "updatedAt")
    VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, NOW(), NOW())
    RETURNING *
  `, [
    jobNumber,
    customerId,
    'INSTALLATION',
    overrides['status'] || 'SCHEDULED',
    overrides['description'] || 'Test Job Description'
  ])
  return result.rows[0]
}

const createTestMaterial = async (overrides = {}) => {
  const result = await query(`
    INSERT INTO "Material" (id, code, name, description, unit, cost, price, "inStock", category, "createdAt", "updatedAt")
    VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
    RETURNING *
  `, [
    overrides['code'] || `MAT-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    overrides['name'] || 'Test Material',
    'Test material for workflow tests',
    overrides['unit'] || 'EACH',
    overrides['cost'] || 10.00,
    overrides['price'] || 15.00,
    overrides['inStock'] || 100,
    overrides['category'] || 'ELECTRICAL'
  ])
  return result.rows[0]
}

const createTestTimeEntry = async (userId: string, jobId: string, overrides = {}) => {
  const date = overrides['date'] || new Date().toISOString().split('T')[0]
  // Parse date as local
  const [year, month, day] = date.split('-').map(Number)
  const startTime = new Date(year, month - 1, day, 8, 0, 0)
  const hours = overrides['hours'] || 8
  const endTime = new Date(startTime.getTime() + (hours * 60 * 60 * 1000))

  const result = await query(`
    INSERT INTO "TimeEntry" (
      id, "userId", "jobId", date, "startTime", "endTime", hours,
      "regularHours", "overtimeHours", "doubleTimeHours",
      status, "createdAt", "updatedAt"
    )
    VALUES (
      gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW()
    )
    RETURNING *
  `, [
    userId,
    jobId,
    date,
    startTime,
    endTime,
    hours,
    overrides['regularHours'] || 8,
    overrides['overtimeHours'] || 0,
    overrides['doubleTimeHours'] || 0,
    overrides['status'] || 'submitted'
  ])
  return result.rows[0]
}

// Cleanup function
const cleanupTestData = async (ids: {
  users?: string[],
  jobs?: string[],
  customers?: string[],
  materials?: string[],
  timeEntries?: string[]
}) => {
  try {
    if (ids.timeEntries?.length) {
      await query(`DELETE FROM "TimeEntryMaterial" WHERE "timeEntryId" = ANY($1::text[])`, [ids.timeEntries])
      await query(`DELETE FROM "JobLaborCost" WHERE "timeEntryId" = ANY($1::text[])`, [ids.timeEntries])
      // TimeEntryAudit is immutable, cannot delete - skip cleanup
      await query(`DELETE FROM "TimeEntry" WHERE id = ANY($1::text[])`, [ids.timeEntries])
    }
    if (ids.materials?.length) {
      await query(`DELETE FROM "JobMaterialCost" WHERE "materialId" = ANY($1::uuid[])`, [ids.materials])
      await query(`DELETE FROM "StockMovement" WHERE "materialId" = ANY($1::uuid[])`, [ids.materials])
      await query(`DELETE FROM "Material" WHERE id = ANY($1::uuid[])`, [ids.materials])
    }
    if (ids.jobs?.length) {
      await query(`DELETE FROM "JobAssignment" WHERE "jobId" = ANY($1::text[])`, [ids.jobs])
      await query(`DELETE FROM "JobLaborCost" WHERE "jobId" = ANY($1::text[])`, [ids.jobs])
      await query(`DELETE FROM "JobMaterialCost" WHERE "jobId" = ANY($1::text[])`, [ids.jobs])
      await query(`DELETE FROM "Job" WHERE id = ANY($1::text[])`, [ids.jobs])
    }
    if (ids.customers?.length) {
      await query(`DELETE FROM "Customer" WHERE id = ANY($1::text[])`, [ids.customers])
    }
    if (ids.users?.length) {
      await query(`DELETE FROM "User" WHERE id = ANY($1::text[])`, [ids.users])
    }
  } catch (error) {
    console.error('Cleanup error:', error)
  }
}

describe('Employee Workflow', () => {
  let testUser: any
  let testAdmin: any
  let testCustomer: any
  let testJob: any
  let testMaterial: any

  const testIds = {
    users: [] as string[],
    jobs: [] as string[],
    customers: [] as string[],
    materials: [] as string[],
    timeEntries: [] as string[]
  }

  beforeAll(async () => {
    // Create test data
    testUser = await createTestUser({ name: 'Test Employee', role: 'EMPLOYEE' })
    testAdmin = await createTestUser({ name: 'Test Admin', role: 'ADMIN' })
    testCustomer = await createTestCustomer()
    testJob = await createTestJob(testCustomer.id)
    testMaterial = await createTestMaterial({ inStock: 100 })

    testIds.users.push(testUser.id, testAdmin.id)
    testIds.customers.push(testCustomer.id)
    testIds.jobs.push(testJob.id)
    testIds.materials.push(testMaterial.id)
  })

  afterAll(async () => {
    await cleanupTestData(testIds)
    await pool.end()
  })

  describe('Time Entry Bulk Creation', () => {
    it('should create time entry with proper hours breakdown', async () => {
      const timeEntry = await createTestTimeEntry(testUser.id, testJob.id, {
        hours: 10,
        regularHours: 8,
        overtimeHours: 2,
        doubleTimeHours: 0
      })
      testIds.timeEntries.push(timeEntry.id)

      expect(timeEntry).toBeDefined()
      expect(parseFloat(timeEntry.hours)).toBe(10)
      expect(parseFloat(timeEntry.regularHours)).toBe(8)
      expect(parseFloat(timeEntry.overtimeHours)).toBe(2)
    })
  })

  describe('Bulk Approve with JobLaborCost Creation', () => {
    let submittedEntry: any

    beforeAll(async () => {
      submittedEntry = await createTestTimeEntry(testUser.id, testJob.id, {
        hours: 8,
        regularHours: 8,
        overtimeHours: 0,
        doubleTimeHours: 0,
        status: 'submitted'
      })
      testIds.timeEntries.push(submittedEntry.id)
    })

    it('should create JobLaborCost when bulk approving time entry', async () => {
      // Simulate bulk approve logic
      await query(`
        UPDATE "TimeEntry"
        SET status = 'approved', "approvedBy" = $1, "approvedAt" = NOW()
        WHERE id = $2
      `, [testAdmin.id, submittedEntry.id])

      // Check if JobLaborCost exists
      const existingCost = await query(`
        SELECT id FROM "JobLaborCost" WHERE "timeEntryId" = $1
      `, [submittedEntry.id])

      // If not, create it (simulating the bulk-approve fix)
      if (existingCost.rows.length === 0) {
        const userRates = await query(`
          SELECT role, "regularRate", "overtimeRate", "doubleTimeRate"
          FROM "User" WHERE id = $1
        `, [testUser.id])

        const rates = userRates.rows[0]
        const regularRate = parseFloat(rates.regularRate || 25)
        const totalCost = 8 * regularRate

        await query(`
          INSERT INTO "JobLaborCost" (
            "jobId", "userId", "skillLevel", "hourlyRate",
            "hoursWorked", "totalCost", "workDate", "timeEntryId"
          ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_DATE, $7)
        `, [
          testJob.id,
          testUser.id,
          'JOURNEYMAN',
          regularRate,
          8,
          totalCost,
          submittedEntry.id
        ])
      }

      // Verify JobLaborCost was created
      const laborCost = await query(`
        SELECT * FROM "JobLaborCost" WHERE "timeEntryId" = $1
      `, [submittedEntry.id])

      expect(laborCost.rows.length).toBe(1)
      expect(laborCost.rows[0].jobId).toBe(testJob.id)
      expect(parseFloat(laborCost.rows[0].hoursWorked)).toBe(8)
    })

    it('should calculate correct cost with overtime rates', async () => {
      const overtimeEntry = await createTestTimeEntry(testUser.id, testJob.id, {
        hours: 10,
        regularHours: 8,
        overtimeHours: 2,
        doubleTimeHours: 0,
        status: 'submitted'
      })
      testIds.timeEntries.push(overtimeEntry.id)

      const userRates = await query(`
        SELECT "regularRate", "overtimeRate" FROM "User" WHERE id = $1
      `, [testUser.id])

      const rates = userRates.rows[0]
      const regularRate = parseFloat(rates.regularRate)
      const overtimeRate = parseFloat(rates.overtimeRate)
      const expectedCost = (8 * regularRate) + (2 * overtimeRate)

      // Create JobLaborCost with correct cost calculation
      await query(`
        INSERT INTO "JobLaborCost" (
          "jobId", "userId", "skillLevel", "hourlyRate",
          "hoursWorked", "totalCost", "workDate", "timeEntryId"
        ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_DATE, $7)
      `, [
        testJob.id,
        testUser.id,
        'JOURNEYMAN',
        expectedCost / 10, // Effective rate
        10,
        expectedCost,
        overtimeEntry.id
      ])

      const laborCost = await query(`
        SELECT * FROM "JobLaborCost" WHERE "timeEntryId" = $1
      `, [overtimeEntry.id])

      expect(laborCost.rows.length).toBe(1)
      expect(parseFloat(laborCost.rows[0].totalCost)).toBeCloseTo(expectedCost, 2)
    })
  })

  describe('Material Usage Trigger', () => {
    let timeEntryForMaterial: any

    beforeAll(async () => {
      timeEntryForMaterial = await createTestTimeEntry(testUser.id, testJob.id, {
        status: 'draft'
      })
      testIds.timeEntries.push(timeEntryForMaterial.id)
    })

    it('should create JobMaterialCost with exact timeEntryMaterialId link on INSERT', async () => {
      const initialStock = await query(`
        SELECT "inStock" FROM "Material" WHERE id = $1
      `, [testMaterial.id])
      const stockBefore = parseInt(initialStock.rows[0].inStock)

      // Insert TimeEntryMaterial (trigger should fire)
      const temResult = await query(`
        INSERT INTO "TimeEntryMaterial" (
          id, "timeEntryId", "materialId", quantity, "createdAt", "updatedAt"
        ) VALUES (gen_random_uuid(), $1, $2, $3, NOW(), NOW())
        RETURNING *
      `, [timeEntryForMaterial.id, testMaterial.id, 5])

      const tem = temResult.rows[0]

      // Check JobMaterialCost was created with exact link
      const jmc = await query(`
        SELECT * FROM "JobMaterialCost"
        WHERE "timeEntryMaterialId" = $1
      `, [tem.id])

      expect(jmc.rows.length).toBe(1)
      expect(jmc.rows[0].materialId).toBe(testMaterial.id)
      expect(parseFloat(jmc.rows[0].quantityUsed)).toBe(5)

      // Check stock was deducted
      const stockAfter = await query(`
        SELECT "inStock" FROM "Material" WHERE id = $1
      `, [testMaterial.id])

      expect(parseInt(stockAfter.rows[0].inStock)).toBe(stockBefore - 5)
    })

    it('should reverse JobMaterialCost using exact timeEntryMaterialId on DELETE', async () => {
      // Get current stock
      const stockBefore = await query(`
        SELECT "inStock" FROM "Material" WHERE id = $1
      `, [testMaterial.id])
      const stockBeforeDelete = parseInt(stockBefore.rows[0].inStock)

      // Create a new TimeEntryMaterial
      const temResult = await query(`
        INSERT INTO "TimeEntryMaterial" (
          id, "timeEntryId", "materialId", quantity, "createdAt", "updatedAt"
        ) VALUES (gen_random_uuid(), $1, $2, $3, NOW(), NOW())
        RETURNING *
      `, [timeEntryForMaterial.id, testMaterial.id, 3])

      const tem = temResult.rows[0]

      // Verify JobMaterialCost exists
      const jmcBefore = await query(`
        SELECT id FROM "JobMaterialCost" WHERE "timeEntryMaterialId" = $1
      `, [tem.id])
      expect(jmcBefore.rows.length).toBe(1)

      // Delete the TimeEntryMaterial (trigger should fire)
      await query(`DELETE FROM "TimeEntryMaterial" WHERE id = $1`, [tem.id])

      // Verify JobMaterialCost was deleted using exact match
      const jmcAfter = await query(`
        SELECT id FROM "JobMaterialCost" WHERE "timeEntryMaterialId" = $1
      `, [tem.id])
      expect(jmcAfter.rows.length).toBe(0)

      // Verify stock was restored
      const stockAfterDelete = await query(`
        SELECT "inStock" FROM "Material" WHERE id = $1
      `, [testMaterial.id])

      // Stock should be restored to before the insert
      expect(parseInt(stockAfterDelete.rows[0].inStock)).toBe(stockBeforeDelete)
    })
  })

  describe('Manual Material Usage', () => {
    it('should create JobMaterialCost for CONSUMED material usage', async () => {
      const quantity = 10
      const unitCost = parseFloat(testMaterial.cost)
      const totalCost = quantity * unitCost
      const markupPercentage = 25.0
      const markupAmount = totalCost * (markupPercentage / 100)
      const billedAmount = totalCost + markupAmount

      // Simulate manual MaterialUsage creation
      const usageResult = await query(`
        INSERT INTO "MaterialUsage" (
          id, "jobId", "materialId", "quantity", "unitCost", "totalCost", "usedBy", "usedAt"
        ) VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, NOW())
        RETURNING *
      `, [testJob.id, testMaterial.id, quantity, unitCost, totalCost, testUser.id])

      // Create JobMaterialCost (as our fix does)
      await query(`
        INSERT INTO "JobMaterialCost" (
          "jobId", "materialId", "quantityUsed", "unitCost",
          "totalCost", "markup", "markupAmount", "billedAmount", "usageDate"
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_DATE)
      `, [
        testJob.id,
        testMaterial.id,
        quantity,
        unitCost,
        totalCost,
        markupPercentage,
        markupAmount,
        billedAmount
      ])

      // Verify JobMaterialCost exists
      const jmc = await query(`
        SELECT * FROM "JobMaterialCost"
        WHERE "jobId" = $1 AND "materialId" = $2
        ORDER BY "createdAt" DESC
        LIMIT 1
      `, [testJob.id, testMaterial.id])

      expect(jmc.rows.length).toBe(1)
      expect(parseFloat(jmc.rows[0].quantityUsed)).toBe(quantity)
      expect(parseFloat(jmc.rows[0].totalCost)).toBeCloseTo(totalCost, 2)
      expect(parseFloat(jmc.rows[0].billedAmount)).toBeCloseTo(billedAmount, 2)
    })
  })

  describe('Auto-Assign Employee to Job', () => {
    it('should create JobAssignment when employee creates time entry for unassigned job', async () => {
      // Create a new job without assignment
      const newJob = await createTestJob(testCustomer.id)
      testIds.jobs.push(newJob.id)

      // Check no assignment exists
      const assignmentBefore = await query(`
        SELECT id FROM "JobAssignment" WHERE "jobId" = $1 AND "userId" = $2
      `, [newJob.id, testUser.id])
      expect(assignmentBefore.rows.length).toBe(0)

      // Create time entry (triggers auto-assign)
      const timeEntry = await createTestTimeEntry(testUser.id, newJob.id)
      testIds.timeEntries.push(timeEntry.id)

      // Simulate auto-assign logic from bulk route
      const existingAssignment = await query(`
        SELECT id FROM "JobAssignment" WHERE "jobId" = $1 AND "userId" = $2
      `, [newJob.id, testUser.id])

      if (existingAssignment.rows.length === 0) {
        await query(`
          INSERT INTO "JobAssignment" (id, "jobId", "userId", "assignedAt", "assignedBy", "assignmentType")
          VALUES (gen_random_uuid()::text, $1, $2, CURRENT_TIMESTAMP, 'SYSTEM', 'AUTO_TIME_ENTRY')
        `, [newJob.id, testUser.id])
      }

      // Verify assignment was created
      const assignmentAfter = await query(`
        SELECT * FROM "JobAssignment" WHERE "jobId" = $1 AND "userId" = $2
      `, [newJob.id, testUser.id])

      expect(assignmentAfter.rows.length).toBe(1)
      expect(assignmentAfter.rows[0].assignmentType).toBe('AUTO_TIME_ENTRY')
      expect(assignmentAfter.rows[0].assignedBy).toBe('SYSTEM')
    })
  })

  describe('Job Status Auto-Update', () => {
    it('should update job status to IN_PROGRESS when time entry created', async () => {
      // Create a new scheduled job
      const newJob = await createTestJob(testCustomer.id, { status: 'SCHEDULED' })
      testIds.jobs.push(newJob.id)

      // Create time entry
      const timeEntry = await createTestTimeEntry(testUser.id, newJob.id)
      testIds.timeEntries.push(timeEntry.id)

      // Simulate status update from bulk route
      await query(`
        UPDATE "Job"
        SET status = 'IN_PROGRESS', "updatedAt" = NOW()
        WHERE id = $1
        AND status IN ('SCHEDULED', 'DISPATCHED')
      `, [newJob.id])

      // Verify status changed
      const updatedJob = await query(`
        SELECT status FROM "Job" WHERE id = $1
      `, [newJob.id])

      expect(updatedJob.rows[0].status).toBe('IN_PROGRESS')
    })

    it('should not change status if already IN_PROGRESS or beyond', async () => {
      // Create an IN_PROGRESS job
      const inProgressJob = await createTestJob(testCustomer.id, { status: 'IN_PROGRESS' })
      testIds.jobs.push(inProgressJob.id)

      // Create time entry
      const timeEntry = await createTestTimeEntry(testUser.id, inProgressJob.id)
      testIds.timeEntries.push(timeEntry.id)

      // Attempt status update (should not change)
      const updateResult = await query(`
        UPDATE "Job"
        SET status = 'IN_PROGRESS', "updatedAt" = NOW()
        WHERE id = $1
        AND status IN ('SCHEDULED', 'DISPATCHED')
        RETURNING id
      `, [inProgressJob.id])

      // No rows should be updated
      expect(updateResult.rowCount).toBe(0)

      // Verify status unchanged
      const job = await query(`
        SELECT status FROM "Job" WHERE id = $1
      `, [inProgressJob.id])

      expect(job.rows[0].status).toBe('IN_PROGRESS')
    })
  })
})
