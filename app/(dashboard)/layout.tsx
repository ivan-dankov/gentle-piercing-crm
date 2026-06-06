import { MobileNav, Sidebar } from '@/components/sidebar'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <MobileNav />
        <main className="flex-1 min-w-0 overflow-y-auto overflow-x-clip bg-gradient-to-br from-background via-background to-muted/20">
          <div className="container mx-auto min-w-0 space-y-8 p-6 sm:p-8 lg:pt-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}

