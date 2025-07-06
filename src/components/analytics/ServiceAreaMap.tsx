'use client'

import { useEffect, useRef } from 'react'
import { Box, Typography, Paper } from '@mui/material'

// Declare Google Maps types
declare global {
  interface Window {
    google: any
  }
}

interface ServiceAreaMapProps {
  data: any
  viewMode: 'density' | 'revenue'
}

export default function ServiceAreaMap({ data, viewMode }: ServiceAreaMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const heatmapRef = useRef<any>(null)
  const markersRef = useRef<any[]>([])

  useEffect(() => {
    // Load Google Maps script if not already loaded and API key exists
    if (!window.google && process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) {
      const script = document.createElement('script')
      script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=visualization`
      script.async = true
      script.defer = true
      script.onload = () => initializeMap()
      document.head.appendChild(script)
    } else if (window.google) {
      initializeMap()
    }
  }, [])

  useEffect(() => {
    if (mapInstanceRef.current && data) {
      updateMapData()
    }
  }, [data, viewMode])

  const initializeMap = () => {
    if (!mapRef.current || !data) return

    // Since we don't have coordinates, center on a default location
    // You can update this to center on your service area
    const center = {
      lat: 32.7157, // Default to San Diego area
      lng: -117.1611
    }

    // Initialize map
    mapInstanceRef.current = new window.google.maps.Map(mapRef.current, {
      center,
      zoom: 10,
      mapTypeId: 'roadmap',
      styles: [
        {
          featureType: 'poi',
          elementType: 'labels',
          stylers: [{ visibility: 'off' }]
        }
      ]
    })

    updateMapData()
  }

  const updateMapData = () => {
    if (!mapInstanceRef.current || !data) return

    // Clear existing markers
    markersRef.current.forEach(marker => marker.setMap(null))
    markersRef.current = []

    // Clear existing heatmap
    if (heatmapRef.current) {
      heatmapRef.current.setMap(null)
    }

    // Prepare heatmap data
    const heatmapData: any[] = []
    const weightedLocations: any[] = []

    // Process customer data for heatmap
    data.customers.forEach((customer: any) => {
      if (customer.latitude && customer.longitude) {
        const location = new window.google.maps.LatLng(
          parseFloat(customer.latitude),
          parseFloat(customer.longitude)
        )

        if (viewMode === 'density') {
          // For density view, add multiple points based on job count
          for (let i = 0; i < parseInt(customer.job_count); i++) {
            heatmapData.push(location)
          }
        } else {
          // For revenue view, use weighted locations
          weightedLocations.push({
            location: location,
            weight: parseFloat(customer.total_revenue) / 1000 // Scale down for better visualization
          })
        }
      }
    })

    // Create heatmap layer
    heatmapRef.current = new window.google.maps.visualization.HeatmapLayer({
      data: viewMode === 'density' ? heatmapData : weightedLocations,
      map: mapInstanceRef.current,
      radius: viewMode === 'density' ? 20 : 30,
      opacity: 0.6,
      gradient: viewMode === 'density' ? [
        'rgba(0, 255, 255, 0)',
        'rgba(0, 255, 255, 1)',
        'rgba(0, 191, 255, 1)',
        'rgba(0, 127, 255, 1)',
        'rgba(0, 63, 255, 1)',
        'rgba(0, 0, 255, 1)',
        'rgba(0, 0, 223, 1)',
        'rgba(0, 0, 191, 1)',
        'rgba(0, 0, 159, 1)',
        'rgba(0, 0, 127, 1)',
        'rgba(63, 0, 91, 1)',
        'rgba(127, 0, 63, 1)',
        'rgba(191, 0, 31, 1)',
        'rgba(255, 0, 0, 1)'
      ] : [
        'rgba(0, 255, 0, 0)',
        'rgba(0, 255, 0, 1)',
        'rgba(255, 255, 0, 1)',
        'rgba(255, 200, 0, 1)',
        'rgba(255, 150, 0, 1)',
        'rgba(255, 100, 0, 1)',
        'rgba(255, 50, 0, 1)',
        'rgba(255, 0, 0, 1)'
      ]
    })

    // Add city markers for top locations
    const topCities = data.cities.slice(0, 10)
    topCities.forEach((city: any) => {
      if (city.avg_latitude && city.avg_longitude) {
        const marker = new window.google.maps.Marker({
          position: {
            lat: parseFloat(city.avg_latitude),
            lng: parseFloat(city.avg_longitude)
          },
          map: mapInstanceRef.current,
          title: `${city.city}: ${city.job_count} jobs`,
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: Math.sqrt(city.job_count) * 2,
            fillColor: viewMode === 'density' ? '#1976d2' : '#4caf50',
            fillOpacity: 0.7,
            strokeColor: '#ffffff',
            strokeWeight: 2
          }
        })

        // Add info window
        const infoWindow = new window.google.maps.InfoWindow({
          content: `
            <div style="padding: 10px;">
              <h4 style="margin: 0 0 5px 0;">${city.city}, ${city.state}</h4>
              <p style="margin: 5px 0;">Jobs: ${city.job_count}</p>
              <p style="margin: 5px 0;">Customers: ${city.customer_count}</p>
              <p style="margin: 5px 0;">Revenue: $${parseFloat(city.total_revenue).toLocaleString()}</p>
              <p style="margin: 5px 0;">Avg Job: $${parseFloat(city.avg_job_value).toLocaleString()}</p>
            </div>
          `
        })

        marker.addListener('click', () => {
          infoWindow.open(mapInstanceRef.current, marker)
        })

        markersRef.current.push(marker)
      }
    })

    // Since we don't have coordinates, we can't fit bounds
    // The map will stay centered on the default location
  }

  // Always use the grid visualization since we don't have coordinates
  return (
      <Paper sx={{ p: 3, height: '100%', overflow: 'auto' }}>
        <Typography variant="h6" gutterBottom>
          Service Area Distribution
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Showing {viewMode === 'density' ? 'job density' : 'revenue distribution'} by location
        </Typography>
        
        {/* Simple grid visualization */}
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 2 }}>
          {data?.cities.slice(0, 12).map((city: any, index: number) => {
            const intensity = viewMode === 'density' 
              ? city.job_count / (data.cities[0]?.job_count || 1)
              : city.total_revenue / (data.cities[0]?.total_revenue || 1)
            
            return (
              <Paper
                key={index}
                sx={{
                  p: 2,
                  backgroundColor: viewMode === 'density' 
                    ? `rgba(25, 118, 210, ${intensity * 0.8})`
                    : `rgba(76, 175, 80, ${intensity * 0.8})`,
                  color: intensity > 0.5 ? 'white' : 'inherit',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'scale(1.05)',
                    boxShadow: 3
                  }
                }}
              >
                <Typography variant="subtitle2" fontWeight="bold">
                  {city.city}, {city.state}
                </Typography>
                <Typography variant="caption" display="block">
                  {city.job_count} jobs
                </Typography>
                <Typography variant="caption" display="block">
                  ${parseFloat(city.total_revenue).toLocaleString()}
                </Typography>
                <Typography variant="caption" display="block">
                  {city.customer_count} customers
                </Typography>
              </Paper>
            )
          })}
        </Box>
        
        <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block', textAlign: 'center' }}>
          Note: Google Maps visualization requires API key configuration
        </Typography>
      </Paper>
    )
}