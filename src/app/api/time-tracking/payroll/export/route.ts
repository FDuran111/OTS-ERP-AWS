import { NextRequest, NextResponse } from 'next/server'
import { Pool } from 'pg'
import { z } from 'zod'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

const payrollExportSchema = z.object({
  startDate: z.string(),
  endDate: z.string(),
  userIds: z.array(z.string()).optional(),
  format: z.enum(['json', 'csv']).default('json'),
  includeBreaks: z.boolean().default(true),
  groupBy: z.enum(['employee', 'job', 'date']).default('employee')
})

// POST - Generate payroll export
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = payrollExportSchema.parse(body)
    
    const client = await pool.connect()
    
    try {
      // Build dynamic query based on filters
      let query = `
        SELECT 
          te.id as "timeEntryId",
          te."userId",
          u.name as "employeeName",
          u.email as "employeeEmail",
          te."jobId",
          j."jobNumber",
          j.title as "jobTitle",
          j.description as "jobDescription",
          te."clockInTime",
          te."clockOutTime",
          te."totalHours",
          te."regularHours",
          te."overtimeHours",
          te."appliedRegularRate",
          te."totalPay",
          te."breakMinutes",
          te."workDescription",
          te.status,
          DATE(te."clockInTime") as "workDate",
          
          -- Calculate overtime rate
          CASE 
            WHEN te."appliedRegularRate" IS NOT NULL 
            THEN te."appliedRegularRate" * 1.5
            ELSE 37.50  -- Default OT rate
          END as "overtimeRate",
          
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
          AND DATE(te."clockInTime") >= $1::date
          AND DATE(te."clockInTime") <= $2::date
      `
      
      const params: any[] = [data.startDate, data.endDate]
      let paramIndex = 3
      
      // Add user filter if specified
      if (data.userIds && data.userIds.length > 0) {
        query += ` AND te."userId" = ANY($${paramIndex}::text[])`
        params.push(data.userIds)
        paramIndex++
      }
      
      query += ` ORDER BY u.name, DATE(te."clockInTime"), te."clockInTime"`
      
      const result = await client.query(query, params)
      
      // Process and group the data
      const timeEntries = result.rows.map(row => ({
        timeEntryId: row.timeEntryId,
        userId: row.userId,
        employeeName: row.employeeName,
        employeeEmail: row.employeeEmail,
        jobId: row.jobId,
        jobNumber: row.jobNumber,
        jobTitle: row.jobTitle,
        jobDescription: row.jobDescription,
        workDate: row.workDate,
        clockInTime: row.clockInTime,
        clockOutTime: row.clockOutTime,
        totalHours: parseFloat(row.totalHours || 0),
        regularHours: parseFloat(row.regularHours || 0),
        overtimeHours: parseFloat(row.overtimeHours || 0),
        appliedRegularRate: parseFloat(row.appliedRegularRate || 0),
        overtimeRate: parseFloat(row.overtimeRate || 0),
        totalPay: parseFloat(row.totalPay || 0),
        breakMinutes: parseFloat(row.breakMinutes || 0),
        workDescription: row.workDescription,
        status: row.status,
        breaks: row.breaks || []
      }))
      
      // Group data based on groupBy parameter
      let groupedData: any = {}
      
      switch (data.groupBy) {
        case 'employee':
          groupedData = timeEntries.reduce((acc, entry) => {
            const key = entry.userId
            if (!acc[key]) {
              acc[key] = {
                userId: entry.userId,
                employeeName: entry.employeeName,
                employeeEmail: entry.employeeEmail,
                totalEntries: 0,
                totalHours: 0,
                totalRegularHours: 0,
                totalOvertimeHours: 0,
                totalPay: 0,
                totalBreakMinutes: 0,
                entries: []
              }
            }
            
            acc[key].totalEntries++
            acc[key].totalHours += entry.totalHours
            acc[key].totalRegularHours += entry.regularHours
            acc[key].totalOvertimeHours += entry.overtimeHours
            acc[key].totalPay += entry.totalPay
            acc[key].totalBreakMinutes += entry.breakMinutes
            acc[key].entries.push(entry)
            
            return acc
          }, {})
          break
          
        case 'job':
          groupedData = timeEntries.reduce((acc, entry) => {
            const key = entry.jobId || 'no-job'
            if (!acc[key]) {
              acc[key] = {
                jobId: entry.jobId,
                jobNumber: entry.jobNumber,
                jobTitle: entry.jobTitle,
                totalEntries: 0,
                totalHours: 0,
                totalRegularHours: 0,
                totalOvertimeHours: 0,
                totalPay: 0,
                totalBreakMinutes: 0,
                uniqueEmployees: new Set(),
                entries: []
              }
            }
            
            acc[key].totalEntries++
            acc[key].totalHours += entry.totalHours
            acc[key].totalRegularHours += entry.regularHours
            acc[key].totalOvertimeHours += entry.overtimeHours
            acc[key].totalPay += entry.totalPay
            acc[key].totalBreakMinutes += entry.breakMinutes
            acc[key].uniqueEmployees.add(entry.employeeName)
            acc[key].entries.push(entry)
            
            return acc
          }, {})
          
          // Convert Set to count
          Object.values(groupedData).forEach((group: any) => {
            group.employeeCount = group.uniqueEmployees.size
            delete group.uniqueEmployees
          })
          break
          
        case 'date':
          groupedData = timeEntries.reduce((acc, entry) => {
            const key = entry.workDate
            if (!acc[key]) {
              acc[key] = {
                workDate: entry.workDate,
                totalEntries: 0,
                totalHours: 0,
                totalRegularHours: 0,
                totalOvertimeHours: 0,
                totalPay: 0,
                totalBreakMinutes: 0,
                uniqueEmployees: new Set(),
                entries: []
              }
            }
            
            acc[key].totalEntries++
            acc[key].totalHours += entry.totalHours
            acc[key].totalRegularHours += entry.regularHours
            acc[key].totalOvertimeHours += entry.overtimeHours
            acc[key].totalPay += entry.totalPay
            acc[key].totalBreakMinutes += entry.breakMinutes
            acc[key].uniqueEmployees.add(entry.employeeName)
            acc[key].entries.push(entry)
            
            return acc
          }, {})
          
          // Convert Set to count
          Object.values(groupedData).forEach((group: any) => {
            group.employeeCount = group.uniqueEmployees.size
            delete group.uniqueEmployees
          })
          break
      }
      
      // Calculate summary totals
      const summary = {
        periodStart: data.startDate,
        periodEnd: data.endDate,
        totalEmployees: [...new Set(timeEntries.map(e => e.userId))].length,
        totalEntries: timeEntries.length,
        totalHours: timeEntries.reduce((sum, e) => sum + e.totalHours, 0),
        totalRegularHours: timeEntries.reduce((sum, e) => sum + e.regularHours, 0),
        totalOvertimeHours: timeEntries.reduce((sum, e) => sum + e.overtimeHours, 0),
        totalPay: timeEntries.reduce((sum, e) => sum + e.totalPay, 0),
        totalBreakMinutes: timeEntries.reduce((sum, e) => sum + e.breakMinutes, 0),
        averageHoursPerEmployee: timeEntries.length > 0 ? 
          timeEntries.reduce((sum, e) => sum + e.totalHours, 0) / [...new Set(timeEntries.map(e => e.userId))].length : 0
      }
      
      // Format for CSV if requested
      if (data.format === 'csv') {
        let csvContent = ''
        
        if (data.groupBy === 'employee') {
          // Employee summary CSV
          csvContent = 'Employee Name,Employee Email,Total Hours,Regular Hours,Overtime Hours,Total Pay,Break Minutes,Entries\n'
          Object.values(groupedData).forEach((emp: any) => {
            csvContent += `"${emp.employeeName}","${emp.employeeEmail}",${emp.totalHours.toFixed(2)},${emp.totalRegularHours.toFixed(2)},${emp.totalOvertimeHours.toFixed(2)},${emp.totalPay.toFixed(2)},${emp.totalBreakMinutes.toFixed(0)},${emp.totalEntries}\n`
          })
          
          csvContent += '\n\nDetailed Time Entries:\n'
          csvContent += 'Employee Name,Work Date,Clock In,Clock Out,Job Number,Total Hours,Regular Hours,Overtime Hours,Total Pay,Break Minutes,Description\n'
          
          timeEntries.forEach(entry => {
            csvContent += `"${entry.employeeName}","${entry.workDate}","${new Date(entry.clockInTime).toLocaleString()}","${entry.clockOutTime ? new Date(entry.clockOutTime).toLocaleString() : ''}","${entry.jobNumber || ''}",${entry.totalHours.toFixed(2)},${entry.regularHours.toFixed(2)},${entry.overtimeHours.toFixed(2)},${entry.totalPay.toFixed(2)},${entry.breakMinutes.toFixed(0)},"${entry.workDescription || ''}"\n`
          })
        }
        
        return new NextResponse(csvContent, {
          headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename="payroll-export-${data.startDate}-to-${data.endDate}.csv"`
          }
        })
      }
      
      // Return JSON format
      return NextResponse.json({
        success: true,
        summary,
        data: groupedData,
        rawEntries: data.groupBy === 'employee' ? undefined : timeEntries, // Include raw data for non-employee grouping
        exportMetadata: {
          generatedAt: new Date().toISOString(),
          startDate: data.startDate,
          endDate: data.endDate,
          format: data.format,
          groupBy: data.groupBy,
          includeBreaks: data.includeBreaks,
          filteredUserIds: data.userIds
        }
      })
      
    } finally {
      client.release()
    }
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid data', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Error generating payroll export:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to generate payroll export' },
      { status: 500 }
    )
  }
}