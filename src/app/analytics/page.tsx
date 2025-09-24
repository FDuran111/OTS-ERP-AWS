'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { TrendingUp, Users, FileText, Clock, AlertTriangle, CheckCircle, BarChart3, Eye } from 'lucide-react'

interface AnalyticsData {
  leadMetrics: {
    totalLeads: number
    websiteLeads: number
    conversionRate: number
    averageResponseTime: string
    leadsBySource: { source: string; count: number }[]
    recentLeads: any[]
  }
  pageMetrics: {
    totalPageViews: number
    uniqueVisitors: number
    topPages: { page: string; views: number }[]
    pageViewsTrend: { date: string; views: number }[]
  }
  formMetrics: {
    formsStarted: number
    formsCompleted: number
    formsAbandoned: number
    completionRate: number
    abandonmentRate: number
  }
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState('7days')

  useEffect(() => {
    fetchAnalytics()
    // Refresh every 30 seconds for real-time updates
    const interval = setInterval(fetchAnalytics, 30000)
    return () => clearInterval(interval)
  }, [timeRange])

  const fetchAnalytics = async () => {
    try {
      // Fetch lead metrics
      const leadsRes = await fetch('/api/analytics/leads')
      const leadData = await leadsRes.json()

      // Fetch page metrics
      const pagesRes = await fetch('/api/analytics/pages')
      const pageData = await pagesRes.json()

      // Fetch form metrics
      const formsRes = await fetch('/api/analytics/forms')
      const formData = await formsRes.json()

      setData({
        leadMetrics: leadData,
        pageMetrics: pageData,
        formMetrics: formData
      })
    } catch (error) {
      console.error('Failed to fetch analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading analytics...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Website Analytics & Lead Tracking</h1>
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value)}
          className="px-4 py-2 border rounded-lg"
        >
          <option value="today">Today</option>
          <option value="7days">Last 7 Days</option>
          <option value="30days">Last 30 Days</option>
          <option value="90days">Last 90 Days</option>
        </select>
      </div>

      {/* Real-time Alerts */}
      {data?.leadMetrics.recentLeads.filter(l => l.urgency === 'EMERGENCY').length > 0 && (
        <Alert className="border-red-500 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <strong>Emergency Service Requests:</strong> You have {data.leadMetrics.recentLeads.filter(l => l.urgency === 'EMERGENCY').length} emergency requests waiting for response!
          </AlertDescription>
        </Alert>
      )}

      {/* Key Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Website Leads</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.leadMetrics.websiteLeads || 0}</div>
            <p className="text-xs text-gray-600 mt-1">
              {data?.leadMetrics.conversionRate || 0}% conversion rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Page Views</CardTitle>
            <Eye className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.pageMetrics.totalPageViews || 0}</div>
            <p className="text-xs text-gray-600 mt-1">
              {data?.pageMetrics.uniqueVisitors || 0} unique visitors
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Form Completion</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.formMetrics.completionRate || 0}%</div>
            <p className="text-xs text-gray-600 mt-1">
              {data?.formMetrics.formsCompleted || 0} completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
            <Clock className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.leadMetrics.averageResponseTime || 'N/A'}</div>
            <p className="text-xs text-gray-600 mt-1">to first contact</p>
          </CardContent>
        </Card>
      </div>

      {/* Form Funnel Analysis */}
      <Card>
        <CardHeader>
          <CardTitle>Form Conversion Funnel</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="relative">
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">Forms Viewed</span>
                <span className="text-sm text-gray-600">100%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-8">
                <div className="bg-blue-600 h-8 rounded-full flex items-center justify-center text-white text-sm" style={{width: '100%'}}>
                  All Visitors
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">Forms Started</span>
                <span className="text-sm text-gray-600">{((data?.formMetrics.formsStarted || 0) / (data?.pageMetrics.totalPageViews || 1) * 100).toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-8">
                <div
                  className="bg-yellow-500 h-8 rounded-full flex items-center justify-center text-white text-sm"
                  style={{width: `${Math.min(((data?.formMetrics.formsStarted || 0) / (data?.pageMetrics.totalPageViews || 1) * 100), 100)}%`}}
                >
                  {data?.formMetrics.formsStarted || 0} Started
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">Forms Completed</span>
                <span className="text-sm text-gray-600">{data?.formMetrics.completionRate || 0}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-8">
                <div
                  className="bg-green-600 h-8 rounded-full flex items-center justify-center text-white text-sm"
                  style={{width: `${data?.formMetrics.completionRate || 0}%`}}
                >
                  {data?.formMetrics.formsCompleted || 0} Completed
                </div>
              </div>
            </div>

            {data?.formMetrics.abandonmentRate > 20 && (
              <Alert className="mt-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  High abandonment rate ({data.formMetrics.abandonmentRate}%). Consider simplifying your form or reducing required fields.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Pages */}
        <Card>
          <CardHeader>
            <CardTitle>Top Pages</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data?.pageMetrics.topPages.slice(0, 5).map((page, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="text-sm font-medium text-gray-500">{idx + 1}.</span>
                    <span className="text-sm truncate max-w-[200px]">{page.page}</span>
                  </div>
                  <span className="text-sm font-semibold">{page.views} views</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Lead Sources */}
        <Card>
          <CardHeader>
            <CardTitle>Lead Sources</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data?.leadMetrics.leadsBySource.map((source, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <span className="text-sm">{source.source}</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{width: `${(source.count / data.leadMetrics.totalLeads * 100)}%`}}
                      />
                    </div>
                    <span className="text-sm font-semibold w-12 text-right">{source.count}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Website Leads */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Website Leads</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Name</th>
                  <th className="text-left py-2">Service Type</th>
                  <th className="text-left py-2">Urgency</th>
                  <th className="text-left py-2">Source</th>
                  <th className="text-left py-2">Submitted</th>
                  <th className="text-left py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {data?.leadMetrics.recentLeads.slice(0, 10).map((lead) => (
                  <tr key={lead.id} className="border-b hover:bg-gray-50">
                    <td className="py-2">
                      <div>
                        <div className="font-medium">{lead.firstName} {lead.lastName}</div>
                        <div className="text-xs text-gray-500">{lead.email}</div>
                      </div>
                    </td>
                    <td className="py-2">{lead.serviceType}</td>
                    <td className="py-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        lead.urgency === 'EMERGENCY' ? 'bg-red-100 text-red-800' :
                        lead.urgency === 'HIGH' ? 'bg-orange-100 text-orange-800' :
                        lead.urgency === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {lead.urgency}
                      </span>
                    </td>
                    <td className="py-2 text-xs">{lead.source}</td>
                    <td className="py-2 text-xs">{new Date(lead.createdAt).toLocaleString()}</td>
                    <td className="py-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        lead.status === 'CONVERTED' ? 'bg-green-100 text-green-800' :
                        lead.status === 'CONTACTED' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {lead.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}