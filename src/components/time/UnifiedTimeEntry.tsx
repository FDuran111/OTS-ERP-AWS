'use client'

import { useState } from 'react'
import { Box, Tabs, Tab, Card, CardContent, Typography, Alert } from '@mui/material'
import { AccessTime, Timer, GridView } from '@mui/icons-material'
import MobileTimeClock from '../time-tracking/MobileTimeClock'
import SimpleTimeEntry from './SimpleTimeEntry'
import MultiJobTimeEntry from './MultiJobTimeEntry'

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
      id={`time-entry-tabpanel-${index}`}
      aria-labelledby={`time-entry-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  )
}

interface UnifiedTimeEntryProps {
  userId: string
  userName?: string
  onTimeEntryCreated?: () => void
  defaultTab?: number
}

export default function UnifiedTimeEntry({
  userId,
  userName,
  onTimeEntryCreated,
  defaultTab = 0
}: UnifiedTimeEntryProps) {
  const [activeTab, setActiveTab] = useState(defaultTab)

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue)
  }

  const handleEntryCreated = () => {
    if (onTimeEntryCreated) {
      onTimeEntryCreated()
    }
    window.dispatchEvent(new Event('time-entry-updated'))
  }

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Time Entry
        </Typography>

        <Alert severity="info" sx={{ mb: 2 }}>
          <strong>Choose your entry method:</strong>
          <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
            <li><strong>Quick Clock:</strong> Use when actively on a job site - track time in real-time with breaks</li>
            <li><strong>Manual Entry:</strong> Use for past time or when you know exact start/end times</li>
            <li><strong>Multi-Job:</strong> Use when you worked on multiple jobs in one day</li>
          </ul>
        </Alert>

        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            aria-label="time entry methods"
            variant="fullWidth"
          >
            <Tab
              icon={<AccessTime />}
              label="Quick Clock"
              id="time-entry-tab-0"
              aria-controls="time-entry-tabpanel-0"
            />
            <Tab
              icon={<Timer />}
              label="Manual Entry"
              id="time-entry-tab-1"
              aria-controls="time-entry-tabpanel-1"
            />
            <Tab
              icon={<GridView />}
              label="Multi-Job"
              id="time-entry-tab-2"
              aria-controls="time-entry-tabpanel-2"
            />
          </Tabs>
        </Box>

        <TabPanel value={activeTab} index={0}>
          <MobileTimeClock userId={userId} userName={userName} />
        </TabPanel>

        <TabPanel value={activeTab} index={1}>
          <SimpleTimeEntry onTimeEntryCreated={handleEntryCreated} noCard={true} />
        </TabPanel>

        <TabPanel value={activeTab} index={2}>
          <MultiJobTimeEntry onTimeEntriesCreated={handleEntryCreated} />
        </TabPanel>
      </CardContent>
    </Card>
  )
}
