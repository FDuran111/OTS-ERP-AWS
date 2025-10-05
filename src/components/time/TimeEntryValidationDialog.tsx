'use client'

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Alert,
  AlertTitle,
  Box,
  Typography,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
} from '@mui/material'
import {
  Warning as WarningIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  CheckCircle as CheckIcon,
} from '@mui/icons-material'
import { ValidationWarning } from '@/lib/time-entry-validation'

interface TimeEntryValidationDialogProps {
  open: boolean
  warnings: ValidationWarning[]
  weeklyHours: number
  overtimeHours: number
  onConfirm: () => void
  onCancel: () => void
  onFixIssues?: () => void
  submitting?: boolean
}

export default function TimeEntryValidationDialog({
  open,
  warnings,
  weeklyHours,
  overtimeHours,
  onConfirm,
  onCancel,
  onFixIssues,
  submitting = false,
}: TimeEntryValidationDialogProps) {
  const hasErrors = warnings.some(w => w.severity === 'error')
  const hasWarnings = warnings.some(w => w.severity === 'warning')
  const hasInfo = warnings.some(w => w.severity === 'info')

  const getIcon = (severity: string) => {
    switch (severity) {
      case 'error':
        return <ErrorIcon color="error" />
      case 'warning':
        return <WarningIcon color="warning" />
      case 'info':
        return <InfoIcon color="info" />
      default:
        return <InfoIcon />
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'error':
        return 'error'
      case 'warning':
        return 'warning'
      case 'info':
        return 'info'
      default:
        return 'info'
    }
  }

  return (
    <Dialog open={open} onClose={onCancel} maxWidth="sm" fullWidth>
      <DialogTitle>
        {hasErrors ? 'Time Entry Issues Found' : 'Confirm Time Entry Submission'}
      </DialogTitle>

      <DialogContent>
        {warnings.length === 0 ? (
          <Alert severity="success" icon={<CheckIcon />}>
            <AlertTitle>All Checks Passed</AlertTitle>
            Your time entry looks good! Ready to submit.
          </Alert>
        ) : (
          <Box>
            <Alert
              severity={hasErrors ? 'error' : hasWarnings ? 'warning' : 'info'}
              sx={{ mb: 2 }}
            >
              <AlertTitle>
                {hasErrors
                  ? 'Please Fix Issues Before Submitting'
                  : hasWarnings
                  ? 'Please Review Warnings'
                  : 'Information'}
              </AlertTitle>
              {hasErrors
                ? 'Your time entry has errors that must be corrected.'
                : hasWarnings
                ? 'Please confirm the following warnings before submitting.'
                : 'Please review the following information.'}
            </Alert>

            <List>
              {warnings.map((warning, index) => (
                <Box key={index}>
                  <ListItem alignItems="flex-start">
                    <ListItemIcon sx={{ minWidth: 40 }}>
                      {getIcon(warning.severity)}
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Typography
                          variant="body2"
                          color={
                            warning.severity === 'error'
                              ? 'error'
                              : warning.severity === 'warning'
                              ? 'warning.main'
                              : 'text.primary'
                          }
                        >
                          {warning.message}
                        </Typography>
                      }
                    />
                  </ListItem>
                  {index < warnings.length - 1 && <Divider component="li" />}
                </Box>
              ))}
            </List>

            <Box sx={{ mt: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
              <Typography variant="subtitle2" gutterBottom>
                Weekly Summary
              </Typography>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="body2" color="text.secondary">
                  Total Hours This Week:
                </Typography>
                <Typography variant="body1" fontWeight="medium">
                  {weeklyHours.toFixed(1)} hours
                </Typography>
              </Box>
              {overtimeHours > 0 && (
                <Box display="flex" justifyContent="space-between" alignItems="center" mt={1}>
                  <Typography variant="body2" color="text.secondary">
                    Overtime Hours:
                  </Typography>
                  <Typography variant="body1" fontWeight="medium" color="warning.main">
                    {overtimeHours.toFixed(1)} hours
                  </Typography>
                </Box>
              )}
            </Box>
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
        {onFixIssues && hasErrors && (
          <Button onClick={onFixIssues} color="primary" disabled={submitting}>
            Fix Issues
          </Button>
        )}
        {!hasErrors && (
          <Button
            onClick={onConfirm}
            variant="contained"
            color={hasWarnings ? 'warning' : 'primary'}
            disabled={submitting}
          >
            {hasWarnings ? 'Submit Anyway' : 'Confirm & Submit'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  )
}
