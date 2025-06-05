'use client'

import { useEffect, useState } from 'react'
import { Typography, Box, Button } from '@mui/material'
import { useRouter } from 'next/navigation'

export default function TestDashboard() {
  const router = useRouter()
  const [debugInfo, setDebugInfo] = useState<any>(null)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    // Check localStorage
    const storedUser = localStorage.getItem('user')
    if (storedUser) {
      setUser(JSON.parse(storedUser))
    }

    // Check auth status
    fetch('/api/auth/debug')
      .then(res => res.json())
      .then(data => setDebugInfo(data))
  }, [])

  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h4" gutterBottom>Test Dashboard (No Middleware)</Typography>
      
      <Box sx={{ mt: 2 }}>
        <Typography variant="h6">LocalStorage User:</Typography>
        <pre>{JSON.stringify(user, null, 2)}</pre>
      </Box>

      <Box sx={{ mt: 2 }}>
        <Typography variant="h6">Auth Debug Info:</Typography>
        <pre>{JSON.stringify(debugInfo, null, 2)}</pre>
      </Box>

      <Box sx={{ mt: 2 }}>
        <Button 
          variant="contained" 
          onClick={() => router.push('/dashboard')}
        >
          Go to Real Dashboard
        </Button>
      </Box>
    </Box>
  )
}