import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, Calendar, Gem, DollarSign } from 'lucide-react'

export default async function Dashboard() {
  const supabase = await createClient()

  const [clientsResult, bookingsResult, earringsResult, servicesResult] = await Promise.all([
    supabase.from('clients').select('id', { count: 'exact', head: true }),
    supabase.from('bookings').select('id, total_paid, profit', { count: 'exact' }),
    supabase.from('earrings').select('id', { count: 'exact', head: true }).eq('active', true),
    supabase.from('services').select('id', { count: 'exact', head: true }).eq('active', true),
  ])

  const totalRevenue = bookingsResult.data?.reduce((sum, b) => sum + (b.total_paid || 0), 0) || 0
  const totalProfit = bookingsResult.data?.reduce((sum, b) => sum + (b.profit || 0), 0) || 0

  const stats = [
    {
      title: 'Total Clients',
      value: clientsResult.count || 0,
      icon: Users,
    },
    {
      title: 'Total Bookings',
      value: bookingsResult.count || 0,
      icon: Calendar,
    },
    {
      title: 'Active Earrings',
      value: earringsResult.count || 0,
      icon: Gem,
    },
    {
      title: 'Total Revenue',
      value: `$${totalRevenue.toFixed(2)}`,
      icon: DollarSign,
    },
    {
      title: 'Total Profit',
      value: `$${totalProfit.toFixed(2)}`,
      icon: DollarSign,
    },
  ]

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

