import { quickbooksClient } from '@/lib/quickbooks-client'
import { query } from '@/lib/db'

export interface SyncResult {
  success: boolean
  created: number
  updated: number
  errors: number
  errorDetails: string[]
}

export class QuickBooksSync {
  
  /**
   * Sync customers from our system to QuickBooks
   */
  async syncCustomersToQuickBooks(): Promise<SyncResult> {
    const result: SyncResult = {
      success: false,
      created: 0,
      updated: 0,
      errors: 0,
      errorDetails: []
    }

    try {
      const connection = await quickbooksClient.getActiveConnection()
      if (!connection) {
        throw new Error('No active QuickBooks connection')
      }

      // Get customers that need to be synced to QuickBooks
      const customersToSync = await query(`
        SELECT 
          c.id,
          c."companyName",
          c."firstName",
          c."lastName",
          c.email,
          c.phone,
          c.street || ' ' || c.address as address,
          c.city,
          c.state,
          c.zip,
          qbm."quickbooksId",
          qbm."syncVersion"
        FROM "Customer" c
        LEFT JOIN "QuickBooksMapping" qbm ON c.id = qbm."localEntityId" 
          AND qbm."localEntityType" = 'CUSTOMER'
        WHERE qbm.id IS NULL OR qbm."syncStatus" = 'PENDING'
        ORDER BY c."createdAt"
        LIMIT 50
      `)

      for (const customer of customersToSync.rows) {
        try {
          await this.syncSingleCustomerToQuickBooks(connection, customer)
          result.created++
        } catch (error) {
          result.errors++
          result.errorDetails.push(`Customer ${customer.companyName || customer.firstName + ' ' + customer.lastName}: ${error instanceof Error ? error.message : 'Unknown error'}`)
          
          // Log sync error
          await this.logSyncError('CUSTOMER', customer.id, error)
        }
      }

      result.success = result.errors === 0
      return result

    } catch (error) {
      result.errors++
      result.errorDetails.push(error instanceof Error ? error.message : 'Unknown error')
      return result
    }
  }

  /**
   * Sync a single customer to QuickBooks
   */
  private async syncSingleCustomerToQuickBooks(connection: any, customer: any) {
    const customerData = {
      Name: customer.companyName || `${customer.firstName} ${customer.lastName}`.trim(),
      CompanyName: customer.companyName,
      GivenName: customer.firstName,
      FamilyName: customer.lastName,
      PrimaryEmailAddr: customer.email ? { Address: customer.email } : undefined,
      PrimaryPhone: customer.phone ? { FreeFormNumber: customer.phone } : undefined,
      BillAddr: customer.address ? {
        Line1: customer.address,
        City: customer.city,
        CountrySubDivisionCode: customer.state,
        PostalCode: customer.zip,
        Country: 'US'
      } : undefined
    }

    // Remove undefined fields
    Object.keys(customerData).forEach(key => 
      customerData[key as keyof typeof customerData] === undefined && 
      delete customerData[key as keyof typeof customerData]
    )

    let qbCustomer
    if (customer.quickbooksId) {
      // Update existing customer
      customerData.Id = customer.quickbooksId
      customerData.SyncToken = customer.syncVersion
      qbCustomer = await quickbooksClient.updateCustomer(connection, customerData)
    } else {
      // Create new customer
      qbCustomer = await quickbooksClient.createCustomer(connection, customerData)
    }

    const qbCustomerData = qbCustomer.QueryResponse?.Customer?.[0] || qbCustomer.Customer

    // Create or update mapping
    if (customer.quickbooksId) {
      await query(`
        UPDATE "QuickBooksMapping" 
        SET 
          "syncVersion" = $1,
          "syncStatus" = 'SYNCED',
          "lastSyncAt" = NOW(),
          "syncErrors" = '[]',
          "updatedAt" = NOW()
        WHERE "localEntityType" = 'CUSTOMER' AND "localEntityId" = $2
      `, [qbCustomerData.SyncToken, customer.id])
    } else {
      await query(`
        INSERT INTO "QuickBooksMapping" (
          "localEntityType", "localEntityId", "quickbooksId", "quickbooksType",
          "syncVersion", "syncStatus"
        ) VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        'CUSTOMER',
        customer.id,
        qbCustomerData.Id,
        'Customer',
        qbCustomerData.SyncToken,
        'SYNCED'
      ])
    }

    // Log successful sync
    await query(`
      INSERT INTO "QuickBooksSyncLog" (
        "operationType", "entityType", "localEntityId", "quickbooksId",
        "direction", "status", "requestData", "responseData", "completedAt"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
    `, [
      customer.quickbooksId ? 'UPDATE' : 'CREATE',
      'CUSTOMER',
      customer.id,
      qbCustomerData.Id,
      'TO_QB',
      'SUCCESS',
      JSON.stringify(customerData),
      JSON.stringify(qbCustomerData)
    ])
  }

  /**
   * Sync customers from QuickBooks to our system
   */
  async syncCustomersFromQuickBooks(): Promise<SyncResult> {
    const result: SyncResult = {
      success: false,
      created: 0,
      updated: 0,
      errors: 0,
      errorDetails: []
    }

    try {
      const connection = await quickbooksClient.getActiveConnection()
      if (!connection) {
        throw new Error('No active QuickBooks connection')
      }

      // Get all customers from QuickBooks
      const qbCustomersResponse = await quickbooksClient.getCustomers(connection)
      const qbCustomers = qbCustomersResponse.QueryResponse?.Customer || []

      for (const qbCustomer of qbCustomers) {
        try {
          const existingMapping = await query(`
            SELECT * FROM "QuickBooksMapping" 
            WHERE "quickbooksId" = $1 AND "quickbooksType" = 'Customer'
          `, [qbCustomer.Id])

          if (existingMapping.rows.length === 0) {
            // Create new customer in our system
            await this.createCustomerFromQuickBooks(qbCustomer)
            result.created++
          } else {
            // Update existing customer if needed
            const mapping = existingMapping.rows[0]
            if (mapping.syncVersion !== qbCustomer.SyncToken) {
              await this.updateCustomerFromQuickBooks(qbCustomer, mapping.localEntityId)
              result.updated++
            }
          }
        } catch (error) {
          result.errors++
          result.errorDetails.push(`QuickBooks Customer ${qbCustomer.Name}: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
      }

      result.success = result.errors === 0
      return result

    } catch (error) {
      result.errors++
      result.errorDetails.push(error instanceof Error ? error.message : 'Unknown error')
      return result
    }
  }

  /**
   * Create customer in our system from QuickBooks data
   */
  private async createCustomerFromQuickBooks(qbCustomer: any) {
    const customerData = {
      companyName: qbCustomer.CompanyName || qbCustomer.Name,
      firstName: qbCustomer.GivenName,
      lastName: qbCustomer.FamilyName,
      email: qbCustomer.PrimaryEmailAddr?.Address,
      phone: qbCustomer.PrimaryPhone?.FreeFormNumber,
      street: qbCustomer.BillAddr?.Line1,
      address: qbCustomer.BillAddr?.Line1,
      city: qbCustomer.BillAddr?.City,
      state: qbCustomer.BillAddr?.CountrySubDivisionCode,
      zip: qbCustomer.BillAddr?.PostalCode,
      quickbooksId: qbCustomer.Id
    }

    // Create customer
    const result = await query(`
      INSERT INTO "Customer" (
        "companyName", "firstName", "lastName", "email", "phone",
        "street", "address", "city", "state", "zip", "quickbooksId"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING id
    `, [
      customerData.companyName,
      customerData.firstName,
      customerData.lastName,
      customerData.email,
      customerData.phone,
      customerData.street,
      customerData.address,
      customerData.city,
      customerData.state,
      customerData.zip,
      customerData.quickbooksId
    ])

    const customerId = result.rows[0].id

    // Create mapping
    await query(`
      INSERT INTO "QuickBooksMapping" (
        "localEntityType", "localEntityId", "quickbooksId", "quickbooksType",
        "syncVersion", "syncStatus"
      ) VALUES ($1, $2, $3, $4, $5, $6)
    `, [
      'CUSTOMER',
      customerId,
      qbCustomer.Id,
      'Customer',
      qbCustomer.SyncToken,
      'SYNCED'
    ])

    // Log sync
    await query(`
      INSERT INTO "QuickBooksSyncLog" (
        "operationType", "entityType", "localEntityId", "quickbooksId",
        "direction", "status", "responseData", "completedAt"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
    `, [
      'CREATE',
      'CUSTOMER',
      customerId,
      qbCustomer.Id,
      'FROM_QB',
      'SUCCESS',
      JSON.stringify(qbCustomer)
    ])
  }

  /**
   * Update customer in our system from QuickBooks data
   */
  private async updateCustomerFromQuickBooks(qbCustomer: any, localCustomerId: string) {
    await query(`
      UPDATE "Customer" 
      SET 
        "companyName" = $1,
        "firstName" = $2,
        "lastName" = $3,
        "email" = $4,
        "phone" = $5,
        "street" = $6,
        "address" = $6,
        "city" = $7,
        "state" = $8,
        "zip" = $9,
        "updatedAt" = NOW()
      WHERE id = $10
    `, [
      qbCustomer.CompanyName || qbCustomer.Name,
      qbCustomer.GivenName,
      qbCustomer.FamilyName,
      qbCustomer.PrimaryEmailAddr?.Address,
      qbCustomer.PrimaryPhone?.FreeFormNumber,
      qbCustomer.BillAddr?.Line1,
      qbCustomer.BillAddr?.City,
      qbCustomer.BillAddr?.CountrySubDivisionCode,
      qbCustomer.BillAddr?.PostalCode,
      localCustomerId
    ])

    // Update mapping
    await query(`
      UPDATE "QuickBooksMapping" 
      SET 
        "syncVersion" = $1,
        "syncStatus" = 'SYNCED',
        "lastSyncAt" = NOW(),
        "updatedAt" = NOW()
      WHERE "localEntityType" = 'CUSTOMER' AND "localEntityId" = $2
    `, [qbCustomer.SyncToken, localCustomerId])
  }

  /**
   * Sync items (products/services) from QuickBooks
   */
  async syncItemsFromQuickBooks(): Promise<SyncResult> {
    const result: SyncResult = {
      success: false,
      created: 0,
      updated: 0,
      errors: 0,
      errorDetails: []
    }

    try {
      const connection = await quickbooksClient.getActiveConnection()
      if (!connection) {
        throw new Error('No active QuickBooks connection')
      }

      const qbItemsResponse = await quickbooksClient.getItems(connection)
      const qbItems = qbItemsResponse.QueryResponse?.Item || []

      for (const qbItem of qbItems) {
        try {
          await query(`
            INSERT INTO "QuickBooksItem" (
              "quickbooksId", "name", "description", "type", "unitPrice",
              "qtyOnHand", "taxable", "active", "sku", "syncVersion"
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            ON CONFLICT ("quickbooksId")
            DO UPDATE SET
              "name" = EXCLUDED."name",
              "description" = EXCLUDED."description",
              "type" = EXCLUDED."type",
              "unitPrice" = EXCLUDED."unitPrice",
              "qtyOnHand" = EXCLUDED."qtyOnHand",
              "taxable" = EXCLUDED."taxable",
              "active" = EXCLUDED."active",
              "sku" = EXCLUDED."sku",
              "syncVersion" = EXCLUDED."syncVersion",
              "lastSyncAt" = NOW(),
              "updatedAt" = NOW()
          `, [
            qbItem.Id,
            qbItem.Name,
            qbItem.Description,
            qbItem.Type,
            qbItem.UnitPrice ? parseFloat(qbItem.UnitPrice) : null,
            qbItem.QtyOnHand ? parseFloat(qbItem.QtyOnHand) : null,
            qbItem.Taxable || false,
            qbItem.Active !== false,
            qbItem.Sku,
            qbItem.SyncToken
          ])

          result.created++
        } catch (error) {
          result.errors++
          result.errorDetails.push(`Item ${qbItem.Name}: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
      }

      result.success = result.errors === 0
      return result

    } catch (error) {
      result.errors++
      result.errorDetails.push(error instanceof Error ? error.message : 'Unknown error')
      return result
    }
  }

  /**
   * Log sync error
   */
  private async logSyncError(entityType: string, localEntityId: string, error: any) {
    try {
      await query(`
        INSERT INTO "QuickBooksSyncLog" (
          "operationType", "entityType", "localEntityId", "direction", 
          "status", "errorMessage", "completedAt"
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
      `, [
        'SYNC',
        entityType,
        localEntityId,
        'TO_QB',
        'ERROR',
        error instanceof Error ? error.message : 'Unknown error'
      ])

      // Update mapping status
      await query(`
        UPDATE "QuickBooksMapping" 
        SET 
          "syncStatus" = 'ERROR',
          "syncErrors" = jsonb_set(
            COALESCE("syncErrors", '[]'::jsonb),
            '{0}',
            $1::jsonb,
            true
          ),
          "updatedAt" = NOW()
        WHERE "localEntityType" = $2 AND "localEntityId" = $3
      `, [
        JSON.stringify({
          timestamp: new Date().toISOString(),
          error: error instanceof Error ? error.message : 'Unknown error'
        }),
        entityType,
        localEntityId
      ])
    } catch (logError) {
      console.error('Failed to log sync error:', logError)
    }
  }

  /**
   * Run full bidirectional sync
   */
  async runFullSync(): Promise<{ 
    customers: { toQB: SyncResult; fromQB: SyncResult }
    items: { fromQB: SyncResult }
  }> {
    const results = {
      customers: {
        toQB: await this.syncCustomersToQuickBooks(),
        fromQB: await this.syncCustomersFromQuickBooks()
      },
      items: {
        fromQB: await this.syncItemsFromQuickBooks()
      }
    }

    // Update last sync time
    const connection = await quickbooksClient.getActiveConnection()
    if (connection) {
      await query(`
        UPDATE "QuickBooksConnection" 
        SET "lastSyncAt" = NOW(), "updatedAt" = NOW()
        WHERE id = $1
      `, [connection.id])
    }

    return results
  }
}

// Export singleton instance
export const quickbooksSync = new QuickBooksSync()