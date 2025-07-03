'use client'

import {
  Fab,
  Box,
  Typography,
  Backdrop,
  useTheme,
  Zoom,
} from '@mui/material'
import {
  Add as AddIcon,
  Work as JobsIcon,
  People as CustomersIcon,
  Assignment as LeadsIcon,
  Inventory as MaterialsIcon,
  Close as CloseIcon,
} from '@mui/icons-material'
import { useAuth } from '@/hooks/useAuth'
import { UserRole } from '@/lib/auth'

interface User {
  id: string
  name: string
  email: string
  role: UserRole
}

interface MobileQuickActionsProps {
  open: boolean
  onClose: () => void
  onNavigate: (path: string) => void
  user: User
}

interface QuickAction {
  title: string
  icon: React.ReactElement
  path: string
  color: 'primary' | 'secondary' | 'success' | 'warning' | 'error'
  roles: UserRole[]
}

const quickActions: QuickAction[] = [
  {
    title: 'New Job',
    icon: <JobsIcon />,
    path: '/jobs/new',
    color: 'primary',
    roles: ['OWNER_ADMIN']
  },
  {
    title: 'New Customer',
    icon: <CustomersIcon />,
    path: '/customers/new',
    color: 'secondary',
    roles: ['OWNER_ADMIN', 'FOREMAN']
  },
  {
    title: 'New Lead',
    icon: <LeadsIcon />,
    path: '/leads/new',
    color: 'success',
    roles: ['OWNER_ADMIN', 'FOREMAN']
  },
  {
    title: 'Material Order',
    icon: <MaterialsIcon />,
    path: '/purchase-orders/new',
    color: 'warning',
    roles: ['OWNER_ADMIN', 'FOREMAN']
  }
]

export default function MobileQuickActions({
  open,
  onClose,
  onNavigate,
  user
}: MobileQuickActionsProps) {
  const { hasRole } = useAuth()
  const theme = useTheme()

  // Filter actions based on user role
  const availableActions = quickActions.filter(action =>
    hasRole(action.roles)
  )

  const handleActionClick = (path: string) => {
    onNavigate(path)
    onClose()
  }

  return (
    <>
      {/* Backdrop */}
      <Backdrop
        open={open}
        onClick={onClose}
        className="z-40"
        sx={{
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(4px)',
        }}
      />

      {/* Quick Actions Menu */}
      {open && (
        <Box
          className="fixed bottom-36 right-4 z-50 flex flex-col gap-3"
          sx={{
            '& > :nth-child(1)': {
              animationDelay: '0ms',
            },
            '& > :nth-child(2)': {
              animationDelay: '50ms',
            },
            '& > :nth-child(3)': {
              animationDelay: '100ms',
            },
            '& > :nth-child(4)': {
              animationDelay: '150ms',
            }
          }}
        >
          {/* Close Button */}
          <Zoom in={open} timeout={300} style={{ transitionDelay: '0ms' }}>
            <Box className="flex items-center justify-end mb-2">
              <Fab
                size="small"
                onClick={onClose}
                className="bg-gray-600 hover:bg-gray-700"
                sx={{
                  backgroundColor: 'grey.600',
                  color: 'white',
                  '&:hover': {
                    backgroundColor: 'grey.700',
                  },
                  boxShadow: theme.shadows[4],
                }}
              >
                <CloseIcon />
              </Fab>
            </Box>
          </Zoom>

          {/* Action Buttons */}
          {availableActions.map((action, index) => (
            <Zoom
              key={action.title}
              in={open}
              timeout={300}
              style={{ transitionDelay: `${(index + 1) * 50}ms` }}
            >
              <Box className="flex items-center">
                {/* Action Label */}
                <Box
                  className="bg-white dark:bg-gray-800 px-3 py-2 rounded-lg mr-3 shadow-lg"
                  sx={{
                    boxShadow: theme.shadows[4],
                    border: 1,
                    borderColor: 'divider',
                  }}
                >
                  <Typography
                    variant="body2"
                    className="font-medium text-gray-900 dark:text-gray-100 whitespace-nowrap"
                  >
                    {action.title}
                  </Typography>
                </Box>

                {/* Action Button */}
                <Fab
                  color={action.color}
                  onClick={() => handleActionClick(action.path)}
                  sx={
                    {
                      boxShadow: theme.shadows[6],
                      '&:hover': {
                        transform: 'scale(1.1)',
                        transition: 'transform 0.2s ease-in-out'
                      }
                    }
                  }
                >
                  {action.icon}
                </Fab>
              </Box>
            </Zoom>
          ))}
        </Box>
      )}
    </>
  )
}