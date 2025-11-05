'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { 
  Users, 
  Calendar, 
  Gem, 
  Scissors, 
  LayoutDashboard,
  Menu
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { LogoutButton } from '@/components/auth/logout-button'
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer'
import { Button } from '@/components/ui/button'
import type { User } from '@supabase/supabase-js'

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Clients', href: '/clients', icon: Users },
  { name: 'Bookings', href: '/bookings', icon: Calendar },
  { name: 'Earrings', href: '/earrings', icon: Gem },
  { name: 'Services', href: '/services', icon: Scissors },
]

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()
  const [user, setUser] = useState<User | null>(null)
  const supabase = createClient()

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      setUser(user)
    }

    getUser()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [supabase.auth])

  return (
    <>
      <div className="flex h-16 items-center border-b px-6">
        <h1 className="text-xl font-bold">Gentle Piercing</h1>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href || 
            (item.href !== '/' && pathname?.startsWith(item.href))
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          )
        })}
      </nav>
      <div className="border-t p-4">
        {user && (
          <div className="mb-2 px-3 py-2">
            <p className="text-sm font-medium">{user.email}</p>
          </div>
        )}
        <LogoutButton />
      </div>
    </>
  )
}

export function Sidebar() {
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex h-screen w-64 flex-col border-r bg-background">
        <SidebarContent />
      </div>

      {/* Mobile Drawer */}
      <div className="lg:hidden">
        <Drawer open={open} onOpenChange={setOpen} direction="left">
          <DrawerTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="fixed top-4 left-4 z-50 lg:hidden"
            >
              <Menu className="h-6 w-6" />
              <span className="sr-only">Open menu</span>
            </Button>
          </DrawerTrigger>
          <DrawerContent className="w-64 h-full flex flex-col">
            <DrawerHeader className="sr-only">
              <DrawerTitle>Navigation</DrawerTitle>
            </DrawerHeader>
            <SidebarContent onNavigate={() => setOpen(false)} />
          </DrawerContent>
        </Drawer>
      </div>
    </>
  )
}

