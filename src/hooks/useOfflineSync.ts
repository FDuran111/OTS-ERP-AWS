'use client'

import { useState, useEffect, useCallback } from 'react'

export interface OfflineQueueItem {
  id: string
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  url: string
  data?: any
  timestamp: number
  retryCount: number
  maxRetries: number
}

export interface OfflineData {
  [key: string]: {
    data: any
    timestamp: number
    expires?: number
  }
}

export interface UseOfflineSyncResult {
  isOnline: boolean
  queueSize: number
  syncInProgress: boolean
  lastSyncTime: Date | null
  queueRequest: (item: Omit<OfflineQueueItem, 'id' | 'timestamp' | 'retryCount'>) => void
  syncQueue: () => Promise<void>
  getCachedData: (key: string) => any
  setCachedData: (key: string, data: any, expirationMinutes?: number) => void
  clearCache: () => void
  clearQueue: () => void
}

const STORAGE_KEYS = {
  OFFLINE_QUEUE: 'erp_offline_queue',
  OFFLINE_DATA: 'erp_offline_data',
  LAST_SYNC: 'erp_last_sync'
}

export function useOfflineSync(): UseOfflineSyncResult {
  const [isOnline, setIsOnline] = useState(true)
  const [queueSize, setQueueSize] = useState(0)
  const [syncInProgress, setSyncInProgress] = useState(false)
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null)

  // Initialize online status and queue size
  useEffect(() => {
    // Check initial online status
    setIsOnline(navigator.onLine)

    // Set up online/offline listeners
    const handleOnline = () => {
      setIsOnline(true)
      // Auto-sync when coming back online
      syncQueue()
    }
    
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Load initial queue size and last sync time
    updateQueueSize()
    loadLastSyncTime()

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const updateQueueSize = useCallback(() => {
    try {
      const queue = getStoredQueue()
      setQueueSize(queue.length)
    } catch (error) {
      console.error('Error updating queue size:', error)
      setQueueSize(0)
    }
  }, [])

  const loadLastSyncTime = useCallback(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.LAST_SYNC)
      if (stored) {
        setLastSyncTime(new Date(stored))
      }
    } catch (error) {
      console.error('Error loading last sync time:', error)
    }
  }, [])

  const getStoredQueue = (): OfflineQueueItem[] => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.OFFLINE_QUEUE)
      return stored ? JSON.parse(stored) : []
    } catch (error) {
      console.error('Error getting stored queue:', error)
      return []
    }
  }

  const setStoredQueue = (queue: OfflineQueueItem[]) => {
    try {
      localStorage.setItem(STORAGE_KEYS.OFFLINE_QUEUE, JSON.stringify(queue))
      updateQueueSize()
    } catch (error) {
      console.error('Error storing queue:', error)
    }
  }

  const getStoredData = (): OfflineData => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.OFFLINE_DATA)
      return stored ? JSON.parse(stored) : {}
    } catch (error) {
      console.error('Error getting stored data:', error)
      return {}
    }
  }

  const setStoredData = (data: OfflineData) => {
    try {
      localStorage.setItem(STORAGE_KEYS.OFFLINE_DATA, JSON.stringify(data))
    } catch (error) {
      console.error('Error storing data:', error)
    }
  }

  const queueRequest = useCallback((item: Omit<OfflineQueueItem, 'id' | 'timestamp' | 'retryCount'>) => {
    const queueItem: OfflineQueueItem = {
      ...item,
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      retryCount: 0,
      maxRetries: item.maxRetries || 3
    }

    const queue = getStoredQueue()
    queue.push(queueItem)
    setStoredQueue(queue)

    // If online, try to sync immediately
    if (isOnline) {
      syncQueue()
    }
  }, [isOnline])

  const syncQueue = useCallback(async () => {
    if (!isOnline || syncInProgress) {
      return
    }

    setSyncInProgress(true)

    try {
      const queue = getStoredQueue()
      const failedItems: OfflineQueueItem[] = []

      for (const item of queue) {
        try {
          const response = await fetch(item.url, {
            method: item.method,
            headers: {
              'Content-Type': 'application/json',
              ...(item.data && { 'Content-Type': 'application/json' })
            },
            body: item.data ? JSON.stringify(item.data) : undefined
          })

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`)
          }

          // Request succeeded, don't add to failed items
          console.log(`Successfully synced queued request: ${item.method} ${item.url}`)

        } catch (error) {
          console.error(`Failed to sync request ${item.id}:`, error)
          
          // Increment retry count
          item.retryCount++
          
          // If we haven't exceeded max retries, add back to queue
          if (item.retryCount < item.maxRetries) {
            failedItems.push(item)
          } else {
            console.warn(`Max retries exceeded for request ${item.id}, dropping from queue`)
          }
        }
      }

      // Update queue with only failed items that can still be retried
      setStoredQueue(failedItems)

      // Update last sync time
      const now = new Date()
      setLastSyncTime(now)
      localStorage.setItem(STORAGE_KEYS.LAST_SYNC, now.toISOString())

    } catch (error) {
      console.error('Error during sync:', error)
    } finally {
      setSyncInProgress(false)
    }
  }, [isOnline, syncInProgress])

  const getCachedData = useCallback((key: string) => {
    try {
      const data = getStoredData()
      const item = data[key]
      
      if (!item) {
        return null
      }

      // Check if data has expired
      if (item.expires && Date.now() > item.expires) {
        // Remove expired data
        delete data[key]
        setStoredData(data)
        return null
      }

      return item.data
    } catch (error) {
      console.error('Error getting cached data:', error)
      return null
    }
  }, [])

  const setCachedData = useCallback((key: string, data: any, expirationMinutes?: number) => {
    try {
      const storedData = getStoredData()
      const expires = expirationMinutes ? Date.now() + (expirationMinutes * 60 * 1000) : undefined
      
      storedData[key] = {
        data,
        timestamp: Date.now(),
        expires
      }
      
      setStoredData(storedData)
    } catch (error) {
      console.error('Error setting cached data:', error)
    }
  }, [])

  const clearCache = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEYS.OFFLINE_DATA)
    } catch (error) {
      console.error('Error clearing cache:', error)
    }
  }, [])

  const clearQueue = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEYS.OFFLINE_QUEUE)
      setQueueSize(0)
    } catch (error) {
      console.error('Error clearing queue:', error)
    }
  }, [])

  return {
    isOnline,
    queueSize,
    syncInProgress,
    lastSyncTime,
    queueRequest,
    syncQueue,
    getCachedData,
    setCachedData,
    clearCache,
    clearQueue
  }
}

// Custom hook for offline-aware API requests
export function useOfflineAPI() {
  const { isOnline, queueRequest, getCachedData, setCachedData } = useOfflineSync()

  const apiRequest = useCallback(async (
    url: string,
    options: RequestInit = {},
    cacheKey?: string,
    cacheMinutes?: number
  ) => {
    const method = options.method || 'GET'

    // For GET requests, try cache first if offline
    if (method === 'GET' && !isOnline && cacheKey) {
      const cachedData = getCachedData(cacheKey)
      if (cachedData) {
        return cachedData
      }
    }

    // If offline and not a GET request, queue it
    if (!isOnline && method !== 'GET') {
      queueRequest({
        method: method as any,
        url,
        data: options.body ? JSON.parse(options.body as string) : undefined,
        maxRetries: 3
      })
      throw new Error('Request queued for offline sync')
    }

    // Make the request
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()

      // Cache successful GET requests
      if (method === 'GET' && cacheKey) {
        setCachedData(cacheKey, data, cacheMinutes)
      }

      return data

    } catch (error) {
      // If online request fails and we have cached data, return it
      if (method === 'GET' && cacheKey) {
        const cachedData = getCachedData(cacheKey)
        if (cachedData) {
          console.warn('Using cached data due to request failure:', error)
          return cachedData
        }
      }
      throw error
    }
  }, [isOnline, queueRequest, getCachedData, setCachedData])

  return {
    apiRequest,
    isOnline
  }
}