'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/hooks/useAuth'
import {
  BarChart3,
  Users,
  FileText,
  TrendingUp,
  Settings,
  DollarSign,
  AlertTriangle,
  Eye,
  Clock,
  Activity
} from 'lucide-react'
import Link from 'next/link'

export default function AdminDashboard() {
  const router = useRouter()
  const { user, hasRole } = useAuth()

  useEffect(() => {
    // Only OWNER_ADMIN and FOREMAN can access admin dashboard
    if (!hasRole(['OWNER_ADMIN', 'FOREMAN'])) {
      router.push('/dashboard')
    }
  }, [user, hasRole, router])

  const adminSections = [
    {
      title: 'Website Analytics',
      description: 'Track website visitors, form submissions, and lead conversions',
      icon: <BarChart3 className="h-6 w-6" />,
      link: '/analytics',
      color: 'bg-blue-500',
      stats: 'Real-time tracking',
      restricted: false
    },
    {
      title: 'Lead Management',
      description: 'View and manage all leads from website and other sources',
      icon: <Users className="h-6 w-6" />,
      link: '/leads',
      color: 'bg-green-500',
      stats: 'Automated from website',
      restricted: false
    },
    {
      title: 'Reports & Insights',
      description: 'Business reports, job analytics, and performance metrics',
      icon: <FileText className="h-6 w-6" />,
      link: '/reports',
      color: 'bg-purple-500',
      stats: 'Daily/Weekly/Monthly',
      restricted: false
    },
    {
      title: 'Cost Management',
      description: 'Track job costs, labor rates, and profit margins',
      icon: <DollarSign className="h-6 w-6" />,
      link: '/cost-management',
      color: 'bg-yellow-500',
      stats: 'P&L tracking',
      restricted: true // OWNER_ADMIN only
    },
    {
      title: 'Service Area Analytics',
      description: 'Geographic coverage and route optimization insights',
      icon: <Activity className="h-6 w-6" />,
      link: '/analytics/service-area',
      color: 'bg-orange-500',
      stats: 'Heat maps & zones',
      restricted: false
    },
    {
      title: 'System Settings',
      description: 'Configure system settings, users, and permissions',
      icon: <Settings className="h-6 w-6" />,
      link: '/settings',
      color: 'bg-gray-500',
      stats: 'Admin controls',
      restricted: true // OWNER_ADMIN only
    },
    {
      title: 'Equipment Billing',
      description: 'Track equipment usage and billing across jobs',
      icon: <Clock className="h-6 w-6" />,
      link: '/equipment-billing',
      color: 'bg-indigo-500',
      stats: 'Usage tracking',
      restricted: false
    },
    {
      title: 'Emergency Alerts',
      description: 'View and manage emergency service requests',
      icon: <AlertTriangle className="h-6 w-6" />,
      link: '/leads?urgency=EMERGENCY',
      color: 'bg-red-500',
      stats: 'Priority response',
      restricted: false
    }
  ]

  // Filter sections based on user role
  const visibleSections = adminSections.filter(section => {
    if (section.restricted) {
      return hasRole(['OWNER_ADMIN'])
    }
    return true
  })

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
        <p className="text-gray-600">
          Manage your business operations, track performance, and monitor website leads
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Today's Leads</p>
                <p className="text-2xl font-bold">--</p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Page Views</p>
                <p className="text-2xl font-bold">--</p>
              </div>
              <Eye className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Conversion Rate</p>
                <p className="text-2xl font-bold">--%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Urgent Requests</p>
                <p className="text-2xl font-bold">--</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Admin Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {visibleSections.map((section) => (
          <Link href={section.link} key={section.title}>
            <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <div className={`p-3 rounded-lg text-white ${section.color}`}>
                    {section.icon}
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-lg">{section.title}</CardTitle>
                    <p className="text-xs text-gray-500 mt-1">{section.stats}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">{section.description}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Additional Info */}
      <div className="mt-8 p-4 bg-blue-50 rounded-lg">
        <h3 className="font-semibold text-blue-900 mb-2">🚀 Website Integration Active</h3>
        <p className="text-sm text-blue-700">
          Your website at <code className="bg-blue-100 px-1 rounded">https://111-consulting-group.github.io/ots-website/</code> is connected.
          Forms submitted on the website will automatically appear as leads in your ERP.
        </p>
      </div>
    </div>
  )
}