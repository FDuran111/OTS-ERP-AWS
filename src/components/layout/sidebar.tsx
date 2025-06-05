'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  Home,
  Briefcase,
  Users,
  Calendar,
  Package,
  FileText,
  Settings,
  LogOut,
  Clock,
  DollarSign,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { UserRole } from '@prisma/client'

interface SidebarProps {
  userRole: UserRole
}

export function Sidebar({ userRole }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    localStorage.removeItem('user')
    router.push('/login')
  }

  const navigation = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: Home,
      roles: ['ADMIN', 'OFFICE'],
    },
    {
      name: 'Jobs',
      href: '/jobs',
      icon: Briefcase,
      roles: ['ADMIN', 'OFFICE', 'FIELD_CREW'],
    },
    {
      name: 'Schedule',
      href: '/schedule',
      icon: Calendar,
      roles: ['ADMIN', 'OFFICE'],
    },
    {
      name: 'Time Tracking',
      href: '/time',
      icon: Clock,
      roles: ['ADMIN', 'OFFICE', 'FIELD_CREW'],
    },
    {
      name: 'Customers',
      href: '/customers',
      icon: Users,
      roles: ['ADMIN', 'OFFICE'],
    },
    {
      name: 'Materials',
      href: '/materials',
      icon: Package,
      roles: ['ADMIN', 'OFFICE'],
    },
    {
      name: 'Invoicing',
      href: '/invoicing',
      icon: DollarSign,
      roles: ['ADMIN', 'OFFICE'],
    },
    {
      name: 'Reports',
      href: '/reports',
      icon: FileText,
      roles: ['ADMIN', 'OFFICE'],
    },
    {
      name: 'Settings',
      href: '/settings',
      icon: Settings,
      roles: ['ADMIN'],
    },
  ]

  const filteredNavigation = navigation.filter((item) =>
    item.roles.includes(userRole)
  )

  return (
    <div className="flex h-full w-64 flex-col bg-gray-900">
      <div className="flex h-16 items-center px-4">
        <h2 className="text-lg font-semibold text-white">Ortmeier Tech</h2>
      </div>
      <nav className="flex-1 space-y-1 px-2 py-4">
        {filteredNavigation.map((item) => {
          const isActive = pathname.startsWith(item.href)
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                isActive
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white',
                'group flex items-center px-2 py-2 text-sm font-medium rounded-md'
              )}
            >
              <item.icon
                className={cn(
                  isActive
                    ? 'text-gray-300'
                    : 'text-gray-400 group-hover:text-gray-300',
                  'mr-3 h-5 w-5 flex-shrink-0'
                )}
              />
              {item.name}
            </Link>
          )
        })}
      </nav>
      <div className="flex-shrink-0 p-4">
        <Button
          variant="ghost"
          className="w-full justify-start text-gray-300 hover:bg-gray-700 hover:text-white"
          onClick={handleLogout}
        >
          <LogOut className="mr-3 h-5 w-5" />
          Logout
        </Button>
      </div>
    </div>
  )
}