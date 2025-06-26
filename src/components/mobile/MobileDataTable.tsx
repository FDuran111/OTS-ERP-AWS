'use client'

import { useState } from 'react'
import {
  Box,
  Typography,
  TextField,
  InputAdornment,
  Chip,
  Stack,
  Pagination,
  Skeleton,
  Alert,
  Fab,
  Badge,
  useTheme,
  useMediaQuery,
  Card,
  CardContent,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
} from '@mui/material'
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  Sort as SortIcon,
  Add as AddIcon,
  MoreVert as MoreVertIcon,
  ViewList as ListViewIcon,
  ViewModule as GridViewIcon,
} from '@mui/icons-material'

interface Column {
  id: string
  label: string
  width?: number
  align?: 'left' | 'center' | 'right'
  sortable?: boolean
  filterable?: boolean
  render?: (value: any, row: any) => React.ReactNode
}

interface Filter {
  id: string
  label: string
  type: 'text' | 'select' | 'date' | 'number'
  options?: Array<{ label: string; value: any }>
  value?: any
}

interface MobileDataTableProps {
  data: any[]
  columns: Column[]
  loading?: boolean
  error?: string
  searchable?: boolean
  searchPlaceholder?: string
  filters?: Filter[]
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  onSort?: (column: string, order: 'asc' | 'desc') => void
  onFilter?: (filters: Record<string, any>) => void
  onSearch?: (query: string) => void
  pagination?: {
    page: number
    totalPages: number
    pageSize: number
    total: number
    onPageChange: (page: number) => void
  }
  actions?: {
    add?: {
      label: string
      onClick: () => void
    }
    row?: Array<{
      icon: React.ReactElement
      label: string
      onClick: (row: any) => void
      color?: 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success'
    }>
  }
  viewMode?: 'list' | 'grid'
  onViewModeChange?: (mode: 'list' | 'grid') => void
  renderCard?: (row: any, index: number) => React.ReactNode
  emptyState?: {
    title: string
    description: string
    icon?: React.ReactElement
  }
}

export default function MobileDataTable({
  data,
  columns,
  loading = false,
  error,
  searchable = true,
  searchPlaceholder = 'Search...',
  filters,
  sortBy,
  sortOrder = 'asc',
  onSort,
  onFilter,
  onSearch,
  pagination,
  actions,
  viewMode = 'list',
  onViewModeChange,
  renderCard,
  emptyState
}: MobileDataTableProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilters, setActiveFilters] = useState<Record<string, any>>({})
  const [filterMenuAnchor, setFilterMenuAnchor] = useState<null | HTMLElement>(null)
  const [sortMenuAnchor, setSortMenuAnchor] = useState<null | HTMLElement>(null)
  const [rowMenuAnchor, setRowMenuAnchor] = useState<null | HTMLElement>(null)
  const [selectedRow, setSelectedRow] = useState<any>(null)

  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))

  const handleSearch = (value: string) => {
    setSearchQuery(value)
    if (onSearch) {
      onSearch(value)
    }
  }

  const handleFilterChange = (filterId: string, value: any) => {
    const newFilters = { ...activeFilters, [filterId]: value }
    setActiveFilters(newFilters)
    if (onFilter) {
      onFilter(newFilters)
    }
  }

  const clearFilter = (filterId: string) => {
    const newFilters = { ...activeFilters }
    delete newFilters[filterId]
    setActiveFilters(newFilters)
    if (onFilter) {
      onFilter(newFilters)
    }
  }

  const handleSort = (columnId: string) => {
    if (onSort) {
      const newOrder = sortBy === columnId && sortOrder === 'asc' ? 'desc' : 'asc'
      onSort(columnId, newOrder)
    }
    setSortMenuAnchor(null)
  }

  const activeFilterCount = Object.keys(activeFilters).filter(key => activeFilters[key]).length

  const renderLoadingSkeleton = () => (
    <Box sx={{ p: 2 }}>
      {Array.from({ length: 5 }).map((_, index) => (
        <Card key={index} sx={{ mb: 2 }}>
          <CardContent>
            <Skeleton variant="text" width="60%" height={24} />
            <Skeleton variant="text" width="40%" height={20} sx={{ mt: 1 }} />
            <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
              <Skeleton variant="rectangular" width={60} height={24} sx={{ borderRadius: 1 }} />
              <Skeleton variant="rectangular" width={80} height={24} sx={{ borderRadius: 1 }} />
            </Stack>
          </CardContent>
        </Card>
      ))}
    </Box>
  )

  const renderEmptyState = () => (
    <Box sx={{ 
      textAlign: 'center', 
      py: 8, 
      px: 2,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 2
    }}>
      {emptyState?.icon && (
        <Box sx={{ fontSize: 64, color: 'text.secondary' }}>
          {emptyState.icon}
        </Box>
      )}
      <Typography variant="h6" color="text.secondary">
        {emptyState?.title || 'No data found'}
      </Typography>
      {emptyState?.description && (
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 300 }}>
          {emptyState.description}
        </Typography>
      )}
      {actions?.add && (
        <Box sx={{ mt: 2 }}>
          <Fab
            variant="extended"
            color="primary"
            onClick={actions.add.onClick}
            size="medium"
          >
            <AddIcon sx={{ mr: 1 }} />
            {actions.add.label}
          </Fab>
        </Box>
      )}
    </Box>
  )

  const renderDefaultCard = (row: any, index: number) => (
    <Card key={index} sx={{ mb: 2 }}>
      <CardContent sx={{ pb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            {columns.slice(0, 3).map((column) => (
              <Box key={column.id} sx={{ mb: 1 }}>
                <Typography variant="caption" color="text.secondary" display="block">
                  {column.label}
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: column.id === columns[0].id ? 600 : 400 }}>
                  {column.render ? column.render(row[column.id], row) : row[column.id]}
                </Typography>
              </Box>
            ))}
          </Box>
          
          {actions?.row && actions.row.length > 0 && (
            <IconButton
              size="small"
              onClick={(e) => {
                setSelectedRow(row)
                setRowMenuAnchor(e.currentTarget)
              }}
            >
              <MoreVertIcon />
            </IconButton>
          )}
        </Box>
      </CardContent>
    </Card>
  )

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        {error}
      </Alert>
    )
  }

  return (
    <Box sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header Controls */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        {/* Search */}
        {searchable && (
          <TextField
            fullWidth
            variant="outlined"
            placeholder={searchPlaceholder}
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            sx={{ mb: 2 }}
          />
        )}

        {/* Controls Row */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          {/* Active Filters */}
          {Object.entries(activeFilters).map(([key, value]) => 
            value && (
              <Chip
                key={key}
                label={`${filters?.find(f => f.id === key)?.label}: ${value}`}
                size="small"
                onDelete={() => clearFilter(key)}
                color="primary"
                variant="outlined"
              />
            )
          )}

          <Box sx={{ flexGrow: 1 }} />

          {/* View Mode Toggle */}
          {onViewModeChange && (
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              <IconButton
                size="small"
                color={viewMode === 'list' ? 'primary' : 'default'}
                onClick={() => onViewModeChange('list')}
              >
                <ListViewIcon />
              </IconButton>
              <IconButton
                size="small"
                color={viewMode === 'grid' ? 'primary' : 'default'}
                onClick={() => onViewModeChange('grid')}
              >
                <GridViewIcon />
              </IconButton>
            </Box>
          )}

          {/* Filter Button */}
          {filters && filters.length > 0 && (
            <IconButton
              size="small"
              onClick={(e) => setFilterMenuAnchor(e.currentTarget)}
            >
              <Badge badgeContent={activeFilterCount} color="primary">
                <FilterIcon />
              </Badge>
            </IconButton>
          )}

          {/* Sort Button */}
          {columns.some(col => col.sortable) && (
            <IconButton
              size="small"
              onClick={(e) => setSortMenuAnchor(e.currentTarget)}
            >
              <SortIcon />
            </IconButton>
          )}
        </Box>
      </Box>

      {/* Content */}
      <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
        {loading ? (
          renderLoadingSkeleton()
        ) : data.length === 0 ? (
          renderEmptyState()
        ) : (
          <Box sx={{ p: 2 }}>
            {data.map((row, index) => 
              renderCard ? renderCard(row, index) : renderDefaultCard(row, index)
            )}
          </Box>
        )}
      </Box>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider', display: 'flex', justifyContent: 'center' }}>
          <Pagination
            count={pagination.totalPages}
            page={pagination.page}
            onChange={(_, page) => pagination.onPageChange(page)}
            color="primary"
            size={isMobile ? 'small' : 'medium'}
            showFirstButton
            showLastButton
          />
        </Box>
      )}

      {/* Floating Action Button */}
      {actions?.add && data.length > 0 && (
        <Fab
          color="primary"
          aria-label="add"
          sx={{
            position: 'fixed',
            bottom: 16,
            right: 16,
            zIndex: theme.zIndex.fab
          }}
          onClick={actions.add.onClick}
        >
          <AddIcon />
        </Fab>
      )}

      {/* Filter Menu */}
      <Menu
        anchorEl={filterMenuAnchor}
        open={Boolean(filterMenuAnchor)}
        onClose={() => setFilterMenuAnchor(null)}
        PaperProps={{
          sx: { width: 280, maxHeight: 400 }
        }}
      >
        {filters?.map((filter) => (
          <MenuItem key={filter.id} disableRipple>
            <Box sx={{ width: '100%' }}>
              <Typography variant="subtitle2" gutterBottom>
                {filter.label}
              </Typography>
              {filter.type === 'select' ? (
                <TextField
                  select
                  fullWidth
                  size="small"
                  value={activeFilters[filter.id] || ''}
                  onChange={(e) => handleFilterChange(filter.id, e.target.value)}
                >
                  <MenuItem value="">All</MenuItem>
                  {filter.options?.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </TextField>
              ) : (
                <TextField
                  fullWidth
                  size="small"
                  type={filter.type}
                  value={activeFilters[filter.id] || ''}
                  onChange={(e) => handleFilterChange(filter.id, e.target.value)}
                />
              )}
            </Box>
          </MenuItem>
        ))}
      </Menu>

      {/* Sort Menu */}
      <Menu
        anchorEl={sortMenuAnchor}
        open={Boolean(sortMenuAnchor)}
        onClose={() => setSortMenuAnchor(null)}
      >
        {columns.filter(col => col.sortable).map((column) => (
          <MenuItem key={column.id} onClick={() => handleSort(column.id)}>
            <ListItemText>
              {column.label}
              {sortBy === column.id && (
                <Typography component="span" variant="caption" color="primary">
                  {' '}({sortOrder === 'asc' ? '↑' : '↓'})
                </Typography>
              )}
            </ListItemText>
          </MenuItem>
        ))}
      </Menu>

      {/* Row Actions Menu */}
      <Menu
        anchorEl={rowMenuAnchor}
        open={Boolean(rowMenuAnchor)}
        onClose={() => setRowMenuAnchor(null)}
      >
        {actions?.row?.map((action, index) => (
          <MenuItem
            key={index}
            onClick={() => {
              action.onClick(selectedRow)
              setRowMenuAnchor(null)
            }}
          >
            <ListItemIcon sx={{ color: action.color ? `${action.color}.main` : 'inherit' }}>
              {action.icon}
            </ListItemIcon>
            <ListItemText>{action.label}</ListItemText>
          </MenuItem>
        ))}
      </Menu>
    </Box>
  )
}