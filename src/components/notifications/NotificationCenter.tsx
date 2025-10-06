'use client'

import React, { useState, useEffect } from 'react'
import {
  Badge,
  IconButton,
  Menu,
  MenuItem,
  Typography,
  Box,
  Button,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  Stack,
  CircularProgress,
} from '@mui/material'
import {
  Notifications as BellIcon,
  CheckCircle as ApprovedIcon,
  Cancel as RejectedIcon,
  Work as JobIcon,
  Schedule as ScheduleIcon,
  Warning as AlertIcon,
  Info as InfoIcon,
  DoneAll as MarkAllReadIcon,
} from '@mui/icons-material'
import { useRouter } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'
import RejectionFixDialog from '@/components/time/RejectionFixDialog'

interface Notification {
  id: string
  type: 'job' | 'schedule' | 'alert' | 'system'
  title: string
  message: string
  timestamp: string
  read: boolean
  priority: 'high' | 'medium' | 'low'
  actionUrl: string | null
  metadata?: any
}

export default function NotificationCenter() {
  const router = useRouter()
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [rejectionDialogOpen, setRejectionDialogOpen] = useState(false)
  const [selectedTimeEntryId, setSelectedTimeEntryId] = useState<string | null>(null)

  const open = Boolean(anchorEl)

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/notifications', {
        credentials: 'include'
      })

      if (response.ok) {
        const data = await response.json()
        setNotifications(data)
        setUnreadCount(data.filter((n: Notification) => !n.read).length)
      }
    } catch (error) {
      console.error('Error fetching notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  // Fetch on mount and every 60 seconds
  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 60000)
    return () => clearInterval(interval)
  }, [])

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleClose = () => {
    setAnchorEl(null)
  }

  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read
    if (!notification.read) {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ notificationId: notification.id })
      })

      // Update local state
      setNotifications(prev =>
        prev.map(n => n.id === notification.id ? { ...n, read: true } : n)
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
    }

    // Check if this is a rejection notification with proper metadata
    const isRejection = notification.metadata?.type === 'TIME_ENTRY_REJECTED' &&
                        notification.metadata?.timeEntryId

    if (isRejection) {
      // Open rejection dialog instead of navigating
      setSelectedTimeEntryId(notification.metadata.timeEntryId)
      setRejectionDialogOpen(true)
      handleClose()
    } else if (notification.actionUrl) {
      // Navigate for other notifications
      router.push(notification.actionUrl)
      handleClose()
    } else {
      handleClose()
    }
  }

  const handleMarkAllRead = async () => {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ markAllRead: true })
      })

      // Update local state
      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
      setUnreadCount(0)
    } catch (error) {
      console.error('Error marking all as read:', error)
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'job':
        return <JobIcon sx={{ fontSize: 20 }} color="primary" />
      case 'schedule':
        return <ScheduleIcon sx={{ fontSize: 20 }} color="info" />
      case 'alert':
        return <AlertIcon sx={{ fontSize: 20 }} color="warning" />
      default:
        return <InfoIcon sx={{ fontSize: 20 }} color="action" />
    }
  }

  const getTimeAgo = (timestamp: string) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true })
    } catch {
      return 'recently'
    }
  }

  return (
    <>
      <IconButton
        onClick={handleClick}
        size="large"
        aria-label={`show ${unreadCount} new notifications`}
        color="inherit"
      >
        <Badge badgeContent={unreadCount} color="error">
          <BellIcon />
        </Badge>
      </IconButton>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        PaperProps={{
          sx: {
            width: 380,
            maxHeight: 500,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        {/* Header */}
        <Box sx={{ p: 2, pb: 1 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">Notifications</Typography>
            {unreadCount > 0 && (
              <Button
                size="small"
                startIcon={<MarkAllReadIcon />}
                onClick={handleMarkAllRead}
              >
                Mark all read
              </Button>
            )}
          </Stack>
        </Box>

        <Divider />

        {/* Notifications List */}
        <Box sx={{ overflow: 'auto', maxHeight: 400 }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress size={24} />
            </Box>
          ) : notifications.length === 0 ? (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <InfoIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
              <Typography variant="body2" color="text.secondary">
                No notifications
              </Typography>
            </Box>
          ) : (
            <List sx={{ p: 0 }}>
              {notifications.map((notification, index) => (
                <React.Fragment key={notification.id}>
                  <ListItem
                    component="li"
                    onClick={() => handleNotificationClick(notification)}
                    sx={{
                      bgcolor: notification.read ? 'transparent' : 'action.hover',
                      '&:hover': {
                        bgcolor: notification.read ? 'action.hover' : 'action.selected',
                      },
                      py: 1.5,
                      cursor: 'pointer',
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 40 }}>
                      {getNotificationIcon(notification.type)}
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Typography
                            variant="body2"
                            sx={{
                              fontWeight: notification.read ? 'normal' : 'bold',
                              flex: 1,
                            }}
                          >
                            {notification.title}
                          </Typography>
                          {!notification.read && (
                            <Box
                              component="span"
                              sx={{
                                width: 8,
                                height: 8,
                                borderRadius: '50%',
                                bgcolor: 'primary.main',
                                display: 'inline-block',
                              }}
                            />
                          )}
                        </Stack>
                      }
                      secondary={
                        <>
                          <Typography
                            component="span"
                            variant="caption"
                            color="text.secondary"
                            sx={{
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                            }}
                          >
                            {notification.message}
                          </Typography>
                          <Typography component="span" variant="caption" color="text.disabled" sx={{ display: 'block', mt: 0.5 }}>
                            {getTimeAgo(notification.timestamp)}
                          </Typography>
                        </>
                      }
                    />
                  </ListItem>
                  {index < notifications.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          )}
        </Box>
      </Menu>

      {/* Rejection Fix Dialog */}
      <RejectionFixDialog
        open={rejectionDialogOpen}
        onClose={() => {
          setRejectionDialogOpen(false)
          setSelectedTimeEntryId(null)
          // Refresh notifications after closing
          fetchNotifications()
        }}
        timeEntryId={selectedTimeEntryId}
      />
    </>
  )
}
