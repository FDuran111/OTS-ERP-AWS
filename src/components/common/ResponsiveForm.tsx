'use client'

import {
  Box,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  Checkbox,
  FormControlLabel,
  RadioGroup,
  Radio,
  Switch,
  Autocomplete,
  Stack,
  Typography,
  Divider,
  useTheme,
  useMediaQuery,
  Paper,
  Grid,
} from '@mui/material'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns'
import { ReactNode } from 'react'

interface FormField {
  name: string
  label: string
  type: 'text' | 'email' | 'password' | 'number' | 'select' | 'multiselect' | 'checkbox' | 'radio' | 'switch' | 'date' | 'textarea' | 'autocomplete'
  required?: boolean
  placeholder?: string
  helperText?: string
  options?: { value: any; label: string }[]
  validation?: {
    min?: number
    max?: number
    minLength?: number
    maxLength?: number
    pattern?: RegExp
    custom?: (value: any) => string | undefined
  }
  disabled?: boolean
  fullWidth?: boolean
  gridSize?: {
    xs?: number
    sm?: number
    md?: number
    lg?: number
  }
  dependsOn?: string
  showWhen?: (values: any) => boolean
}

interface FormSection {
  title?: string
  description?: string
  fields: FormField[]
  collapsible?: boolean
  defaultCollapsed?: boolean
}

interface ResponsiveFormProps {
  sections: FormSection[]
  values: Record<string, any>
  errors: Record<string, string>
  onChange: (name: string, value: any) => void
  onSubmit: () => void
  onCancel?: () => void
  submitLabel?: string
  cancelLabel?: string
  loading?: boolean
  disabled?: boolean
  actions?: ReactNode
}

export default function ResponsiveForm({
  sections,
  values,
  errors,
  onChange,
  onSubmit,
  onCancel,
  submitLabel = 'Submit',
  cancelLabel = 'Cancel',
  loading = false,
  disabled = false,
  actions
}: ResponsiveFormProps) {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))

  const renderField = (field: FormField) => {
    // Check if field should be shown based on dependencies
    if (field.showWhen && !field.showWhen(values)) {
      return null
    }

    const fieldValue = values[field.name] || ''
    const fieldError = errors[field.name]
    const hasError = !!fieldError
    
    const commonProps = {
      fullWidth: field.fullWidth !== false,
      disabled: disabled || field.disabled,
      error: hasError,
      helperText: fieldError || field.helperText,
      required: field.required,
    }

    const handleChange = (value: any) => {
      onChange(field.name, value)
    }

    switch (field.type) {
      case 'text':
      case 'email':
      case 'password':
      case 'number':
        return (
          <TextField
            key={field.name}
            name={field.name}
            label={field.label}
            type={field.type}
            value={fieldValue}
            onChange={(e) => handleChange(e.target.value)}
            placeholder={field.placeholder}
            {...commonProps}
            className="mb-4"
          />
        )

      case 'textarea':
        return (
          <TextField
            key={field.name}
            name={field.name}
            label={field.label}
            value={fieldValue}
            onChange={(e) => handleChange(e.target.value)}
            placeholder={field.placeholder}
            multiline
            rows={4}
            {...commonProps}
            className="mb-4"
          />
        )

      case 'select':
        return (
          <FormControl key={field.name} {...commonProps} className="mb-4">
            <InputLabel>{field.label}</InputLabel>
            <Select
              value={fieldValue}
              onChange={(e) => handleChange(e.target.value)}
              label={field.label}
            >
              {field.options?.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
            {(fieldError || field.helperText) && (
              <FormHelperText error={hasError}>
                {fieldError || field.helperText}
              </FormHelperText>
            )}
          </FormControl>
        )

      case 'autocomplete':
        return (
          <Autocomplete
            key={field.name}
            options={field.options || []}
            getOptionLabel={(option) => option.label}
            value={field.options?.find(opt => opt.value === fieldValue) || null}
            onChange={(_, option) => handleChange(option?.value || '')}
            disabled={disabled || field.disabled}
            renderInput={(params) => (
              <TextField
                {...params}
                label={field.label}
                error={hasError}
                helperText={fieldError || field.helperText}
                required={field.required}
                placeholder={field.placeholder}
              />
            )}
            className="mb-4"
          />
        )

      case 'checkbox':
        return (
          <FormControlLabel
            key={field.name}
            control={
              <Checkbox
                checked={!!fieldValue}
                onChange={(e) => handleChange(e.target.checked)}
                disabled={disabled || field.disabled}
              />
            }
            label={field.label}
            className="mb-4"
          />
        )

      case 'switch':
        return (
          <FormControlLabel
            key={field.name}
            control={
              <Switch
                checked={!!fieldValue}
                onChange={(e) => handleChange(e.target.checked)}
                disabled={disabled || field.disabled}
              />
            }
            label={field.label}
            className="mb-4"
          />
        )

      case 'radio':
        return (
          <FormControl key={field.name} {...commonProps} className="mb-4">
            <Typography variant="subtitle2" className="mb-2">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Typography>
            <RadioGroup
              value={fieldValue}
              onChange={(e) => handleChange(e.target.value)}
            >
              {field.options?.map((option) => (
                <FormControlLabel
                  key={option.value}
                  value={option.value}
                  control={<Radio />}
                  label={option.label}
                  disabled={disabled || field.disabled}
                />
              ))}
            </RadioGroup>
            {(fieldError || field.helperText) && (
              <FormHelperText error={hasError}>
                {fieldError || field.helperText}
              </FormHelperText>
            )}
          </FormControl>
        )

      case 'date':
        return (
          <LocalizationProvider dateAdapter={AdapterDateFns} key={field.name}>
            <DatePicker
              label={field.label}
              value={fieldValue ? new Date(fieldValue) : null}
              onChange={(date) => handleChange(date?.toISOString() || '')}
              disabled={disabled || field.disabled}
              slotProps={{
                textField: {
                  ...commonProps,
                  className: "mb-4"
                }
              }}
            />
          </LocalizationProvider>
        )

      default:
        return null
    }
  }

  const renderSection = (section: FormSection, sectionIndex: number) => {
    return (
      <Box key={sectionIndex} className="mb-6">
        {/* Section Header */}
        {(section.title || section.description) && (
          <Box className="mb-4">
            {section.title && (
              <Typography
                variant={isMobile ? "h6" : "h5"}
                className="font-semibold text-gray-900 dark:text-gray-100 mb-2"
              >
                {section.title}
              </Typography>
            )}
            {section.description && (
              <Typography
                variant="body2"
                className="text-gray-600 dark:text-gray-400"
              >
                {section.description}
              </Typography>
            )}
            <Divider className="mt-3" />
          </Box>
        )}

        {/* Section Fields */}
        {isMobile ? (
          // Mobile: Single column layout
          <Stack spacing={3}>
            {section.fields.map(renderField)}
          </Stack>
        ) : (
          // Desktop: Grid layout
          <Grid container spacing={3}>
            {section.fields.map((field) => {
              const gridProps = field.gridSize || { xs: 12, md: 6 }
              return (
                <Grid key={field.name} item {...gridProps}>
                  {renderField(field)}
                </Grid>
              )
            })}
          </Grid>
        )}
      </Box>
    )
  }

  return (
    <Paper
      className="w-full"
      sx={{
        p: { xs: 2, sm: 3, md: 4 },
        borderRadius: 2,
        boxShadow: theme.shadows[2],
      }}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault()
          onSubmit()
        }}
      >
        {/* Form Sections */}
        {sections.map(renderSection)}

        {/* Form Actions */}
        <Box
          className={`
            flex gap-3 pt-6 border-t border-gray-200 dark:border-gray-700
            ${isMobile ? 'flex-col' : 'flex-row justify-end'}
          `}
        >
          {actions || (
            <>
              {onCancel && (
                <Button
                  type="button"
                  variant="outlined"
                  onClick={onCancel}
                  disabled={loading}
                  className={isMobile ? 'w-full' : ''}
                  size={isMobile ? 'large' : 'medium'}
                >
                  {cancelLabel}
                </Button>
              )}
              <Button
                type="submit"
                variant="contained"
                disabled={loading || disabled}
                className={`
                  ${isMobile ? 'w-full' : ''}
                  font-semibold
                `}
                size={isMobile ? 'large' : 'medium'}
              >
                {loading ? 'Submitting...' : submitLabel}
              </Button>
            </>
          )}
        </Box>
      </form>
    </Paper>
  )
}