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
  Menu,
  Receipt,
  Settings
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
  { name: 'Products', href: '/products', icon: Gem },
  { name: 'Services', href: '/services', icon: Scissors },
  { name: 'Additional Costs', href: '/additional-costs', icon: Receipt },
  { name: 'Settings', href: '/settings', icon: Settings },
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
      <div className="flex h-20 items-center border-b px-6 bg-gradient-to-br from-sidebar to-sidebar/80">
        <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: 'var(--font-heading, var(--font-geist-sans))' }}>
          Gentle Piercing
        </h1>
      </div>
      <nav className="flex-1 space-y-1.5 px-4 py-6">
        {navigation.map((item) => {
          const isActive = pathname === item.href || 
            (item.href !== '/' && pathname?.startsWith(item.href))
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                'flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200',
                isActive
                  ? 'bg-primary text-primary-foreground shadow-sm scale-[1.02]'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground hover:scale-[1.01]'
              )}
            >
              <item.icon className={cn(
                "h-5 w-5 transition-colors",
                isActive ? "text-primary-foreground" : "text-muted-foreground/70"
              )} />
              {item.name}
            </Link>
          )
        })}
      </nav>
      <div className="border-t p-5 bg-gradient-to-br from-sidebar/50 to-sidebar">
        {user && (
          <div className="mb-3 px-3 py-2.5 rounded-lg bg-muted/30">
            <p className="text-sm font-medium truncate">{user.email}</p>
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

