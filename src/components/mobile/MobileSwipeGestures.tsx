'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Box, useTheme } from '@mui/material'

interface SwipeHandler {
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  onSwipeUp?: () => void
  onSwipeDown?: () => void
}

interface UseMobileSwipeProps {
  threshold?: number
  velocity?: number
  preventDefaultTouchmove?: boolean
  disabled?: boolean
}

export function useMobileSwipe({
  threshold = 50,
  velocity = 0.3,
  preventDefaultTouchmove = false,
  disabled = false
}: UseMobileSwipeProps = {}) {
  const [isSwiping, setIsSwiping] = useState(false)
  const touchStart = useRef<{ x: number; y: number; time: number } | null>(null)
  const touchEnd = useRef<{ x: number; y: number; time: number } | null>(null)

  const handlers = useRef<SwipeHandler>({})

  const setHandlers = useCallback((newHandlers: SwipeHandler) => {
    handlers.current = newHandlers
  }, [])

  const onTouchStart = useCallback((e: TouchEvent) => {
    if (disabled) return
    
    const touch = e.targetTouches[0]
    touchStart.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now()
    }
    touchEnd.current = null
    setIsSwiping(true)
  }, [disabled])

  const onTouchMove = useCallback((e: TouchEvent) => {
    if (disabled || !touchStart.current) return
    
    if (preventDefaultTouchmove) {
      e.preventDefault()
    }
  }, [disabled, preventDefaultTouchmove])

  const onTouchEnd = useCallback((e: TouchEvent) => {
    if (disabled || !touchStart.current) return

    const touch = e.changedTouches[0]
    touchEnd.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now()
    }

    const deltaX = touchEnd.current.x - touchStart.current.x
    const deltaY = touchEnd.current.y - touchStart.current.y
    const deltaTime = touchEnd.current.time - touchStart.current.time
    const velocityX = Math.abs(deltaX) / deltaTime
    const velocityY = Math.abs(deltaY) / deltaTime

    // Check if swipe meets threshold and velocity requirements
    if (Math.abs(deltaX) > threshold && velocityX > velocity) {
      if (deltaX > 0 && handlers.current.onSwipeRight) {
        handlers.current.onSwipeRight()
      } else if (deltaX < 0 && handlers.current.onSwipeLeft) {
        handlers.current.onSwipeLeft()
      }
    } else if (Math.abs(deltaY) > threshold && velocityY > velocity) {
      if (deltaY > 0 && handlers.current.onSwipeDown) {
        handlers.current.onSwipeDown()
      } else if (deltaY < 0 && handlers.current.onSwipeUp) {
        handlers.current.onSwipeUp()
      }
    }

    setIsSwiping(false)
    touchStart.current = null
    touchEnd.current = null
  }, [disabled, threshold, velocity])

  const bindToElement = useCallback((element: HTMLElement | null) => {
    if (!element) return

    element.addEventListener('touchstart', onTouchStart, { passive: true })
    element.addEventListener('touchmove', onTouchMove, { passive: !preventDefaultTouchmove })
    element.addEventListener('touchend', onTouchEnd, { passive: true })

    return () => {
      element.removeEventListener('touchstart', onTouchStart)
      element.removeEventListener('touchmove', onTouchMove)
      element.removeEventListener('touchend', onTouchEnd)
    }
  }, [onTouchStart, onTouchMove, onTouchEnd, preventDefaultTouchmove])

  return {
    isSwiping,
    setHandlers,
    bindToElement,
    touchEvents: {
      onTouchStart,
      onTouchMove,
      onTouchEnd
    }
  }
}

// Higher-order component for swipe gestures
interface SwipeableProps {
  children: React.ReactNode
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  onSwipeUp?: () => void
  onSwipeDown?: () => void
  threshold?: number
  velocity?: number
  disabled?: boolean
  className?: string
  style?: React.CSSProperties
}

export function Swipeable({
  children,
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  threshold,
  velocity,
  disabled,
  className,
  style
}: SwipeableProps) {
  const elementRef = useRef<HTMLDivElement>(null)
  const { setHandlers, bindToElement } = useMobileSwipe({
    threshold,
    velocity,
    disabled
  })

  useEffect(() => {
    setHandlers({
      onSwipeLeft,
      onSwipeRight,
      onSwipeUp,
      onSwipeDown
    })
  }, [onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, setHandlers])

  useEffect(() => {
    return bindToElement(elementRef.current)
  }, [bindToElement])

  return (
    <div
      ref={elementRef}
      className={className}
      style={style}
    >
      {children}
    </div>
  )
}

// Pull-to-refresh component
interface PullToRefreshProps {
  children: React.ReactNode
  onRefresh: () => Promise<void>
  threshold?: number
  maxPullDistance?: number
  refreshingText?: string
  pullText?: string
  releaseText?: string
  disabled?: boolean
}

export function PullToRefresh({
  children,
  onRefresh,
  threshold = 80,
  maxPullDistance = 120,
  refreshingText = 'Refreshing...',
  pullText = 'Pull to refresh',
  releaseText = 'Release to refresh',
  disabled = false
}: PullToRefreshProps) {
  const [pullDistance, setPullDistance] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [canRefresh, setCanRefresh] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const startY = useRef<number>(0)
  const theme = useTheme()

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (disabled || isRefreshing) return
    
    // Only trigger if at top of container
    if (containerRef.current && containerRef.current.scrollTop === 0) {
      startY.current = e.touches[0].clientY
    }
  }, [disabled, isRefreshing])

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (disabled || isRefreshing || startY.current === 0) return

    const currentY = e.touches[0].clientY
    const deltaY = currentY - startY.current

    if (deltaY > 0) {
      e.preventDefault()
      const distance = Math.min(deltaY * 0.5, maxPullDistance)
      setPullDistance(distance)
      setCanRefresh(distance >= threshold)
    }
  }, [disabled, isRefreshing, threshold, maxPullDistance])

  const handleTouchEnd = useCallback(async () => {
    if (disabled || isRefreshing) return

    if (canRefresh && pullDistance >= threshold) {
      setIsRefreshing(true)
      try {
        await onRefresh()
      } finally {
        setIsRefreshing(false)
      }
    }
    
    setPullDistance(0)
    setCanRefresh(false)
    startY.current = 0
  }, [disabled, isRefreshing, canRefresh, pullDistance, threshold, onRefresh])

  useEffect(() => {
    const element = containerRef.current
    if (!element) return

    element.addEventListener('touchstart', handleTouchStart, { passive: true })
    element.addEventListener('touchmove', handleTouchMove, { passive: false })
    element.addEventListener('touchend', handleTouchEnd, { passive: true })

    return () => {
      element.removeEventListener('touchstart', handleTouchStart)
      element.removeEventListener('touchmove', handleTouchMove)
      element.removeEventListener('touchend', handleTouchEnd)
    }
  }, [handleTouchStart, handleTouchMove, handleTouchEnd])

  const getStatusText = () => {
    if (isRefreshing) return refreshingText
    if (canRefresh) return releaseText
    return pullText
  }

  return (
    <Box
      ref={containerRef}
      sx={{
        height: '100%',
        overflow: 'auto',
        position: 'relative',
        touchAction: 'pan-y'
      }}
    >
      {/* Pull indicator */}
      <Box
        sx={{
          position: 'absolute',
          top: -60,
          left: 0,
          right: 0,
          height: 60,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'background.paper',
          zIndex: 1000,
          transform: `translateY(${pullDistance}px)`,
          transition: pullDistance === 0 ? 'transform 0.2s ease-out' : 'none',
          borderBottom: pullDistance > 0 ? 1 : 0,
          borderColor: 'divider'
        }}
      >
        <Box
          sx={{
            width: 24,
            height: 24,
            border: 2,
            borderColor: canRefresh ? 'primary.main' : 'action.disabled',
            borderRadius: '50%',
            borderTopColor: 'transparent',
            animation: isRefreshing ? 'spin 1s linear infinite' : 'none',
            mr: 1,
            '@keyframes spin': {
              '0%': { transform: 'rotate(0deg)' },
              '100%': { transform: 'rotate(360deg)' }
            }
          }}
        />
        <Box sx={{ 
          color: canRefresh ? 'primary.main' : 'text.secondary',
          fontSize: '0.9rem',
          fontWeight: 500
        }}>
          {getStatusText()}
        </Box>
      </Box>

      {/* Content */}
      <Box
        sx={{
          transform: `translateY(${pullDistance}px)`,
          transition: pullDistance === 0 ? 'transform 0.2s ease-out' : 'none'
        }}
      >
        {children}
      </Box>
    </Box>
  )
}