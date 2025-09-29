'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import ResponsiveLayout from '@/components/layout/ResponsiveLayout'
import ResponsiveContainer from '@/components/layout/ResponsiveContainer'
import {
  Box,
  Typography,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  Button,
  Divider,
  Alert,
  Tab,
  Tabs,
  Badge,
} from '@mui/material'
import {
  Notifications as NotificationsIcon,
  Work as JobIcon,
  Schedule as ScheduleIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  CheckCircle,
  Error as ErrorIcon,
  Delete as DeleteIcon,
  DoneAll as MarkAllReadIcon,
  Refresh as RefreshIcon,
  AccessTime as TimeIcon,
} from '@mui/icons-material'
import { useAuthCheck } from '@/hooks/useAuthCheck'

interface Notification {
  id: string
  type: 'job' | 'schedule' | 'system' | 'alert'
  title: string
  message: string
  timestamp: string
  read: boolean
  priority: 'low' | 'medium' | 'high'
  actionUrl?: string
}

// Mock data for now - will be replaced with API calls
const mockNotifications: Notification[] = [
  {
    id: '1',
    type: 'job',
    title: 'New Job Assigned',
    message: 'You have been assigned to Job #1234 - Customer: ABC Company',
    timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 mins ago
    read: false,
    priority: 'high',
    actionUrl: '/jobs/1234'
  },
  {
    id: '2',
    type: 'schedule',
    title: 'Schedule Change',
    message: 'Your schedule for tomorrow has been updated. Check your calendar.',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
    read: false,
    priority: 'medium',
    actionUrl: '/schedule'
  },
  {
    id: '3',
    type: 'system',
    title: 'Time Entry Reminder',
    message: 'Don\'t forget to submit your time entries for this week.',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
    read: true,
    priority: 'low',
    actionUrl: '/time'
  },
]

interface TabPanelProps {
  children?: React.ReactNode
  index: number
  value: number
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props
  
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`notifications-tabpanel-${index}`}
      aria-labelledby={`notifications-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 2 }}>{children}</Box>}
    </div>
  )
}

export default function NotificationsPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuthCheck()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [activeTab, setActiveTab] = useState(0)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (user) {
      fetchNotifications()
    }
  }, [user])

  const fetchNotifications = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/notifications')
      if (response.ok) {
        const data = await response.json()
        setNotifications(data)
      }
    } catch (error) {
      console.error('Error fetching notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  const unreadCount = notifications.filter(n => !n.read).length

  const handleMarkAsRead = async (id: string) => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId: id })
      })
      if (response.ok) {
        setNotifications(prev =>
          prev.map(n => n.id === id ? { ...n, read: true } : n)
        )
      }
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/notifications?id=${id}`, {
        method: 'DELETE'
      })
      if (response.ok) {
        setNotifications(prev => prev.filter(n => n.id !== id))
      }
    } catch (error) {
      console.error('Error deleting notification:', error)
    }
  }

  const handleMarkAllRead = async () => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAllRead: true })
      })
      if (response.ok) {
        setNotifications(prev =>
          prev.map(n => ({ ...n, read: true }))
        )
      }
    } catch (error) {
      console.error('Error marking all as read:', error)
    }
  }

  const handleRefresh = () => {
    fetchNotifications()
  }

  const handleNotificationClick = (notification: Notification) => {
    handleMarkAsRead(notification.id)
    if (notification.actionUrl) {
      router.push(notification.actionUrl)
    }
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'job':
        return <JobIcon />
      case 'schedule':
        return <ScheduleIcon />
      case 'alert':
        return <WarningIcon />
      default:
        return <InfoIcon />
    }
  }

  const getPriorityColor = (priority: string): 'error' | 'warning' | 'info' => {
    switch (priority) {
      case 'high':
        return 'error'
      case 'medium':
        return 'warning'
      default:
        return 'info'
    }
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)
    
    if (minutes < 60) {
      return `${minutes} minutes ago`
    } else if (hours < 24) {
      return `${hours} hours ago`
    } else if (days < 7) {
      return `${days} days ago`
    } else {
      return date.toLocaleDateString()
    }
  }

  const filteredNotifications = (filter: 'all' | 'unread') => {
    if (filter === 'unread') {
      return notifications.filter(n => !n.read)
    }
    return notifications
  }

  if (authLoading || !user) return null

  const actionButtons = (
    <Box sx={{ display: 'flex', gap: 1 }}>
      <IconButton onClick={handleRefresh} disabled={loading}>
        <RefreshIcon />
      </IconButton>
      <Button
        variant="outlined"
        startIcon={<MarkAllReadIcon />}
        onClick={handleMarkAllRead}
        disabled={unreadCount === 0}
        size="small"
      >
        Mark All Read
      </Button>
    </Box>
  )

  return (
    <ResponsiveLayout>
      <ResponsiveContainer
        title="Notifications"
        actions={actionButtons}
      >
        <Card>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs value={activeTab} onChange={(_, value) => setActiveTab(value)}>
              <Tab 
                label={
                  <Badge badgeContent={notifications.length} color="primary">
                    All
                  </Badge>
                } 
              />
              <Tab 
                label={
                  <Badge badgeContent={unreadCount} color="error">
                    Unread
                  </Badge>
                } 
              />
            </Tabs>
          </Box>

          <TabPanel value={activeTab} index={0}>
            {notifications.length === 0 ? (
              <Box sx={{ p: 4, textAlign: 'center' }}>
                <NotificationsIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                <Typography color="text.secondary">
                  No notifications
                </Typography>
              </Box>
            ) : (
              <List sx={{ p: 0 }}>
                {filteredNotifications('all').map((notification, index) => (
                  <Box key={notification.id}>
                    <ListItem
                      disablePadding
                      secondaryAction={
                        <IconButton
                          edge="end"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDelete(notification.id)
                          }}
                        >
                          <DeleteIcon />
                        </IconButton>
                      }
                    >
                      <ListItemButton
                        onClick={() => handleNotificationClick(notification)}
                        sx={{
                          opacity: notification.read ? 0.7 : 1,
                          backgroundColor: notification.read ? 'transparent' : 'action.hover',
                          '&:hover': {
                            backgroundColor: 'action.selected',
                          },
                        }}
                      >
                        <ListItemIcon>
                          {getIcon(notification.type)}
                        </ListItemIcon>
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography variant="subtitle2" sx={{ fontWeight: notification.read ? 400 : 600 }}>
                                {notification.title}
                              </Typography>
                              <Chip
                                label={notification.priority}
                                size="small"
                                color={getPriorityColor(notification.priority)}
                                sx={{ height: 20 }}
                              />
                            </Box>
                          }
                          secondary={
                            <>
                              <Typography component="span" variant="body2" color="text.secondary" display="block">
                                {notification.message}
                              </Typography>
                              <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                                <TimeIcon fontSize="small" />
                                <Typography component="span" variant="caption" color="text.secondary">
                                  {formatTimestamp(notification.timestamp)}
                                </Typography>
                              </Box>
                            </>
                          }
                        />
                      </ListItemButton>
                    </ListItem>
                    {index < filteredNotifications('all').length - 1 && <Divider />}
                  </Box>
                ))}
              </List>
            )}
          </TabPanel>

          <TabPanel value={activeTab} index={1}>
            {unreadCount === 0 ? (
              <Box sx={{ p: 4, textAlign: 'center' }}>
                <CheckCircle sx={{ fontSize: 48, color: 'success.main', mb: 2 }} />
                <Typography color="text.secondary">
                  All caught up! No unread notifications.
                </Typography>
              </Box>
            ) : (
              <List sx={{ p: 0 }}>
                {filteredNotifications('unread').map((notification, index) => (
                  <Box key={notification.id}>
                    <ListItem
                      disablePadding
                      secondaryAction={
                        <IconButton
                          edge="end"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDelete(notification.id)
                          }}
                        >
                          <DeleteIcon />
                        </IconButton>
                      }
                    >
                      <ListItemButton
                        onClick={() => handleNotificationClick(notification)}
                        sx={{
                          backgroundColor: 'action.hover',
                          '&:hover': {
                            backgroundColor: 'action.selected',
                          },
                        }}
                      >
                        <ListItemIcon>
                          {getIcon(notification.type)}
                        </ListItemIcon>
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                                {notification.title}
                              </Typography>
                              <Chip
                                label={notification.priority}
                                size="small"
                                color={getPriorityColor(notification.priority)}
                                sx={{ height: 20 }}
                              />
                            </Box>
                          }
                          secondary={
                            <>
                              <Typography component="span" variant="body2" color="text.secondary" display="block">
                                {notification.message}
                              </Typography>
                              <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                                <TimeIcon fontSize="small" />
                                <Typography component="span" variant="caption" color="text.secondary">
                                  {formatTimestamp(notification.timestamp)}
                                </Typography>
                              </Box>
                            </>
                          }
                        />
                      </ListItemButton>
                    </ListItem>
                    {index < filteredNotifications('unread').length - 1 && <Divider />}
                  </Box>
                ))}
              </List>
            )}
          </TabPanel>
        </Card>

        {/* Info Alert */}
        <Alert severity="info" sx={{ mt: 2 }}>
          <Typography variant="body2">
            <strong>Note:</strong> This is a preview of the notifications system. Real-time notifications will be implemented in a future update.
          </Typography>
        </Alert>
      </ResponsiveContainer>
    </ResponsiveLayout>
  )
}