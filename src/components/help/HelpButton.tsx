'use client'

import React, { useState } from 'react'
import {
  Fab,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Typography,
} from '@mui/material'
import {
  Help as HelpIcon,
  PersonAdd as CustomerIcon,
  Work as JobIcon,
  AccessTime as TimeIcon,
  CheckCircle as ApprovalIcon,
} from '@mui/icons-material'
import { useTutorial, TutorialKey } from './TutorialContext'
import { useRole } from '@/hooks/useAuth'
import TutorialOverlay from './TutorialOverlay'

// Define which tutorials each role can see
const TUTORIAL_ROLES: Record<TutorialKey, string[]> = {
  createCustomer: ['OWNER_ADMIN', 'FOREMAN'],
  createJob: ['OWNER_ADMIN', 'FOREMAN'],
  enterTime: ['OWNER_ADMIN', 'FOREMAN', 'EMPLOYEE'], // Everyone can enter time
  approveTime: ['OWNER_ADMIN', 'FOREMAN'],
}

interface TutorialMenuItem {
  key: TutorialKey
  label: string
  icon: React.ReactNode
}

const ALL_TUTORIALS: TutorialMenuItem[] = [
  { key: 'createCustomer', label: 'How to Create a Customer', icon: <CustomerIcon fontSize="small" /> },
  { key: 'createJob', label: 'How to Create a Job', icon: <JobIcon fontSize="small" /> },
  { key: 'enterTime', label: 'How to Enter Time', icon: <TimeIcon fontSize="small" /> },
  { key: 'approveTime', label: 'How to Approve Time', icon: <ApprovalIcon fontSize="small" /> },
]

export default function HelpButton() {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const { activeTutorial, startTutorial } = useTutorial()
  const { role } = useRole()
  const open = Boolean(anchorEl)

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleClose = () => {
    setAnchorEl(null)
  }

  const handleStartTutorial = (tutorialKey: TutorialKey) => {
    handleClose()
    startTutorial(tutorialKey)
  }

  // Filter tutorials based on user role
  const visibleTutorials = ALL_TUTORIALS.filter(tutorial => {
    const allowedRoles = TUTORIAL_ROLES[tutorial.key]
    return role && allowedRoles.includes(role)
  })

  // Don't show help button if user has no tutorials available
  if (visibleTutorials.length === 0 && !activeTutorial) {
    return <TutorialOverlay />
  }

  return (
    <>
      {/* Floating Help Button - only show when no tutorial is active */}
      {!activeTutorial && (
        <Fab
          color="primary"
          size="medium"
          onClick={handleClick}
          sx={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            zIndex: 1000,
          }}
          aria-label="help"
        >
          <HelpIcon />
        </Fab>
      )}

      {/* Dropdown Menu */}
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
      >
        <Typography sx={{ px: 2, py: 1, fontWeight: 'bold', color: 'text.secondary' }}>
          Interactive Tutorials
        </Typography>
        <Typography sx={{ px: 2, pb: 1, color: 'text.secondary', fontSize: '0.75rem' }}>
          Follow along step-by-step
        </Typography>
        <Divider />

        {visibleTutorials.map(tutorial => (
          <MenuItem key={tutorial.key} onClick={() => handleStartTutorial(tutorial.key)}>
            <ListItemIcon>{tutorial.icon}</ListItemIcon>
            <ListItemText>{tutorial.label}</ListItemText>
          </MenuItem>
        ))}
      </Menu>

      {/* Tutorial Overlay - renders when a tutorial is active */}
      <TutorialOverlay />
    </>
  )
}
