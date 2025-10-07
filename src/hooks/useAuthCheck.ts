'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface User {
  id: string
  email: string
  name: string
  role: string
}

export function useAuthCheck() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      // First check localStorage for immediate UI
      const storedUser = localStorage.getItem('user')
      if (storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser)
          setUser(parsedUser)
        } catch (e) {
          console.error('Failed to parse stored user:', e)
        }
      }

      // Retry mechanism for auth check
      let retries = 3
      let delay = 100

      while (retries > 0) {
        try {
          const response = await fetch('/api/auth/me', {
            credentials: 'include',
            cache: 'no-cache',
          })

          if (response.ok) {
            const userData = await response.json()
            setUser(userData)
            localStorage.setItem('user', JSON.stringify(userData))
            setLoading(false)
            return
          }

          // If we get a 401, clear invalid data and redirect to login
          if (response.status === 401) {
            // Clear invalid localStorage and cookies
            localStorage.removeItem('user')
            // Clear auth cookie by setting it to expired
            document.cookie = 'auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'

            // Don't retry on 401 - token is invalid, redirect immediately
            router.push('/login')
            return
          }

          // For other errors, retry
          if (retries > 1) {
            await new Promise(resolve => setTimeout(resolve, delay))
            delay *= 2 // Exponential backoff
            retries--
            continue
          }

          // Final failure after retries - redirect to login
          localStorage.removeItem('user')
          router.push('/login')
          return
        } catch (error) {
          console.error('Auth check error:', error)
          retries--

          if (retries > 0) {
            await new Promise(resolve => setTimeout(resolve, delay))
            delay *= 2
            continue
          }

          // Final error - clear everything and redirect
          localStorage.removeItem('user')
          document.cookie = 'auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
          router.push('/login')
          return
        }
      }
    }

    checkAuth()
  }, [router])

  return { user, loading }
}