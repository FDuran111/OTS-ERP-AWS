'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Badge,
  IconButton,
  Popover,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  Typography,
  Box,
  Button,
  Divider,
  CircularProgress,
  Chip,
} from '@mui/material'
import {
  Notifications as NotificationsIcon,
  NotificationsNone as NotificationsNoneIcon,
} from '@mui/icons-material'
import toast from 'react-hot-toast'
import { formatDistanceToNow } from 'date-fns'

interface Notification {
  id: string
  type: string
  title: string
  message: string
  materialId: string
  materialCode: string
  materialName: string
  currentStock: number
  minStock: number
  stockoutDate: string | null
  stockoutProbability: number
  read: boolean
  createdAt: string
}

interface NotificationResponse {
  notifications: Notification[]
  unreadCount: number
}

type UrgencyLevel = 'CRITICAL' | 'URGENT' | 'MEDIUM'

function getUrgencyLevel(notification: Notification): UrgencyLevel {
  const probability = notification.stockoutProbability
  
  // Guard against division by zero
  if (notification.minStock <= 0) {
    // Fallback to probability-only logic
    if (probability >= 0.8) return 'CRITICAL'
    if (probability >= 0.5) return 'URGENT'
    return 'MEDIUM'
  }

  const stockRatio = notification.currentStock / notification.minStock

  if (stockRatio <= 0.25 || probability >= 0.8) {
    return 'CRITICAL'
  } else if (stockRatio <= 0.5 || probability >= 0.5) {
    return 'URGENT'
  } else {
    return 'MEDIUM'
  }
}

function getUrgencyColor(urgency: UrgencyLevel): string {
  switch (urgency) {
    case 'CRITICAL':
      return '#d32f2f'
    case 'URGENT':
      return '#ed6c02'
    case 'MEDIUM':
      return '#0288d1'
    default:
      return '#757575'
  }
}

export function NotificationBell() {
  const router = useRouter()
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const shownToastsRef = useRef(new Set<string>())
  const notificationsRef = useRef<Notification[]>([])

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const token = localStorage.getItem('auth-token')
      const response = await fetch('/api/notifications/low-stock', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error('Failed to fetch notifications')
      }

      const data: NotificationResponse = await response.json()
      
      const previousUnreadIds = new Set(
        notificationsRef.current.filter(n => !n.read).map(n => n.id)
      )
      
      const newNotifications = data.notifications.filter(
        n => !n.read && !previousUnreadIds.has(n.id)
      )

      newNotifications.forEach(notification => {
        const urgency = getUrgencyLevel(notification)
        
        if (urgency === 'CRITICAL' && !shownToastsRef.current.has(notification.materialId)) {
          shownToastsRef.current.add(notification.materialId)
          
          toast.error(
            (t) => (
              <Box>
                <Typography variant="body2" fontWeight="bold">
                  Critical Low Stock Alert
                </Typography>
                <Typography variant="body2" sx={{ mt: 0.5 }}>
                  {notification.materialCode} - {notification.materialName}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Stock: {notification.currentStock} / Min: {notification.minStock}
                </Typography>
                <Button
                  size="small"
                  onClick={() => {
                    toast.dismiss(t.id)
                    router.push(`/materials?filter=low-stock`)
                  }}
                  sx={{ mt: 1, color: 'white' }}
                >
                  View
                </Button>
              </Box>
            ),
            {
              duration: 8000,
              position: 'top-right',
            }
          )
        }
      })

      notificationsRef.current = data.notifications
      setNotifications(data.notifications)
      setUnreadCount(data.unreadCount)
    } catch (err) {
      console.error('Error fetching notifications:', err)
      setError('Failed to load notifications')
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    fetchNotifications()

    const interval = setInterval(() => {
      fetchNotifications()
    }, 5 * 60 * 1000)

    return () => clearInterval(interval)
  }, [fetchNotifications])

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleClose = () => {
    setAnchorEl(null)
  }

  const markAsRead = async (notificationIds: string[]) => {
    try {
      const token = localStorage.getItem('auth-token')
      await fetch('/api/notifications/low-stock', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        credentials: 'include',
        body: JSON.stringify({
          notificationIds,
          markAsRead: true,
        }),
      })

      setNotifications(prev =>
        prev.map(n =>
          notificationIds.includes(n.id) ? { ...n, read: true } : n
        )
      )
      setUnreadCount(prev => Math.max(0, prev - notificationIds.length))
    } catch (err) {
      console.error('Error marking notifications as read:', err)
    }
  }

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      markAsRead([notification.id])
    }
    handleClose()
    router.push(`/materials?filter=low-stock&materialId=${notification.materialId}`)
  }

  const handleMarkAllAsRead = () => {
    const unreadIds = notifications.filter(n => !n.read).map(n => n.id)
    if (unreadIds.length > 0) {
      markAsRead(unreadIds)
    }
  }

  const handleViewAll = () => {
    handleClose()
    router.push('/materials?filter=low-stock')
  }

  const open = Boolean(anchorEl)

  return (
    <>
      <IconButton color="inherit" onClick={handleClick} size="small">
        <Badge badgeContent={unreadCount} color="error">
          {unreadCount > 0 ? <NotificationsIcon /> : <NotificationsNoneIcon />}
        </Badge>
      </IconButton>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        PaperProps={{
          sx: {
            width: 400,
            maxWidth: '90vw',
            maxHeight: 600,
          },
        }}
      >
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">Notifications</Typography>
          {unreadCount > 0 && (
            <Button size="small" onClick={handleMarkAllAsRead}>
              Mark all read
            </Button>
          )}
        </Box>
        <Divider />

        {loading && notifications.length === 0 ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress size={24} />
          </Box>
        ) : error ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography color="error" variant="body2">
              {error}
            </Typography>
          </Box>
        ) : notifications.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography color="text.secondary" variant="body2">
              No notifications
            </Typography>
          </Box>
        ) : (
          <List sx={{ p: 0, maxHeight: 450, overflow: 'auto' }}>
            {notifications.map((notification) => {
              const urgency = getUrgencyLevel(notification)
              const urgencyColor = getUrgencyColor(urgency)

              return (
                <Box key={notification.id}>
                  <ListItemButton
                    onClick={() => handleNotificationClick(notification)}
                    sx={{
                      backgroundColor: notification.read ? 'transparent' : 'action.hover',
                      '&:hover': {
                        backgroundColor: notification.read ? 'action.hover' : 'action.selected',
                      },
                    }}
                  >
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                          <Chip
                            label={urgency}
                            size="small"
                            sx={{
                              backgroundColor: urgencyColor,
                              color: 'white',
                              fontWeight: 'bold',
                              fontSize: '0.7rem',
                              height: 20,
                            }}
                          />
                          <Typography
                            variant="body2"
                            fontWeight={notification.read ? 'normal' : 'bold'}
                            sx={{ flex: 1 }}
                          >
                            {notification.materialCode} - {notification.materialName}
                          </Typography>
                        </Box>
                      }
                      secondary={
                        <Box sx={{ mt: 0.5 }}>
                          <Typography variant="caption" color="text.secondary" display="block">
                            Current: {notification.currentStock} | Min: {notification.minStock}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                          </Typography>
                        </Box>
                      }
                    />
                  </ListItemButton>
                  <Divider />
                </Box>
              )
            })}
          </List>
        )}

        <Divider />
        <Box sx={{ p: 1.5, display: 'flex', justifyContent: 'center' }}>
          <Button size="small" onClick={handleViewAll} fullWidth>
            View All Materials
          </Button>
        </Box>
      </Popover>
    </>
  )
}
