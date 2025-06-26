'use client'

import { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Alert,
  CircularProgress,
  Stack,
  Avatar,
  LinearProgress,
  Tooltip,
} from '@mui/material'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import {
  LocalShipping as TruckIcon,
  Route as RouteIcon,
  Tune as OptimizeIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  PlayArrow as StartIcon,
  Stop as StopIcon,
  CheckCircle as CompleteIcon,
  Assessment as StatsIcon,
  Speed as SpeedIcon,
  Schedule as TimeIcon,
  AttachMoney as CostIcon,
  Navigation as DirectionsIcon,
} from '@mui/icons-material'

interface Vehicle {
  id: string
  vehicleNumber: string
  vehicleName: string
  vehicleType: string
  capacity: number
  active: boolean
  stats?: {
    totalRoutes: number
    completedRoutes: number
    activeRoutes: number
    avgOptimizationScore: number
    totalDistance: number
    totalCost: number
    lastRouteDate: string | null
  }
}

interface Route {
  routeId: string
  routeName: string
  routeDate: string
  vehicleId: string
  vehicleNumber: string
  vehicleName: string
  status: string
  startTime: string
  endTime: string
  estimatedDuration: number
  actualDuration?: number
  estimatedDistance: number
  actualDistance?: number
  estimatedCost: number
  actualCost?: number
  optimizationScore: number
  totalStops: number
  jobStops: number
  completedStops: number
  stops?: RouteStop[]
}

interface RouteStop {
  stopId: string
  jobId: string
  jobNumber: string
  stopOrder: number
  address: string
  estimatedArrival: string
  estimatedDeparture: string
  estimatedDuration: number
  status: string
}

interface OptimizationSummary {
  totalRoutes: number
  totalJobs: number
  assignedJobs: number
  unassignedJobs: number
  assignmentRate: number
  totalDistance: number
  totalDuration: number
  totalCost: number
  avgOptimizationScore: number
}

export default function RouteOptimizationPage() {
  const [tabValue, setTabValue] = useState(0)
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [routes, setRoutes] = useState<Route[]>([])
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [loading, setLoading] = useState(false)
  const [optimizing, setOptimizing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  
  // Dialog states
  const [optimizeDialogOpen, setOptimizeDialogOpen] = useState(false)
  const [vehicleDialogOpen, setVehicleDialogOpen] = useState(false)
  const [routeDetailsOpen, setRouteDetailsOpen] = useState(false)
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null)
  
  // Form states
  const [newVehicle, setNewVehicle] = useState({
    vehicleNumber: '',
    vehicleName: '',
    vehicleType: 'SERVICE_TRUCK',
    capacity: 2,
    hourlyOperatingCost: 25,
    mileageRate: 0.65
  })

  const [optimizationSettings, setOptimizationSettings] = useState({
    startTime: '08:00',
    selectedVehicles: [] as string[],
    maxStopsPerRoute: 8
  })

  useEffect(() => {
    fetchVehicles()
    fetchRoutes()
  }, [selectedDate])

  const fetchVehicles = async () => {
    try {
      const response = await fetch('/api/routes/vehicles?includeStats=true', {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' }
      })
      
      if (!response.ok) throw new Error('Failed to fetch vehicles')
      
      const data = await response.json()
      setVehicles(data)
    } catch (error) {
      console.error('Error fetching vehicles:', error)
      setError('Failed to load vehicles')
    }
  }

  const fetchRoutes = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/routes?routeDate=${selectedDate}&includeStops=true`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' }
      })
      
      if (!response.ok) throw new Error('Failed to fetch routes')
      
      const data = await response.json()
      setRoutes(data)
    } catch (error) {
      console.error('Error fetching routes:', error)
      setError('Failed to load routes')
    } finally {
      setLoading(false)
    }
  }

  const handleOptimizeRoutes = async () => {
    try {
      setOptimizing(true)
      setError(null)

      const payload = {
        routeDate: selectedDate,
        startTime: optimizationSettings.startTime,
        vehicleIds: optimizationSettings.selectedVehicles.length > 0 ? 
          optimizationSettings.selectedVehicles : undefined
      }

      const response = await fetch('/api/routes/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Optimization failed')
      }

      const result = await response.json()
      setSuccess(`Successfully optimized ${result.summary.totalRoutes} routes with ${result.summary.assignedJobs} jobs assigned`)
      setOptimizeDialogOpen(false)
      await fetchRoutes()

    } catch (error) {
      console.error('Error optimizing routes:', error)
      setError(error instanceof Error ? error.message : 'Optimization failed')
    } finally {
      setOptimizing(false)
    }
  }

  const handleAddVehicle = async () => {
    try {
      const response = await fetch('/api/routes/vehicles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newVehicle)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to add vehicle')
      }

      await fetchVehicles()
      setVehicleDialogOpen(false)
      resetVehicleForm()
      setSuccess('Vehicle added successfully')

    } catch (error) {
      console.error('Error adding vehicle:', error)
      setError(error instanceof Error ? error.message : 'Failed to add vehicle')
    }
  }

  const handleUpdateRouteStatus = async (routeId: string, status: string) => {
    try {
      const response = await fetch(`/api/routes?routeId=${routeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      })

      if (!response.ok) throw new Error('Failed to update route')

      await fetchRoutes()
      setSuccess(`Route ${status.toLowerCase()} successfully`)

    } catch (error) {
      console.error('Error updating route:', error)
      setError('Failed to update route status')
    }
  }

  const resetVehicleForm = () => {
    setNewVehicle({
      vehicleNumber: '',
      vehicleName: '',
      vehicleType: 'SERVICE_TRUCK',
      capacity: 2,
      hourlyOperatingCost: 25,
      mileageRate: 0.65
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PLANNED': return 'info'
      case 'IN_PROGRESS': return 'warning'
      case 'COMPLETED': return 'success'
      case 'CANCELLED': return 'error'
      default: return 'default'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PLANNED': return <RouteIcon />
      case 'IN_PROGRESS': return <StartIcon />
      case 'COMPLETED': return <CompleteIcon />
      case 'CANCELLED': return <StopIcon />
      default: return <RouteIcon />
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours}h ${mins}m`
  }

  // Calculate summary statistics
  const routeStats = {
    totalRoutes: routes.length,
    activeRoutes: routes.filter(r => r.status === 'IN_PROGRESS').length,
    completedRoutes: routes.filter(r => r.status === 'COMPLETED').length,
    plannedRoutes: routes.filter(r => r.status === 'PLANNED').length,
    totalStops: routes.reduce((sum, r) => sum + r.totalStops, 0),
    totalDistance: routes.reduce((sum, r) => sum + r.estimatedDistance, 0),
    totalCost: routes.reduce((sum, r) => sum + r.estimatedCost, 0),
    avgOptScore: routes.length > 0 ? routes.reduce((sum, r) => sum + r.optimizationScore, 0) / routes.length : 0
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            🚛 Route Optimization
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Optimize crew routes, manage vehicles, and track performance
          </Typography>
        </Box>
        <Stack direction="row" spacing={2}>
          <TextField
            type="date"
            label="Route Date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
          <Button
            variant="contained"
            startIcon={<OptimizeIcon />}
            onClick={() => setOptimizeDialogOpen(true)}
            disabled={optimizing}
          >
            Optimize Routes
          </Button>
        </Stack>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      {/* Summary Cards */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mb: 4 }}>
        <Box sx={{ flex: '1 1 calc(25% - 18px)', minWidth: '200px' }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" variant="caption">
                    Active Routes
                  </Typography>
                  <Typography variant="h4" color="warning.main">
                    {routeStats.activeRoutes}
                  </Typography>
                  <Typography variant="caption">
                    of {routeStats.totalRoutes} total
                  </Typography>
                </Box>
                <RouteIcon sx={{ fontSize: 40, color: 'warning.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Box>

        <Box sx={{ flex: '1 1 calc(25% - 18px)', minWidth: '200px' }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" variant="caption">
                    Total Distance
                  </Typography>
                  <Typography variant="h4" color="info.main">
                    {routeStats.totalDistance.toFixed(0)} mi
                  </Typography>
                  <Typography variant="caption">
                    {routeStats.totalStops} stops
                  </Typography>
                </Box>
                <SpeedIcon sx={{ fontSize: 40, color: 'info.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Box>

        <Box sx={{ flex: '1 1 calc(25% - 18px)', minWidth: '200px' }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" variant="caption">
                    Total Cost
                  </Typography>
                  <Typography variant="h4" color="success.main">
                    {formatCurrency(routeStats.totalCost)}
                  </Typography>
                  <Typography variant="caption">
                    estimated
                  </Typography>
                </Box>
                <CostIcon sx={{ fontSize: 40, color: 'success.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Box>

        <Box sx={{ flex: '1 1 calc(25% - 18px)', minWidth: '200px' }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" variant="caption">
                    Optimization Score
                  </Typography>
                  <Typography variant="h4" color="primary.main">
                    {routeStats.avgOptScore.toFixed(0)}%
                  </Typography>
                  <Typography variant="caption">
                    efficiency
                  </Typography>
                </Box>
                <StatsIcon sx={{ fontSize: 40, color: 'primary.main' }} />
              </Box>
              <LinearProgress 
                variant="determinate" 
                value={routeStats.avgOptScore} 
                sx={{ mt: 1 }}
              />
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
          <Tab label={`Routes (${routes.length})`} />
          <Tab label={`Vehicles (${vehicles.length})`} />
        </Tabs>
      </Box>

      {/* Routes Tab */}
      {tabValue === 0 && (
        <Box>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Route</TableCell>
                    <TableCell>Vehicle</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Time</TableCell>
                    <TableCell>Stops</TableCell>
                    <TableCell>Distance</TableCell>
                    <TableCell>Cost</TableCell>
                    <TableCell>Score</TableCell>
                    <TableCell align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {routes.map((route) => (
                    <TableRow key={route.routeId}>
                      <TableCell>
                        <Box>
                          <Typography variant="body2" fontWeight="bold">
                            {route.routeName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {route.routeDate}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Avatar sx={{ width: 32, height: 32 }}>
                            <TruckIcon />
                          </Avatar>
                          <Box>
                            <Typography variant="body2">
                              {route.vehicleNumber}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {route.vehicleName}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          icon={getStatusIcon(route.status)}
                          label={route.status}
                          color={getStatusColor(route.status) as any}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {route.startTime} - {route.endTime}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {formatDuration(route.estimatedDuration)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {route.jobStops} jobs
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {route.completedStops} completed
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {route.estimatedDistance.toFixed(1)} mi
                      </TableCell>
                      <TableCell>
                        {formatCurrency(route.estimatedCost)}
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2">
                            {route.optimizationScore.toFixed(0)}%
                          </Typography>
                          <LinearProgress
                            variant="determinate"
                            value={route.optimizationScore}
                            sx={{ width: 40, height: 4 }}
                          />
                        </Box>
                      </TableCell>
                      <TableCell align="center">
                        <Stack direction="row" spacing={0.5}>
                          <Tooltip title="View Details">
                            <IconButton
                              size="small"
                              onClick={() => {
                                setSelectedRoute(route)
                                setRouteDetailsOpen(true)
                              }}
                            >
                              <DirectionsIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          
                          {route.status === 'PLANNED' && (
                            <Tooltip title="Start Route">
                              <IconButton
                                size="small"
                                onClick={() => handleUpdateRouteStatus(route.routeId, 'IN_PROGRESS')}
                              >
                                <StartIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                          
                          {route.status === 'IN_PROGRESS' && (
                            <Tooltip title="Complete Route">
                              <IconButton
                                size="small"
                                onClick={() => handleUpdateRouteStatus(route.routeId, 'COMPLETED')}
                              >
                                <CompleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {routes.length === 0 && !loading && (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <RouteIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No routes for {selectedDate}
              </Typography>
              <Button
                variant="outlined"
                startIcon={<OptimizeIcon />}
                onClick={() => setOptimizeDialogOpen(true)}
              >
                Optimize Routes
              </Button>
            </Box>
          )}
        </Box>
      )}

      {/* Vehicles Tab */}
      {tabValue === 1 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">Fleet Vehicles</Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setVehicleDialogOpen(true)}
            >
              Add Vehicle
            </Button>
          </Box>

          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
            {vehicles.map((vehicle) => (
              <Box key={vehicle.id} sx={{ flex: '1 1 calc(33.33% - 16px)', minWidth: '300px' }}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>
                        <TruckIcon />
                      </Avatar>
                      <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="h6">
                          {vehicle.vehicleNumber}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {vehicle.vehicleName}
                        </Typography>
                      </Box>
                      <Chip
                        label={vehicle.active ? 'Active' : 'Inactive'}
                        color={vehicle.active ? 'success' : 'default'}
                        size="small"
                      />
                    </Box>

                    <Stack spacing={1}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="caption">Type:</Typography>
                        <Typography variant="body2">{vehicle.vehicleType}</Typography>
                      </Box>
                      
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="caption">Capacity:</Typography>
                        <Typography variant="body2">{vehicle.capacity} crew</Typography>
                      </Box>

                      {vehicle.stats && (
                        <>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant="caption">Routes (30d):</Typography>
                            <Typography variant="body2">{vehicle.stats.totalRoutes}</Typography>
                          </Box>

                          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant="caption">Avg Score:</Typography>
                            <Typography variant="body2">
                              {vehicle.stats.avgOptimizationScore.toFixed(0)}%
                            </Typography>
                          </Box>

                          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant="caption">Total Distance:</Typography>
                            <Typography variant="body2">
                              {vehicle.stats.totalDistance.toFixed(0)} mi
                            </Typography>
                          </Box>
                        </>
                      )}
                    </Stack>
                  </CardContent>
                </Card>
              </Box>
            ))}
          </Box>
        </Box>
      )}

      {/* Optimize Routes Dialog */}
      <Dialog open={optimizeDialogOpen} onClose={() => setOptimizeDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Optimize Routes for {selectedDate}</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <TextField
              label="Start Time"
              type="time"
              value={optimizationSettings.startTime}
              onChange={(e) => setOptimizationSettings(prev => ({ 
                ...prev, 
                startTime: e.target.value 
              }))}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />

            <FormControl fullWidth>
              <InputLabel>Vehicles (leave empty for all)</InputLabel>
              <Select
                multiple
                value={optimizationSettings.selectedVehicles}
                onChange={(e) => setOptimizationSettings(prev => ({ 
                  ...prev, 
                  selectedVehicles: e.target.value as string[] 
                }))}
              >
                {vehicles.filter(v => v.active).map((vehicle) => (
                  <MenuItem key={vehicle.id} value={vehicle.id}>
                    {vehicle.vehicleNumber} - {vehicle.vehicleName}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="Max Stops Per Route"
              type="number"
              value={optimizationSettings.maxStopsPerRoute}
              onChange={(e) => setOptimizationSettings(prev => ({ 
                ...prev, 
                maxStopsPerRoute: parseInt(e.target.value) || 8 
              }))}
              inputProps={{ min: 1, max: 15 }}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOptimizeDialogOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleOptimizeRoutes} 
            variant="contained"
            disabled={optimizing}
            startIcon={optimizing ? <CircularProgress size={16} /> : <OptimizeIcon />}
          >
            {optimizing ? 'Optimizing...' : 'Optimize Routes'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Vehicle Dialog */}
      <Dialog open={vehicleDialogOpen} onClose={() => setVehicleDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add New Vehicle</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <TextField
              label="Vehicle Number"
              value={newVehicle.vehicleNumber}
              onChange={(e) => setNewVehicle(prev => ({ ...prev, vehicleNumber: e.target.value }))}
              fullWidth
              required
            />

            <TextField
              label="Vehicle Name"
              value={newVehicle.vehicleName}
              onChange={(e) => setNewVehicle(prev => ({ ...prev, vehicleName: e.target.value }))}
              fullWidth
              required
            />

            <FormControl fullWidth>
              <InputLabel>Vehicle Type</InputLabel>
              <Select
                value={newVehicle.vehicleType}
                onChange={(e) => setNewVehicle(prev => ({ ...prev, vehicleType: e.target.value }))}
              >
                <MenuItem value="SERVICE_TRUCK">Service Truck</MenuItem>
                <MenuItem value="BUCKET_TRUCK">Bucket Truck</MenuItem>
                <MenuItem value="VAN">Van</MenuItem>
                <MenuItem value="PICKUP">Pickup Truck</MenuItem>
              </Select>
            </FormControl>

            <TextField
              label="Crew Capacity"
              type="number"
              value={newVehicle.capacity}
              onChange={(e) => setNewVehicle(prev => ({ ...prev, capacity: parseInt(e.target.value) || 2 }))}
              inputProps={{ min: 1, max: 6 }}
              fullWidth
            />

            <TextField
              label="Hourly Operating Cost ($)"
              type="number"
              value={newVehicle.hourlyOperatingCost}
              onChange={(e) => setNewVehicle(prev => ({ ...prev, hourlyOperatingCost: parseFloat(e.target.value) || 25 }))}
              inputProps={{ min: 0, step: 0.01 }}
              fullWidth
            />

            <TextField
              label="Mileage Rate ($/mile)"
              type="number"
              value={newVehicle.mileageRate}
              onChange={(e) => setNewVehicle(prev => ({ ...prev, mileageRate: parseFloat(e.target.value) || 0.65 }))}
              inputProps={{ min: 0, step: 0.01 }}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setVehicleDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleAddVehicle} variant="contained">
            Add Vehicle
          </Button>
        </DialogActions>
      </Dialog>

      {/* Route Details Dialog */}
      <Dialog 
        open={routeDetailsOpen} 
        onClose={() => setRouteDetailsOpen(false)} 
        maxWidth="md" 
        fullWidth
      >
        <DialogTitle>
          Route Details: {selectedRoute?.routeName}
        </DialogTitle>
        <DialogContent>
          {selectedRoute?.stops && (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Order</TableCell>
                    <TableCell>Job</TableCell>
                    <TableCell>Address</TableCell>
                    <TableCell>Arrival</TableCell>
                    <TableCell>Duration</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {selectedRoute.stops.map((stop) => (
                    <TableRow key={stop.stopId}>
                      <TableCell>{stop.stopOrder}</TableCell>
                      <TableCell>{stop.jobNumber}</TableCell>
                      <TableCell>{stop.address}</TableCell>
                      <TableCell>
                        {new Date(stop.estimatedArrival).toLocaleTimeString([], { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </TableCell>
                      <TableCell>{formatDuration(stop.estimatedDuration)}</TableCell>
                      <TableCell>
                        <Chip 
                          label={stop.status} 
                          color={getStatusColor(stop.status) as any}
                          size="small" 
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRouteDetailsOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}