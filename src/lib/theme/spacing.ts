// Consistent spacing system for the application
export const spacing = {
  // Base unit: 8px (MUI default)
  xs: 0.5,    // 4px
  sm: 1,      // 8px
  md: 2,      // 16px
  lg: 3,      // 24px
  xl: 4,      // 32px
  xxl: 5,     // 40px
} as const

// Page-level spacing
export const pageSpacing = {
  sectionGap: 3,          // 24px between major sections
  cardGridGap: 2,         // 16px between cards in a grid
  elementGap: 2,          // 16px between elements
  contentPadding: 3,      // 24px padding for content areas
} as const

// Consistent card styles
export const cardStyles = {
  root: {
    height: '100%',
    transition: 'all 0.2s ease-in-out',
    '&:hover': {
      boxShadow: 3,
      transform: 'translateY(-2px)',
    },
  },
  content: {
    p: 2.5, // 20px padding
  },
} as const

// Button group spacing
export const buttonGroupStyles = {
  container: {
    display: 'flex',
    gap: 1.5, // 12px between buttons
    flexWrap: 'wrap',
  },
  mobileContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: 1,
    width: '100%',
  },
} as const

// Stat card specific styles
export const statCardStyles = {
  iconBox: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 48,
    height: 48,
    borderRadius: '12px',
    flexShrink: 0,
  },
  content: {
    display: 'flex',
    alignItems: 'center',
    gap: 2,
  },
} as const

// Table styles
export const tableStyles = {
  container: {
    borderRadius: 2,
    overflow: 'hidden',
  },
  headerCell: {
    fontWeight: 600,
    backgroundColor: 'background.default',
  },
} as const