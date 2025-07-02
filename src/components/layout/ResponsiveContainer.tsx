'use client'

import {
  Box,
  Typography,
  Breadcrumbs,
  Link,
  useTheme,
  useMediaQuery,
} from '@mui/material'
import {
  Home as HomeIcon,
  NavigateNext as NavigateNextIcon,
} from '@mui/icons-material'
import { ReactNode } from 'react'
import { useRouter } from 'next/navigation'

interface BreadcrumbItem {
  label: string
  path?: string
  icon?: ReactNode
}

interface ResponsiveContainerProps {
  children: ReactNode
  title?: string
  subtitle?: string
  breadcrumbs?: BreadcrumbItem[]
  actions?: ReactNode
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | false
  className?: string
}

export default function ResponsiveContainer({
  children,
  title,
  subtitle,
  breadcrumbs,
  actions,
  maxWidth = 'xl',
  className = ''
}: ResponsiveContainerProps) {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const router = useRouter()

  const handleBreadcrumbClick = (path?: string) => {
    if (path) {
      router.push(path)
    }
  }

  return (
    <Box
      className={`
        w-full flex flex-col
        ${className}
      `}
      sx={{
        maxWidth: '100%',
        // Much smaller padding to reduce empty space
        px: { 
          xs: 2,      // mobile: 16px (unchanged)
          sm: 2,      // tablet: 16px  
          md: 1,      // desktop: 8px
          lg: 1       // large desktop: 8px
        },
      }}
    >
      {/* Header Section */}
      {(title || breadcrumbs) && (
        <Box className="mb-6">
          {/* Breadcrumbs */}
          {breadcrumbs && breadcrumbs.length > 0 && (
            <Breadcrumbs
              separator={<NavigateNextIcon fontSize="small" />}
              className="mb-4"
              sx={{
                '& .MuiBreadcrumbs-separator': {
                  color: 'text.secondary',
                },
              }}
            >
              {breadcrumbs.map((item, index) => {
                const isLast = index === breadcrumbs.length - 1
                
                if (isLast) {
                  return (
                    <Box
                      key={index}
                      className="flex items-center gap-1 text-gray-500 dark:text-gray-400"
                    >
                      {item.icon}
                      <Typography
                        variant="body2"
                        className="font-medium"
                      >
                        {item.label}
                      </Typography>
                    </Box>
                  )
                }
                
                return (
                  <Link
                    key={index}
                    component="button"
                    variant="body2"
                    onClick={() => handleBreadcrumbClick(item.path)}
                    className="
                      flex items-center gap-1 no-underline
                      text-blue-600 dark:text-blue-400
                      hover:text-blue-800 dark:hover:text-blue-300
                      transition-colors duration-200
                    "
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.5,
                      textDecoration: 'none',
                      cursor: 'pointer',
                      '&:hover': {
                        textDecoration: 'underline',
                      },
                    }}
                  >
                    {item.icon}
                    {item.label}
                  </Link>
                )
              })}
            </Breadcrumbs>
          )}

          {/* Title and Actions */}
          <Box
            className={`
              flex items-start justify-between
              ${isMobile ? 'flex-col gap-4' : 'flex-row gap-6'}
            `}
          >
            <Box className="flex-1 min-w-0">
              {title && (
                <Typography
                  variant={isMobile ? "h4" : "h3"}
                  component="h1"
                  className="
                    font-bold text-gray-900 dark:text-gray-100
                    mb-2 truncate
                  "
                  sx={{
                    fontSize: {
                      xs: '1.75rem',
                      sm: '2rem',
                      md: '2.5rem',
                    },
                    fontWeight: 700,
                  }}
                >
                  {title}
                </Typography>
              )}
              
              {subtitle && (
                <Typography
                  variant={isMobile ? "body1" : "h6"}
                  className="text-gray-600 dark:text-gray-400 max-w-3xl"
                  sx={{
                    fontSize: {
                      xs: '1rem',
                      sm: '1.125rem',
                      md: '1.25rem',
                    },
                  }}
                >
                  {subtitle}
                </Typography>
              )}
            </Box>

            {/* Actions */}
            {actions && (
              <Box
                className={`
                  flex-shrink-0
                  ${isMobile ? 'w-full' : 'flex items-center gap-2'}
                `}
              >
                {actions}
              </Box>
            )}
          </Box>
        </Box>
      )}

      {/* Content */}
      <Box
        className="flex-1 w-full overflow-auto"
        sx={{
          '& > *': {
            maxWidth: '100%',
          },
        }}
      >
        {children}
      </Box>
    </Box>
  )
}

// Predefined responsive breakpoint helpers
export const ResponsiveBreakpoints = {
  mobile: 'xs',
  tablet: 'sm', 
  desktop: 'md',
  large: 'lg',
  xlarge: 'xl',
} as const

// Common responsive spacing utilities
export const ResponsiveSpacing = {
  container: {
    xs: 2,
    sm: 3,
    md: 4,
    lg: 6,
  },
  section: {
    xs: 3,
    sm: 4,
    md: 6,
  },
  component: {
    xs: 2,
    sm: 3,
  },
} as const