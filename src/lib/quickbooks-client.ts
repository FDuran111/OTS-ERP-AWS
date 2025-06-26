import { query } from '@/lib/db'

export interface QuickBooksConfig {
  clientId: string
  clientSecret: string
  redirectUri: string
  baseUrl: string
  scope: string
  environment: 'sandbox' | 'production'
}

export interface QuickBooksTokens {
  accessToken: string
  refreshToken: string
  realmId: string
  expiresAt: Date
}

export interface QuickBooksConnection {
  id: string
  companyId: string
  accessToken: string
  refreshToken: string
  tokenExpiresAt: Date
  realmId: string
  baseUrl: string
  isActive: boolean
  lastSyncAt: Date | null
}

export class QuickBooksClient {
  private config: QuickBooksConfig

  constructor(config?: Partial<QuickBooksConfig>) {
    this.config = {
      clientId: process.env.QB_CLIENT_ID || '',
      clientSecret: process.env.QB_CLIENT_SECRET || '',
      redirectUri: process.env.QB_REDIRECT_URI || 'http://localhost:3000/api/quickbooks/callback',
      baseUrl: process.env.QB_SANDBOX_MODE === 'true' ? 
        'https://sandbox-quickbooks.api.intuit.com' : 
        'https://quickbooks.api.intuit.com',
      scope: 'com.intuit.quickbooks.accounting',
      environment: process.env.QB_SANDBOX_MODE === 'true' ? 'sandbox' : 'production',
      ...config
    }
  }

  /**
   * Generate OAuth 2.0 authorization URL
   */
  getAuthorizationUrl(state?: string): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      scope: this.config.scope,
      redirect_uri: this.config.redirectUri,
      response_type: 'code',
      access_type: 'offline',
      state: state || this.generateState()
    })

    return `https://appcenter.intuit.com/connect/oauth2?${params.toString()}`
  }

  /**
   * Exchange authorization code for access tokens
   */
  async exchangeCodeForTokens(code: string, realmId: string): Promise<QuickBooksTokens> {
    const tokenUrl = 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer'
    
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: this.config.redirectUri
    })

    const auth = Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`).toString('base64')

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: params.toString()
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Token exchange failed: ${response.status} ${error}`)
    }

    const tokenData = await response.json()

    return {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      realmId,
      expiresAt: new Date(Date.now() + tokenData.expires_in * 1000)
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshTokens(refreshToken: string): Promise<Omit<QuickBooksTokens, 'realmId'>> {
    const tokenUrl = 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer'
    
    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken
    })

    const auth = Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`).toString('base64')

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: params.toString()
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Token refresh failed: ${response.status} ${error}`)
    }

    const tokenData = await response.json()

    return {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token || refreshToken, // Some responses don't include new refresh token
      expiresAt: new Date(Date.now() + tokenData.expires_in * 1000)
    }
  }

  /**
   * Make authenticated API request to QuickBooks
   */
  async makeApiRequest(
    connection: QuickBooksConnection,
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    data?: any
  ): Promise<any> {
    // Check if token needs refresh
    if (connection.tokenExpiresAt <= new Date()) {
      const refreshedTokens = await this.refreshTokens(connection.refreshToken)
      
      // Update tokens in database
      await this.updateConnectionTokens(connection.id, refreshedTokens)
      
      // Update local connection object
      connection.accessToken = refreshedTokens.accessToken
      connection.refreshToken = refreshedTokens.refreshToken
      connection.tokenExpiresAt = refreshedTokens.expiresAt
    }

    const url = `${connection.baseUrl}/v3/company/${connection.realmId}/${endpoint}`

    const headers: Record<string, string> = {
      'Authorization': `Bearer ${connection.accessToken}`,
      'Accept': 'application/json'
    }

    if (method !== 'GET' && data) {
      headers['Content-Type'] = 'application/json'
    }

    const requestOptions: RequestInit = {
      method,
      headers
    }

    if (method !== 'GET' && data) {
      requestOptions.body = JSON.stringify(data)
    }

    const response = await fetch(url, requestOptions)

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`QuickBooks API request failed: ${response.status} ${error}`)
    }

    return response.json()
  }

  /**
   * Get company information
   */
  async getCompanyInfo(connection: QuickBooksConnection) {
    return this.makeApiRequest(connection, 'companyinfo/1')
  }

  /**
   * Get all customers
   */
  async getCustomers(connection: QuickBooksConnection) {
    return this.makeApiRequest(connection, "query?query=SELECT * FROM Customer")
  }

  /**
   * Create customer in QuickBooks
   */
  async createCustomer(connection: QuickBooksConnection, customerData: any) {
    return this.makeApiRequest(connection, 'customer', 'POST', { Customer: customerData })
  }

  /**
   * Update customer in QuickBooks
   */
  async updateCustomer(connection: QuickBooksConnection, customerData: any) {
    return this.makeApiRequest(connection, 'customer', 'POST', { Customer: customerData })
  }

  /**
   * Get all items (products/services)
   */
  async getItems(connection: QuickBooksConnection) {
    return this.makeApiRequest(connection, "query?query=SELECT * FROM Item")
  }

  /**
   * Create invoice in QuickBooks
   */
  async createInvoice(connection: QuickBooksConnection, invoiceData: any) {
    return this.makeApiRequest(connection, 'invoice', 'POST', { Invoice: invoiceData })
  }

  /**
   * Get all invoices
   */
  async getInvoices(connection: QuickBooksConnection, maxResults = 100) {
    return this.makeApiRequest(connection, `query?query=SELECT * FROM Invoice MAXRESULTS ${maxResults}`)
  }

  /**
   * Save QuickBooks connection to database
   */
  async saveConnection(tokens: QuickBooksTokens): Promise<string> {
    const result = await query(`
      INSERT INTO "QuickBooksConnection" (
        "companyId", "accessToken", "refreshToken", "tokenExpiresAt", 
        "realmId", "baseUrl", "isActive"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT ("companyId") 
      DO UPDATE SET 
        "accessToken" = EXCLUDED."accessToken",
        "refreshToken" = EXCLUDED."refreshToken",
        "tokenExpiresAt" = EXCLUDED."tokenExpiresAt",
        "isActive" = true,
        "updatedAt" = NOW()
      RETURNING id
    `, [
      tokens.realmId, // Using realmId as companyId
      tokens.accessToken,
      tokens.refreshToken,
      tokens.expiresAt,
      tokens.realmId,
      this.config.baseUrl,
      true
    ])

    return result.rows[0].id
  }

  /**
   * Get active QuickBooks connection
   */
  async getActiveConnection(): Promise<QuickBooksConnection | null> {
    const result = await query(`
      SELECT * FROM "QuickBooksConnection" 
      WHERE "isActive" = true 
      ORDER BY "updatedAt" DESC 
      LIMIT 1
    `)

    if (result.rows.length === 0) {
      return null
    }

    const row = result.rows[0]
    return {
      id: row.id,
      companyId: row.companyId,
      accessToken: row.accessToken,
      refreshToken: row.refreshToken,
      tokenExpiresAt: new Date(row.tokenExpiresAt),
      realmId: row.realmId,
      baseUrl: row.baseUrl,
      isActive: row.isActive,
      lastSyncAt: row.lastSyncAt ? new Date(row.lastSyncAt) : null
    }
  }

  /**
   * Update connection tokens in database
   */
  private async updateConnectionTokens(
    connectionId: string, 
    tokens: Omit<QuickBooksTokens, 'realmId'>
  ) {
    await query(`
      UPDATE "QuickBooksConnection" 
      SET 
        "accessToken" = $1,
        "refreshToken" = $2,
        "tokenExpiresAt" = $3,
        "updatedAt" = NOW()
      WHERE id = $4
    `, [tokens.accessToken, tokens.refreshToken, tokens.expiresAt, connectionId])
  }

  /**
   * Generate random state for OAuth
   */
  private generateState(): string {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15)
  }

  /**
   * Disconnect QuickBooks connection
   */
  async disconnect(connectionId: string): Promise<void> {
    await query(`
      UPDATE "QuickBooksConnection" 
      SET "isActive" = false, "updatedAt" = NOW()
      WHERE id = $1
    `, [connectionId])
  }

  /**
   * Test connection by making a simple API call
   */
  async testConnection(connection: QuickBooksConnection): Promise<boolean> {
    try {
      await this.getCompanyInfo(connection)
      return true
    } catch (error) {
      console.error('QuickBooks connection test failed:', error)
      return false
    }
  }
}

// Export singleton instance
export const quickbooksClient = new QuickBooksClient()