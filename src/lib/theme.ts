'use client'

import { createTheme } from '@mui/material/styles'

declare module '@mui/material/styles' {
  interface Palette {
    custom: {
      warning: string
      success: string
      urgent: string
      neutral: string
    }
  }
  interface PaletteOptions {
    custom?: {
      warning?: string
      success?: string
      urgent?: string
      neutral?: string
    }
  }
}

export const theme = createTheme({
  breakpoints: {
    values: {
      xs: 0,
      sm: 600,
      md: 900,
      lg: 1200,
      xl: 1536,
    },
  },
  palette: {
    mode: 'dark',
    primary: {
      main: '#1976d2', // Professional blue
      light: '#42a5f5',
      dark: '#1565c0',
      contrastText: '#FFFFFF'
    },
    secondary: {
      main: '#9c27b0', // Professional purple
      light: '#ba68c8',
      dark: '#7b1fa2',
      contrastText: '#FFFFFF'
    },
    background: {
      default: '#1A202C', // Dark navy background
      paper: '#2D3748',   // Slightly lighter for cards/panels
    },
    text: {
      primary: '#FFFFFF',
      secondary: '#CBD5E0',
    },
    // Custom status colors
    custom: {
      warning: '#F6E05E', // Warning yellow
      success: '#68D391', // Success green
      urgent: '#f44336',  // Urgent red
      neutral: '#A0AEC0', // Neutral gray
    },
    divider: '#4A5568',
    error: {
      main: '#f44336',
    },
    warning: {
      main: '#ff9800',
    },
    info: {
      main: '#2196f3',
    },
    success: {
      main: '#4caf50',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Arial", sans-serif',
    h1: {
      fontWeight: 600,
      color: '#FFFFFF',
    },
    h2: {
      fontWeight: 600,
      color: '#FFFFFF',
    },
    h3: {
      fontWeight: 600,
      color: '#FFFFFF',
    },
    h4: {
      fontWeight: 600,
      color: '#FFFFFF',
    },
    h5: {
      fontWeight: 500,
      color: '#FFFFFF',
    },
    h6: {
      fontWeight: 500,
      color: '#FFFFFF',
    },
    body1: {
      color: '#E2E8F0',
    },
    body2: {
      color: '#CBD5E0',
    }
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        // Global CSS overrides for mobile viewport
        html: {
          width: '100%',
          height: '100%',
          overflowX: 'hidden',
          WebkitTextSizeAdjust: '100%',
          MsTextSizeAdjust: '100%',
          textSizeAdjust: '100%',
          touchAction: 'manipulation',
        },
        body: {
          width: '100%',
          minHeight: '100vh',
          overflowX: 'hidden',
          touchAction: 'manipulation',
          WebkitFontSmoothing: 'antialiased',
          MozOsxFontSmoothing: 'grayscale',
        },
        '#__next, main': {
          width: '100%',
          overflowX: 'hidden',
        },
        // Fix input zoom on iOS
        'input, textarea, select': {
          fontSize: '16px !important',
          '@media (max-width: 768px)': {
            fontSize: '16px !important',
          },
        },
        // Prevent horizontal scroll
        '*': {
          maxWidth: '100vw',
          WebkitTapHighlightColor: 'transparent',
        },
        // Fix for iOS safe areas
        '@supports (-webkit-touch-callout: none)': {
          body: {
            paddingTop: 'env(safe-area-inset-top)',
            paddingBottom: 'env(safe-area-inset-bottom)',
            paddingLeft: 'env(safe-area-inset-left)',
            paddingRight: 'env(safe-area-inset-right)',
          },
        },
      },
    },
    // Container component mobile fixes
    MuiContainer: {
      defaultProps: {
        maxWidth: 'xl',
      },
      styleOverrides: {
        root: {
          paddingLeft: 16,
          paddingRight: 16,
          '@media (min-width: 600px)': {
            paddingLeft: 24,
            paddingRight: 24,
          },
          '@media (max-width: 600px)': {
            paddingLeft: '16px !important',
            paddingRight: '16px !important',
          },
        },
      },
    },
    // Dialog mobile fixes
    MuiDialog: {
      styleOverrides: {
        paper: {
          margin: 16,
          maxHeight: 'calc(100vh - 32px)',
          maxWidth: 'calc(100vw - 32px)',
          '@media (max-width: 600px)': {
            margin: 8,
            maxHeight: 'calc(100vh - 16px)',
            maxWidth: 'calc(100vw - 16px)',
            width: 'calc(100vw - 16px)',
          },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#2D3748',
          borderBottom: '1px solid #4A5568',
          boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
        }
      }
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: '#2D3748',
          border: '1px solid #4A5568',
          backgroundImage: 'none',
          boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
        }
      }
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 4,
          padding: '10px 30px',
          fontSize: '0.875rem',
          fontWeight: 500,
          minHeight: 44, // Apple Human Interface Guidelines
          '@media (max-width: 600px)': {
            minHeight: 48,
            padding: '12px 20px',
          },
        },
        containedPrimary: {
          backgroundColor: '#1976d2',
          '&:hover': {
            backgroundColor: '#1565c0',
          }
        }
      }
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: '#2D3748',
          border: '1px solid #4A5568',
        }
      }
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: '#2D3748',
          backgroundImage: 'none',
          borderRight: '1px solid #4A5568',
          maxWidth: '100vw',
          color: '#CBD5E0',
          '& .MuiListItemText-primary': {
            color: '#CBD5E0',
          },
          '& .MuiListItemIcon-root': {
            color: '#A0AEC0',
          },
          '& .MuiTypography-root': {
            color: '#CBD5E0',
          },
          '@media (max-width: 600px)': {
            width: '80vw',
            maxWidth: '320px',
          },
        }
      }
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: '1px solid #4A5568',
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        inputProps: {
          style: {
            fontSize: 16, // Prevent zoom on iOS
          },
        },
      },
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            '& fieldset': {
              borderColor: '#4A5568',
            },
            '&:hover fieldset': {
              borderColor: '#718096',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#1976d2',
            },
          },
          '& input': {
            fontSize: '16px !important',
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 4,
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          '&:hover': {
            backgroundColor: 'rgba(25, 118, 210, 0.08)',
          },
          '&.Mui-selected': {
            backgroundColor: 'rgba(25, 118, 210, 0.12)',
            '&:hover': {
              backgroundColor: 'rgba(25, 118, 210, 0.16)',
            },
          },
        },
      },
    },
  },
})