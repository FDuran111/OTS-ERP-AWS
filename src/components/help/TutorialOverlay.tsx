'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import {
  Box,
  Paper,
  Typography,
  Button,
  IconButton,
  Chip,
} from '@mui/material'
import {
  Close as CloseIcon,
  ArrowForward as NextIcon,
  ArrowBack as BackIcon,
  CheckCircle as DoneIcon,
} from '@mui/icons-material'
import { useTutorial, TUTORIALS } from './TutorialContext'

export default function TutorialOverlay() {
  const pathname = usePathname()
  const {
    activeTutorial,
    currentStep,
    nextStep,
    prevStep,
    endTutorial,
    getCurrentTutorial,
    getCurrentStep,
  } = useTutorial()

  const [targetRect, setTargetRect] = useState<DOMRect | null>(null)
  const [isVisible, setIsVisible] = useState(false)

  const tutorial = getCurrentTutorial()
  const step = getCurrentStep()

  // Find and highlight target element
  const findTarget = useCallback(() => {
    if (!step) {
      setTargetRect(null)
      return
    }

    // Try multiple selectors
    const selectors = step.target.split(', ')
    let element: Element | null = null

    for (const selector of selectors) {
      try {
        // Handle :has-text pseudo-selector
        if (selector.includes(':has-text(')) {
          const match = selector.match(/(.+):has-text\("(.+)"\)/)
          if (match) {
            const [, baseSelector, text] = match
            const elements = document.querySelectorAll(baseSelector)
            for (const el of elements) {
              if (el.textContent?.toLowerCase().includes(text.toLowerCase())) {
                element = el
                break
              }
            }
          }
        } else {
          element = document.querySelector(selector)
        }
        if (element) break
      } catch (e) {
        // Invalid selector, try next
      }
    }

    if (element) {
      const rect = element.getBoundingClientRect()
      setTargetRect(rect)

      // Scroll element into view if not visible
      const isInViewport = rect.top >= 0 && rect.bottom <= window.innerHeight
      if (!isInViewport) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    } else {
      setTargetRect(null)
    }
  }, [step])

  // Show overlay after a brief delay
  useEffect(() => {
    if (activeTutorial) {
      const timer = setTimeout(() => setIsVisible(true), 100)
      return () => clearTimeout(timer)
    } else {
      setIsVisible(false)
    }
  }, [activeTutorial])

  // Find target when step changes or page navigates
  useEffect(() => {
    if (!step) return

    // Small delay to let page render after navigation
    const timer = setTimeout(findTarget, 500)
    return () => clearTimeout(timer)
  }, [currentStep, pathname, findTarget, step])

  // Recalculate on window resize/scroll
  useEffect(() => {
    if (!activeTutorial) return

    const handleUpdate = () => findTarget()
    window.addEventListener('resize', handleUpdate)
    window.addEventListener('scroll', handleUpdate, true)

    // Also poll for changes (in case elements appear/disappear)
    const interval = setInterval(handleUpdate, 1000)

    return () => {
      window.removeEventListener('resize', handleUpdate)
      window.removeEventListener('scroll', handleUpdate, true)
      clearInterval(interval)
    }
  }, [activeTutorial, findTarget])

  if (!activeTutorial || !tutorial || !step || !isVisible) {
    return null
  }

  const isLastStep = currentStep >= tutorial.steps.length - 1
  const isFirstStep = currentStep === 0

  return (
    <>
      {/* Highlight ring around target element - NO blocking overlay */}
      {targetRect && (
        <Box
          sx={{
            position: 'fixed',
            top: targetRect.top - 4,
            left: targetRect.left - 4,
            width: targetRect.width + 8,
            height: targetRect.height + 8,
            borderRadius: 1,
            border: '3px solid #1976d2',
            backgroundColor: 'transparent',
            pointerEvents: 'none',
            zIndex: 9998, // Just below tutorial card, above modals
            animation: 'tutorialPulse 1.5s infinite',
            boxShadow: '0 0 20px rgba(25, 118, 210, 0.5)',
            '@keyframes tutorialPulse': {
              '0%': {
                borderColor: '#1976d2',
                boxShadow: '0 0 20px rgba(25, 118, 210, 0.5)',
              },
              '50%': {
                borderColor: '#64b5f6',
                boxShadow: '0 0 30px rgba(100, 181, 246, 0.7)',
              },
              '100%': {
                borderColor: '#1976d2',
                boxShadow: '0 0 20px rgba(25, 118, 210, 0.5)',
              },
            },
          }}
        />
      )}

      {/* Floating Tutorial Card - Fixed in bottom left, ALWAYS on top (above modals) */}
      <Paper
        elevation={24}
        sx={{
          position: 'fixed',
          bottom: 24,
          left: 24,
          zIndex: 9999, // Higher than MUI dialogs (1300) and modals
          width: 340,
          p: 2,
          borderRadius: 2,
          border: '2px solid',
          borderColor: 'primary.main',
          backgroundColor: 'background.paper',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        }}
      >
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip
              label={`${currentStep + 1}/${tutorial.steps.length}`}
              size="small"
              color="primary"
            />
            <Typography variant="subtitle2" color="text.secondary">
              {tutorial.title}
            </Typography>
          </Box>
          <IconButton size="small" onClick={endTutorial} title="Close tutorial">
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>

        {/* Step content */}
        <Typography variant="h6" sx={{ mb: 0.5, fontSize: '1.1rem' }}>
          {step.title}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {step.content}
        </Typography>

        {/* Target indicator */}
        {!targetRect && (
          <Typography variant="caption" color="warning.main" sx={{ display: 'block', mb: 1 }}>
            Looking for element... (it may be on a different page)
          </Typography>
        )}

        {/* Progress bar */}
        <Box sx={{ display: 'flex', gap: 0.5, mb: 2 }}>
          {tutorial.steps.map((_, index) => (
            <Box
              key={index}
              sx={{
                flex: 1,
                height: 4,
                borderRadius: 2,
                backgroundColor: index <= currentStep ? 'primary.main' : 'grey.300',
                transition: 'background-color 0.3s',
              }}
            />
          ))}
        </Box>

        {/* Navigation buttons */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Button
            size="small"
            onClick={prevStep}
            disabled={isFirstStep}
            startIcon={<BackIcon />}
          >
            Back
          </Button>

          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              size="small"
              variant="outlined"
              onClick={endTutorial}
            >
              Skip
            </Button>
            <Button
              size="small"
              variant="contained"
              onClick={isLastStep ? endTutorial : nextStep}
              endIcon={isLastStep ? <DoneIcon /> : <NextIcon />}
            >
              {isLastStep ? 'Done' : 'Next'}
            </Button>
          </Box>
        </Box>
      </Paper>
    </>
  )
}
