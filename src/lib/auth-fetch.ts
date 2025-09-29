/**
 * Unified fetch wrapper that automatically includes Authorization headers
 * for Replit environment where cookies may not be reliable
 */

export function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('auth-token')
  return token ? { 'Authorization': `Bearer ${token}` } : {}
}

export function makeAuthenticatedRequest(url: string, options: RequestInit = {}): Promise<Response> {
  return fetch(url, {
    ...options,
    headers: {
      ...getAuthHeaders(),
      ...options.headers
    },
    credentials: 'include'
  })
}

/**
 * Convenience wrapper for common HTTP methods with authentication
 */
export const authFetch = {
  get: (url: string, options: RequestInit = {}) => 
    makeAuthenticatedRequest(url, { ...options, method: 'GET' }),
    
  post: (url: string, data?: any, options: RequestInit = {}) => 
    makeAuthenticatedRequest(url, {
      ...options,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      body: data ? JSON.stringify(data) : undefined
    }),
    
  put: (url: string, data?: any, options: RequestInit = {}) => 
    makeAuthenticatedRequest(url, {
      ...options,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      body: data ? JSON.stringify(data) : undefined
    }),
    
  delete: (url: string, options: RequestInit = {}) => 
    makeAuthenticatedRequest(url, { ...options, method: 'DELETE' })
}