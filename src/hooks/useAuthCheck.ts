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

          // If we get a 401 and have retries left, wait and try again
          if (response.status === 401 && retries > 1) {
            await new Promise(resolve => setTimeout(resolve, delay))
            delay *= 2 // Exponential backoff
            retries--
            continue
          }

          // Final failure - check if we have stored user data
          if (storedUser) {
            // Use stored user data
            setLoading(false)
            return
          }

          // No stored user and auth failed - redirect to login
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

          // Final error - use stored user or redirect
          if (storedUser) {
            setLoading(false)
            return
          }
          
          router.push('/login')
          return
        }
      }
    }

    checkAuth()
  }, [router])

  return { user, loading }
}