import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/db'
import { z } from 'zod'

const reportsSchema = z.object({
  reportType: z.enum([
    'PAYROLL_SUMMARY',
    'EMPLOYEE_DETAIL',
    'OVERTIME_ANALYSIS',
    'BREAK_ANALYSIS',
    'JOB_COST_ANALYSIS',
    'APPROVAL_STATUS',
    'PRODUCTIVITY_METRICS'
  ]),
  startDate: z.string(),
  endDate: z.string(),
  userIds: z.array(z.string()).optional(),
  jobIds: z.array(z.string()).optional(),
  includeBreaks: z.boolean().default(true),
  groupBy: z.enum(['employee', 'job', 'date', 'department']).optional()
})

// GET - Generate payroll reports
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const reportType = searchParams.get('reportType') || 'PAYROLL_SUMMARY'
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const userIds = searchParams.get('userIds')?.split(',').filter(Boolean)
    const jobIds = searchParams.get('jobIds')?.split(',').filter(Boolean)
    const includeBreaks = searchParams.get('includeBreaks') !== 'false'
    const groupBy = searchParams.get('groupBy')
    
    if (!startDate || !endDate) {
      return NextResponse.json(
        { success: false, error: 'startDate and endDate are required' },
        { status: 400 }
      )
    }
    
    const data = {
      reportType: reportType as any,
      startDate,
      endDate,
      userIds,
      jobIds,
      includeBreaks,
      groupBy: groupBy as any
    }
    
    const reportData = await generateReport(data)
    
    return NextResponse.json({
      success: true,
      reportType,
      generatedAt: new Date().toISOString(),
      period: { startDate, endDate },
      ...reportData
    })
    
  } catch (error) {
    console.error('Error generating report:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to generate report' },
      { status: 500 }
    )
  }
}

// POST - Generate custom reports with complex parameters
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = reportsSchema.parse(body)
    
    const reportData = await generateReport(data)
    
    return NextResponse.json({
      success: true,
      reportType: data.reportType,
      generatedAt: new Date().toISOString(),
      period: { startDate: data.startDate, endDate: data.endDate },
      ...reportData
    })
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid data', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Error generating custom report:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to generate custom report' },
      { status: 500 }
    )
  }
}

// Main report generation function
async function generateReport(data: any) {
  const client = await pool.connect()
  
  try {
    switch (data.reportType) {
      case 'PAYROLL_SUMMARY':
        return await generatePayrollSummary(client, data)
      case 'EMPLOYEE_DETAIL':
        return await generateEmployeeDetail(client, data)
      case 'OVERTIME_ANALYSIS':
        return await generateOvertimeAnalysis(client, data)
      case 'BREAK_ANALYSIS':
        return await generateBreakAnalysis(client, data)
      case 'JOB_COST_ANALYSIS':
        return await generateJobCostAnalysis(client, data)
      case 'APPROVAL_STATUS':
        return await generateApprovalStatus(client, data)
      case 'PRODUCTIVITY_METRICS':
        return await generateProductivityMetrics(client, data)
      default:
        throw new Error('Invalid report type')
    }
  } finally {
    client.release()
  }
}

// Payroll summary report
async function generatePayrollSummary(client: any, data: any) {
  const result = await client.query(`
    SELECT 
      u.id as "userId",
      u.name as "employeeName",
      u.email as "employeeEmail",
      u.role,
      COUNT(te.id) as "totalEntries",
      COALESCE(SUM(te."totalHours"), 0) as "totalHours",
      COALESCE(SUM(te."regularHours"), 0) as "regularHours", 
      COALESCE(SUM(te."overtimeHours"), 0) as "overtimeHours",
      COALESCE(SUM(te."totalPay"), 0) as "totalPay",
      COALESCE(SUM(te."breakMinutes"), 0) as "totalBreakMinutes",
      COALESCE(AVG(te."appliedRegularRate"), 0) as "averageRate",
      COUNT(DISTINCT DATE(te."clockInTime")) as "daysWorked",
      COUNT(DISTINCT te."jobId") as "jobsWorked"
    FROM "User" u
    LEFT JOIN "TimeEntry" te ON u.id = te."userId" 
      AND te.status IN ('COMPLETED', 'APPROVED', 'PAID')
      AND DATE(te."clockInTime") BETWEEN $1::date AND $2::date
    WHERE ($3::text[] IS NULL OR u.id = ANY($3::text[]))
    GROUP BY u.id, u.name, u.email, u.role
    HAVING COUNT(te.id) > 0 OR $3::text[] IS NOT NULL
    ORDER BY u.name
  `, [data.startDate, data.endDate, data.userIds])
  
  const summary = {
    totalEmployees: result.rows.length,
    totalHours: result.rows.reduce((sum: number, row: any) => sum + parseFloat(row.totalHours), 0),
    totalPay: result.rows.reduce((sum: number, row: any) => sum + parseFloat(row.totalPay), 0),
    totalOvertimeHours: result.rows.reduce((sum: number, row: any) => sum + parseFloat(row.overtimeHours), 0),
    averageHoursPerEmployee: result.rows.length > 0 ? 
      result.rows.reduce((sum: number, row: any) => sum + parseFloat(row.totalHours), 0) / result.rows.length : 0
  }
  
  return {
    summary,
    employees: result.rows.map((row: any) => ({
      userId: row.userId,
      employeeName: row.employeeName,
      employeeEmail: row.employeeEmail,
      role: row.role,
      totalEntries: parseInt(row.totalEntries),
      totalHours: parseFloat(row.totalHours),
      regularHours: parseFloat(row.regularHours),
      overtimeHours: parseFloat(row.overtimeHours),
      totalPay: parseFloat(row.totalPay),
      totalBreakMinutes: parseFloat(row.totalBreakMinutes),
      averageRate: parseFloat(row.averageRate),
      daysWorked: parseInt(row.daysWorked),
      jobsWorked: parseInt(row.jobsWorked)
    }))
  }
}

// Employee detail report
async function generateEmployeeDetail(client: any, data: any) {
  const result = await client.query(`
    SELECT 
      te.*,
      u.name as "employeeName",
      j."jobNumber",
      j.title as "jobTitle",
      -- Break details
      (
        SELECT json_agg(
          json_build_object(
            'breakType', teb."breakType",
            'startTime', teb."startTime",
            'endTime', teb."endTime",
            'durationMinutes', teb."durationMinutes",
            'isPaid', teb."isPaid",
            'isDeducted', teb."isDeducted"
          )
        )
        FROM "TimeEntryBreak" teb 
        WHERE teb."timeEntryId" = te.id AND teb."endTime" IS NOT NULL
      ) as "breaks"
    FROM "TimeEntry" te
    JOIN "User" u ON te."userId" = u.id
    LEFT JOIN "Job" j ON te."jobId" = j.id
    WHERE te.status IN ('COMPLETED', 'APPROVED', 'PAID')
      AND DATE(te."clockInTime") BETWEEN $1::date AND $2::date
      AND ($3::text[] IS NULL OR te."userId" = ANY($3::text[]))
      AND ($4::text[] IS NULL OR te."jobId" = ANY($4::text[]))
    ORDER BY u.name, te."clockInTime"
  `, [data.startDate, data.endDate, data.userIds, data.jobIds])
  
  return {
    entries: result.rows.map((row: any) => ({
      id: row.id,
      userId: row.userId,
      employeeName: row.employeeName,
      jobId: row.jobId,
      jobNumber: row.jobNumber,
      jobTitle: row.jobTitle,
      workDate: row.clockInTime ? new Date(row.clockInTime).toDateString() : null,
      clockInTime: row.clockInTime,
      clockOutTime: row.clockOutTime,
      totalHours: parseFloat(row.totalHours || 0),
      regularHours: parseFloat(row.regularHours || 0),
      overtimeHours: parseFloat(row.overtimeHours || 0),
      totalPay: parseFloat(row.totalPay || 0),
      appliedRegularRate: parseFloat(row.appliedRegularRate || 0),
      breakMinutes: parseFloat(row.breakMinutes || 0),
      workDescription: row.workDescription,
      breaks: row.breaks || []
    }))
  }
}

// Overtime analysis report
async function generateOvertimeAnalysis(client: any, data: any) {
  const result = await client.query(`
    SELECT 
      u.name as "employeeName",
      COUNT(te.id) as "totalEntries",
      COUNT(CASE WHEN te."overtimeHours" > 0 THEN 1 END) as "overtimeEntries",
      COALESCE(SUM(te."overtimeHours"), 0) as "totalOvertimeHours",
      COALESCE(MAX(te."overtimeHours"), 0) as "maxOvertimeDay",
      COALESCE(AVG(CASE WHEN te."overtimeHours" > 0 THEN te."overtimeHours" END), 0) as "avgOvertimeWhenWorked",
      COALESCE(SUM(te."overtimeHours" * te."appliedRegularRate" * 1.5), 0) as "overtimePay",
      COUNT(DISTINCT DATE(te."clockInTime")) as "daysWorked",
      COUNT(DISTINCT CASE WHEN te."overtimeHours" > 0 THEN DATE(te."clockInTime") END) as "overtimeDays"
    FROM "User" u
    JOIN "TimeEntry" te ON u.id = te."userId"
    WHERE te.status IN ('COMPLETED', 'APPROVED', 'PAID')
      AND DATE(te."clockInTime") BETWEEN $1::date AND $2::date
      AND ($3::text[] IS NULL OR te."userId" = ANY($3::text[]))
    GROUP BY u.id, u.name
    ORDER BY "totalOvertimeHours" DESC
  `, [data.startDate, data.endDate, data.userIds])
  
  const summary = {
    totalOvertimeHours: result.rows.reduce((sum: number, row: any) => sum + parseFloat(row.totalOvertimeHours), 0),
    totalOvertimePay: result.rows.reduce((sum: number, row: any) => sum + parseFloat(row.overtimePay), 0),
    employeesWithOvertime: result.rows.filter((row: any) => parseFloat(row.totalOvertimeHours) > 0).length,
    averageOvertimePerEmployee: result.rows.length > 0 ? 
      result.rows.reduce((sum: number, row: any) => sum + parseFloat(row.totalOvertimeHours), 0) / result.rows.length : 0
  }
  
  return {
    summary,
    employees: result.rows.map((row: any) => ({
      employeeName: row.employeeName,
      totalEntries: parseInt(row.totalEntries),
      overtimeEntries: parseInt(row.overtimeEntries),
      totalOvertimeHours: parseFloat(row.totalOvertimeHours),
      maxOvertimeDay: parseFloat(row.maxOvertimeDay),
      avgOvertimeWhenWorked: parseFloat(row.avgOvertimeWhenWorked),
      overtimePay: parseFloat(row.overtimePay),
      daysWorked: parseInt(row.daysWorked),
      overtimeDays: parseInt(row.overtimeDays),
      overtimePercentage: parseInt(row.daysWorked) > 0 ? 
        (parseInt(row.overtimeDays) / parseInt(row.daysWorked)) * 100 : 0
    }))
  }
}

// Break analysis report
async function generateBreakAnalysis(client: any, data: any) {
  const result = await client.query(`
    SELECT 
      u.name as "employeeName",
      teb."breakType",
      COUNT(teb.id) as "breakCount",
      COALESCE(SUM(teb."durationMinutes"), 0) as "totalBreakMinutes",
      COALESCE(AVG(teb."durationMinutes"), 0) as "avgBreakDuration",
      COALESCE(MAX(teb."durationMinutes"), 0) as "maxBreakDuration",
      COUNT(CASE WHEN teb."isPaid" THEN 1 END) as "paidBreaks",
      COUNT(CASE WHEN teb."isDeducted" THEN 1 END) as "deductedBreaks"
    FROM "User" u
    JOIN "TimeEntry" te ON u.id = te."userId"
    JOIN "TimeEntryBreak" teb ON te.id = teb."timeEntryId"
    WHERE te.status IN ('COMPLETED', 'APPROVED', 'PAID')
      AND DATE(te."clockInTime") BETWEEN $1::date AND $2::date
      AND ($3::text[] IS NULL OR te."userId" = ANY($3::text[]))
      AND teb."endTime" IS NOT NULL
    GROUP BY u.id, u.name, teb."breakType"
    ORDER BY u.name, teb."breakType"
  `, [data.startDate, data.endDate, data.userIds])
  
  return {
    breakAnalysis: result.rows.map((row: any) => ({
      employeeName: row.employeeName,
      breakType: row.breakType,
      breakCount: parseInt(row.breakCount),
      totalBreakMinutes: parseFloat(row.totalBreakMinutes),
      avgBreakDuration: parseFloat(row.avgBreakDuration),
      maxBreakDuration: parseFloat(row.maxBreakDuration),
      paidBreaks: parseInt(row.paidBreaks),
      deductedBreaks: parseInt(row.deductedBreaks)
    }))
  }
}

// Job cost analysis report  
async function generateJobCostAnalysis(client: any, data: any) {
  const result = await client.query(`
    SELECT 
      j.id as "jobId",
      j."jobNumber",
      j.title as "jobTitle",
      COUNT(te.id) as "timeEntries",
      COUNT(DISTINCT te."userId") as "employeeCount",
      COALESCE(SUM(te."totalHours"), 0) as "totalHours",
      COALESCE(SUM(te."regularHours"), 0) as "regularHours",
      COALESCE(SUM(te."overtimeHours"), 0) as "overtimeHours", 
      COALESCE(SUM(te."totalPay"), 0) as "laborCost",
      COALESCE(AVG(te."appliedRegularRate"), 0) as "avgRate",
      COUNT(DISTINCT DATE(te."clockInTime")) as "workDays"
    FROM "Job" j
    JOIN "TimeEntry" te ON j.id = te."jobId"
    WHERE te.status IN ('COMPLETED', 'APPROVED', 'PAID')
      AND DATE(te."clockInTime") BETWEEN $1::date AND $2::date
      AND ($3::text[] IS NULL OR j.id = ANY($3::text[]))
    GROUP BY j.id, j."jobNumber", j.title
    ORDER BY "laborCost" DESC
  `, [data.startDate, data.endDate, data.jobIds])
  
  return {
    jobs: result.rows.map((row: any) => ({
      jobId: row.jobId,
      jobNumber: row.jobNumber,
      jobTitle: row.jobTitle,
      timeEntries: parseInt(row.timeEntries),
      employeeCount: parseInt(row.employeeCount),
      totalHours: parseFloat(row.totalHours),
      regularHours: parseFloat(row.regularHours),
      overtimeHours: parseFloat(row.overtimeHours),
      laborCost: parseFloat(row.laborCost),
      avgRate: parseFloat(row.avgRate),
      workDays: parseInt(row.workDays),
      avgHoursPerDay: parseInt(row.workDays) > 0 ? parseFloat(row.totalHours) / parseInt(row.workDays) : 0,
      costPerHour: parseFloat(row.totalHours) > 0 ? parseFloat(row.laborCost) / parseFloat(row.totalHours) : 0
    }))
  }
}

// Approval status report
async function generateApprovalStatus(client: any, data: any) {
  const result = await client.query(`
    SELECT 
      te.status,
      COUNT(te.id) as "entryCount",
      COALESCE(SUM(te."totalHours"), 0) as "totalHours",
      COALESCE(SUM(te."totalPay"), 0) as "totalPay",
      COUNT(DISTINCT te."userId") as "employeeCount"
    FROM "TimeEntry" te
    WHERE DATE(te."clockInTime") BETWEEN $1::date AND $2::date
      AND ($3::text[] IS NULL OR te."userId" = ANY($3::text[]))
    GROUP BY te.status
    ORDER BY te.status
  `, [data.startDate, data.endDate, data.userIds])
  
  return {
    statusBreakdown: result.rows.map((row: any) => ({
      status: row.status,
      entryCount: parseInt(row.entryCount),
      totalHours: parseFloat(row.totalHours),
      totalPay: parseFloat(row.totalPay),
      employeeCount: parseInt(row.employeeCount)
    }))
  }
}

// Productivity metrics report
async function generateProductivityMetrics(client: any, data: any) {
  const result = await client.query(`
    SELECT 
      u.name as "employeeName",
      COUNT(te.id) as "totalEntries",
      COALESCE(SUM(te."totalHours"), 0) as "totalHours",
      COUNT(DISTINCT DATE(te."clockInTime")) as "daysWorked",
      COALESCE(AVG(te."totalHours"), 0) as "avgHoursPerEntry",
      COALESCE(SUM(te."totalHours"), 0) / NULLIF(COUNT(DISTINCT DATE(te."clockInTime")), 0) as "avgHoursPerDay",
      COUNT(DISTINCT te."jobId") as "uniqueJobs",
      COALESCE(SUM(te."totalPay"), 0) / NULLIF(SUM(te."totalHours"), 0) as "avgPayPerHour"
    FROM "User" u
    JOIN "TimeEntry" te ON u.id = te."userId"
    WHERE te.status IN ('COMPLETED', 'APPROVED', 'PAID')
      AND DATE(te."clockInTime") BETWEEN $1::date AND $2::date
      AND ($3::text[] IS NULL OR te."userId" = ANY($3::text[]))
    GROUP BY u.id, u.name
    ORDER BY "totalHours" DESC
  `, [data.startDate, data.endDate, data.userIds])
  
  return {
    metrics: result.rows.map((row: any) => ({
      employeeName: row.employeeName,
      totalEntries: parseInt(row.totalEntries),
      totalHours: parseFloat(row.totalHours),
      daysWorked: parseInt(row.daysWorked),
      avgHoursPerEntry: parseFloat(row.avgHoursPerEntry),
      avgHoursPerDay: parseFloat(row.avgHoursPerDay || 0),
      uniqueJobs: parseInt(row.uniqueJobs),
      avgPayPerHour: parseFloat(row.avgPayPerHour || 0),
      productivity: {
        entriesPerDay: parseInt(row.daysWorked) > 0 ? parseInt(row.totalEntries) / parseInt(row.daysWorked) : 0,
        jobVariety: parseInt(row.uniqueJobs),
        consistency: parseFloat(row.avgHoursPerEntry) // Lower variance = more consistent
      }
    }))
  }
}