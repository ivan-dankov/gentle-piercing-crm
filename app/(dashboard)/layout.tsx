import { Sidebar } from '@/components/sidebar'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="container mx-auto p-4 sm:p-6 pt-16 sm:pt-4 lg:pt-6">
          {children}
        </div>
      </main>
    </div>
  )
}

