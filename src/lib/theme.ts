'use client'

import { createTheme } from '@mui/material/styles'

declare module '@mui/material/styles' {
  interface Palette {
    electrical: {
      warning: string
      success: string
      urgent: string
      neutral: string
    }
  }
  interface PaletteOptions {
    electrical?: {
      warning?: string
      success?: string
      urgent?: string
      neutral?: string
    }
  }
}

export const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#E53E3E', // Ortmeier logo red
      light: '#FC8181',
      dark: '#C53030',
      contrastText: '#FFFFFF'
    },
    secondary: {
      main: '#FFF5F5', // Light red/white accent
      light: '#FFFFFF',
      dark: '#FED7D7',
      contrastText: '#1A202C'
    },
    background: {
      default: '#1A202C', // Dark navy background
      paper: '#2D3748',   // Slightly lighter for cards/panels
    },
    text: {
      primary: '#FFFFFF',
      secondary: '#CBD5E0',
    },
    // Custom electrical contractor colors
    electrical: {
      warning: '#F6E05E', // Safety yellow
      success: '#68D391', // Completion green  
      urgent: '#E53E3E',  // Ortmeier red for priority
      neutral: '#A0AEC0', // Gray for secondary info
    },
    divider: '#4A5568',
    error: {
      main: '#FC8181',
    },
    warning: {
      main: '#F6E05E',
    },
    info: {
      main: '#63B3ED',
    },
    success: {
      main: '#68D391',
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
        },
        containedPrimary: {
          backgroundColor: '#E53E3E',
          '&:hover': {
            backgroundColor: '#C53030',
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
          backgroundColor: '#1A202C',
          backgroundImage: 'none',
          borderRight: '1px solid #4A5568',
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
              borderColor: '#E53E3E',
            },
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
            backgroundColor: 'rgba(229, 62, 62, 0.08)',
          },
          '&.Mui-selected': {
            backgroundColor: 'rgba(229, 62, 62, 0.12)',
            '&:hover': {
              backgroundColor: 'rgba(229, 62, 62, 0.16)',
            },
          },
        },
      },
    },
  },
})