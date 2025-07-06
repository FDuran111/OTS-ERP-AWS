'use client'

import { Box, Typography, Switch, FormControlLabel, Paper, IconButton } from '@mui/material'
import { useState, useEffect } from 'react'
import { Close as CloseIcon } from '@mui/icons-material'

export default function LayoutDebugger() {
  const [enabled, setEnabled] = useState(false)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Check if debug mode is enabled in localStorage
    const debugEnabled = localStorage.getItem('layout-debug') === 'true'
    setEnabled(debugEnabled)
    setVisible(debugEnabled)
  }, [])

  useEffect(() => {
    if (enabled) {
      // Add debug classes to the document
      document.documentElement.classList.add('layout-debug')
      
      // Add debug styles
      const style = document.createElement('style')
      style.id = 'layout-debug-styles'
      style.innerHTML = `
        /* HTML Element - Lime border */
        .layout-debug html {
          border: 3px solid lime !important;
          position: relative;
        }
        .layout-debug html::before {
          content: 'HTML';
          position: absolute;
          top: 0;
          left: 0;
          background: lime;
          color: black;
          padding: 2px 8px;
          font-size: 10px;
          font-weight: bold;
          z-index: 99999;
          pointer-events: none;
        }

        /* Body Element - Cyan border */
        .layout-debug body {
          border: 3px solid cyan !important;
          position: relative;
        }
        .layout-debug body::before {
          content: 'Body';
          position: absolute;
          top: 20px;
          left: 0;
          background: cyan;
          color: black;
          padding: 2px 8px;
          font-size: 10px;
          font-weight: bold;
          z-index: 99999;
          pointer-events: none;
        }

        /* ResponsiveLayout outer Box - Purple border */
        .layout-debug .responsive-layout {
          border: 3px solid purple !important;
          position: relative;
        }
        .layout-debug .responsive-layout::before {
          content: 'ResponsiveLayout';
          position: absolute;
          top: 0;
          left: 0;
          background: purple;
          color: white;
          padding: 2px 8px;
          font-size: 10px;
          font-weight: bold;
          z-index: 10000;
          pointer-events: none;
        }

        /* Main content area - Yellow border */
        .layout-debug .main-content-area {
          border: 3px solid yellow !important;
          position: relative;
        }
        .layout-debug .main-content-area::before {
          content: 'Main Content';
          position: absolute;
          top: 0;
          right: 0;
          background: yellow;
          color: black;
          padding: 2px 8px;
          font-size: 10px;
          font-weight: bold;
          z-index: 10000;
          pointer-events: none;
        }

        /* Scrollable content container - Pink border */
        .layout-debug .scrollable-content {
          border: 3px solid pink !important;
          position: relative;
        }
        .layout-debug .scrollable-content::before {
          content: 'Scrollable Content';
          position: absolute;
          top: 20px;
          right: 0;
          background: pink;
          color: black;
          padding: 2px 8px;
          font-size: 10px;
          font-weight: bold;
          z-index: 10000;
          pointer-events: none;
        }

        /* ResponsiveContainer - Orange border */
        .layout-debug .responsive-container {
          border: 3px solid orange !important;
          position: relative;
        }
        .layout-debug .responsive-container::before {
          content: 'ResponsiveContainer';
          position: absolute;
          top: 40px;
          left: 0;
          background: orange;
          color: black;
          padding: 2px 8px;
          font-size: 10px;
          font-weight: bold;
          z-index: 10000;
          pointer-events: none;
        }

        /* Dashboard content wrapper - Red border */
        .layout-debug .dashboard-content-wrapper {
          border: 3px solid red !important;
          position: relative;
        }
        .layout-debug .dashboard-content-wrapper::before {
          content: 'Dashboard Wrapper';
          position: absolute;
          bottom: 0;
          left: 0;
          background: red;
          color: white;
          padding: 2px 8px;
          font-size: 10px;
          font-weight: bold;
          z-index: 10000;
          pointer-events: none;
        }

        /* Low stock notification - Blue border */
        .layout-debug .low-stock-notification {
          border: 3px solid blue !important;
          position: relative;
        }
        .layout-debug .low-stock-notification::before {
          content: 'Low Stock Alert';
          position: absolute;
          top: 0;
          left: 0;
          background: blue;
          color: white;
          padding: 2px 8px;
          font-size: 10px;
          font-weight: bold;
          z-index: 10000;
          pointer-events: none;
        }

        /* Grid container - Green border */
        .layout-debug .MuiGrid-container {
          border: 3px solid green !important;
          position: relative;
        }
        .layout-debug .MuiGrid-container::after {
          content: 'Grid Container';
          position: absolute;
          bottom: 0;
          right: 0;
          background: green;
          color: white;
          padding: 2px 6px;
          font-size: 9px;
          font-weight: bold;
          z-index: 1000;
          pointer-events: none;
        }

        /* Additional layout components */
        .layout-debug .responsive-app-bar {
          border: 3px solid #ff00ff !important;
          position: relative;
        }
        .layout-debug .responsive-app-bar::before {
          content: 'AppBar';
          position: absolute;
          bottom: 0;
          right: 0;
          background: #ff00ff;
          color: white;
          padding: 2px 8px;
          font-size: 10px;
          font-weight: bold;
          z-index: 10000;
          pointer-events: none;
        }

        /* Cards */
        .layout-debug .MuiCard-root {
          border: 2px dashed #0080ff !important;
          position: relative;
        }
        .layout-debug .MuiCard-root::before {
          content: 'Card';
          position: absolute;
          top: 0;
          right: 0;
          background: #0080ff;
          color: white;
          padding: 2px 6px;
          font-size: 9px;
          font-weight: bold;
          z-index: 1000;
          pointer-events: none;
        }

        /* Grid Items */
        .layout-debug .MuiGrid-item {
          border: 1px dotted green !important;
        }

        /* Box Components */
        .layout-debug .MuiBox-root {
          outline: 1px dotted #808080 !important;
          outline-offset: -1px;
        }

        /* Mobile Specific */
        .layout-debug .mobile-layout {
          border: 3px solid #ff1493 !important;
          position: relative;
        }
        .layout-debug .mobile-layout::before {
          content: 'MobileLayout';
          position: absolute;
          top: 0;
          left: 0;
          background: #ff1493;
          color: white;
          padding: 2px 8px;
          font-size: 10px;
          font-weight: bold;
          z-index: 10000;
          pointer-events: none;
        }

        /* Show component boundaries on hover */
        .layout-debug *:hover {
          outline-width: 3px !important;
          outline-style: solid !important;
          outline-color: rgba(255, 0, 0, 0.5) !important;
        }
      `
      document.head.appendChild(style)
    } else {
      // Remove debug classes and styles
      document.documentElement.classList.remove('layout-debug')
      const debugStyle = document.getElementById('layout-debug-styles')
      if (debugStyle) {
        debugStyle.remove()
      }
    }
  }, [enabled])

  const toggleDebug = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.checked
    setEnabled(newValue)
    localStorage.setItem('layout-debug', newValue.toString())
  }

  const handleClose = () => {
    setVisible(false)
  }

  if (!visible) return null

  return (
    <Paper
      elevation={8}
      sx={{
        position: 'fixed',
        bottom: 80,
        right: 20,
        zIndex: 9999,
        p: 2,
        backgroundColor: 'background.paper',
        maxWidth: 300,
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
          Layout Debugger
        </Typography>
        <IconButton size="small" onClick={handleClose}>
          <CloseIcon />
        </IconButton>
      </Box>
      
      <FormControlLabel
        control={
          <Switch
            checked={enabled}
            onChange={toggleDebug}
            color="primary"
          />
        }
        label="Show Layout Boundaries"
      />
      
      <Typography variant="caption" display="block" sx={{ mt: 2, mb: 1 }}>
        Color Legend:
      </Typography>
      
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ width: 20, height: 12, backgroundColor: 'lime' }} />
          <Typography variant="caption">HTML Element</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ width: 20, height: 12, backgroundColor: 'cyan' }} />
          <Typography variant="caption">Body Element</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ width: 20, height: 12, backgroundColor: 'purple' }} />
          <Typography variant="caption">ResponsiveLayout</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ width: 20, height: 12, backgroundColor: 'yellow' }} />
          <Typography variant="caption">Main Content</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ width: 20, height: 12, backgroundColor: 'pink' }} />
          <Typography variant="caption">Scrollable Content</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ width: 20, height: 12, backgroundColor: 'orange' }} />
          <Typography variant="caption">ResponsiveContainer</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ width: 20, height: 12, backgroundColor: 'red' }} />
          <Typography variant="caption">Dashboard Wrapper</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ width: 20, height: 12, backgroundColor: 'blue' }} />
          <Typography variant="caption">Low Stock Alert</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ width: 20, height: 12, backgroundColor: 'green' }} />
          <Typography variant="caption">Grid Container</Typography>
        </Box>
      </Box>

      <Typography variant="caption" display="block" sx={{ mt: 2, fontStyle: 'italic' }}>
        Hover over elements to highlight them. This tool helps identify layout issues and component boundaries.
      </Typography>
    </Paper>
  )
}