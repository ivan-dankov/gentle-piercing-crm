import { Sidebar } from '@/components/sidebar'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-gradient-to-br from-background via-background to-muted/20">
        <div className="container mx-auto p-6 sm:p-8 pt-16 sm:pt-6 lg:pt-8 space-y-8">
          {children}
        </div>
      </main>
    </div>
  )
}

