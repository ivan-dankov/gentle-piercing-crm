import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, Calendar, Gem, DollarSign, TrendingUp, TrendingDown, Package, Briefcase, Car, CreditCard, AlertTriangle, Receipt } from 'lucide-react'
import { DashboardDateRangePicker } from '@/components/dashboard-date-range-picker'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Separator } from '@/components/ui/separator'

export const dynamic = 'force-dynamic'

interface DashboardPageProps {
  searchParams: Promise<{ from?: string; to?: string; preset?: string }>
}

export default async function Dashboard({ searchParams }: DashboardPageProps) {
  const params = await searchParams
  const supabase = await createClient()

  // Parse date range from searchParams
  let dateFilter: { from?: Date; to?: Date } = {}
  if (params.from && params.to) {
    dateFilter.from = new Date(params.from)
    dateFilter.to = new Date(params.to)
    // Set to end of day for 'to' date
    if (dateFilter.to) {
      dateFilter.to.setHours(23, 59, 59, 999)
    }
  }

  // Build query with date filter
  let bookingsQuery = supabase
    .from('bookings')
    .select(`
      id,
      total_paid,
      profit,
      travel_fee,
      booksy_fee,
      broken_earring_loss,
      tax_amount,
      start_time,
      booking_earrings(
        id,
        qty,
        price,
        earring:earrings(
          id,
          name,
          cost
        )
      ),
      booking_services(
        id,
        service_id,
        price,
        service:services(
          id,
          name
        )
      ),
      booking_broken_earrings(
        id,
        qty,
        cost,
        earring:earrings(
          id,
          name,
          cost
        )
      )
    `)

  if (dateFilter.from) {
    bookingsQuery = bookingsQuery.gte('start_time', dateFilter.from.toISOString())
  }
  if (dateFilter.to) {
    bookingsQuery = bookingsQuery.lte('start_time', dateFilter.to.toISOString())
  }

  const bookingsResult = await bookingsQuery
  const bookingsData = (bookingsResult.data as any[]) || []

  // Fetch additional costs within date range
  let additionalCostsQuery = supabase
    .from('additional_costs')
    .select('*')

  if (dateFilter.from) {
    // Format date as YYYY-MM-DD in local timezone, not UTC
    const fromDate = new Date(dateFilter.from)
    const fromDateStr = `${fromDate.getFullYear()}-${String(fromDate.getMonth() + 1).padStart(2, '0')}-${String(fromDate.getDate()).padStart(2, '0')}`
    additionalCostsQuery = additionalCostsQuery.gte('date', fromDateStr)
  }
  if (dateFilter.to) {
    // Format date as YYYY-MM-DD in local timezone, not UTC
    const toDate = new Date(dateFilter.to)
    const toDateStr = `${toDate.getFullYear()}-${String(toDate.getMonth() + 1).padStart(2, '0')}-${String(toDate.getDate()).padStart(2, '0')}`
    additionalCostsQuery = additionalCostsQuery.lte('date', toDateStr)
  }

  const additionalCostsResult = await additionalCostsQuery
  const additionalCostsData = (additionalCostsResult.data as any[]) || []

  // Calculate additional costs by category
  const additionalCostsByCategory: Record<string, number> = {
    rent: 0,
    ads: 0,
    print: 0,
    consumables: 0,
    other: 0,
  }

  additionalCostsData.forEach((cost: any) => {
    if (cost.type && additionalCostsByCategory.hasOwnProperty(cost.type)) {
      additionalCostsByCategory[cost.type] += cost.amount || 0
    }
  })

  const totalAdditionalCosts = Object.values(additionalCostsByCategory).reduce((sum, val) => sum + val, 0)

  // Calculate financial metrics
  const totalRevenue = bookingsData.reduce((sum, b: any) => sum + (b.total_paid || 0), 0) || 0
  const totalProfitFromBookings = bookingsData.reduce((sum, b: any) => sum + (b.profit || 0), 0) || 0
  // Subtract additional costs from profit since they're not included in individual booking profit calculations
  const totalProfit = totalProfitFromBookings - totalAdditionalCosts
  const totalBookings = bookingsData.length

  // Calculate costs breakdown
  let totalEarringCosts = 0
  let totalTravelFees = 0
  let totalBooksyFees = 0
  let totalBrokenEarringLosses = 0
  let totalTax = 0

  bookingsData.forEach((booking: any) => {
    // Earring costs from booking_earrings
    if (booking.booking_earrings && Array.isArray(booking.booking_earrings)) {
      booking.booking_earrings.forEach((be: any) => {
        const earring = Array.isArray(be.earring) ? be.earring[0] : be.earring
        if (earring?.cost) {
          totalEarringCosts += (earring.cost || 0) * (be.qty || 0)
        }
      })
    }

    // Travel fees
    totalTravelFees += booking.travel_fee || 0

    // Booksy fees
    totalBooksyFees += booking.booksy_fee || 0

    // Broken earring losses from booking_broken_earrings
    if (booking.booking_broken_earrings && Array.isArray(booking.booking_broken_earrings)) {
      booking.booking_broken_earrings.forEach((bbe: any) => {
        const cost = bbe.cost || (Array.isArray(bbe.earring) ? bbe.earring[0]?.cost : bbe.earring?.cost) || 0
        totalBrokenEarringLosses += cost * (bbe.qty || 0)
      })
    } else if (booking.broken_earring_loss) {
      // Fallback to legacy field
      totalBrokenEarringLosses += booking.broken_earring_loss || 0
    }

    // Tax
    totalTax += booking.tax_amount || 0
  })

  const totalCosts = totalEarringCosts + totalTravelFees + totalBooksyFees + totalBrokenEarringLosses + totalTax + totalAdditionalCosts

  // Calculate averages per booking
  const avgRevenuePerBooking = totalBookings > 0 ? totalRevenue / totalBookings : 0
  const avgProfitPerBooking = totalBookings > 0 ? totalProfit / totalBookings : 0
  const avgCostPerBooking = totalBookings > 0 ? totalCosts / totalBookings : 0

  // Top 5 earrings by sales (quantity)
  const earringSalesMap = new Map<string, { name: string; qty: number; revenue: number }>()
  
  bookingsData.forEach((booking: any) => {
    if (booking.booking_earrings && Array.isArray(booking.booking_earrings)) {
      booking.booking_earrings.forEach((be: any) => {
        const earring = Array.isArray(be.earring) ? be.earring[0] : be.earring
        if (earring) {
          const earringId = earring.id
          const existing = earringSalesMap.get(earringId) || { name: earring.name, qty: 0, revenue: 0 }
          
          // Calculate revenue proportion based on price or estimate from total_paid
          const revenue = be.price ? be.price * (be.qty || 0) : (booking.total_paid || 0) * 0.5 // Estimate if no price
          
          earringSalesMap.set(earringId, {
            name: existing.name,
            qty: existing.qty + (be.qty || 0),
            revenue: existing.revenue + revenue,
          })
        }
      })
    }
  })

  const topEarrings = Array.from(earringSalesMap.values())
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5)

  // Top 5 services by sales (revenue)
  const serviceSalesMap = new Map<string, { name: string; count: number; revenue: number }>()
  
  bookingsData.forEach((booking: any) => {
    if (booking.booking_services && Array.isArray(booking.booking_services)) {
      booking.booking_services.forEach((bs: any) => {
        const service = Array.isArray(bs.service) ? bs.service[0] : bs.service
        if (service) {
          const serviceId = service.id
          const existing = serviceSalesMap.get(serviceId) || { name: service.name, count: 0, revenue: 0 }
          
          serviceSalesMap.set(serviceId, {
            name: existing.name,
            count: existing.count + 1,
            revenue: existing.revenue + (bs.price || 0),
          })
        }
      })
    }
  })

  const topServices = Array.from(serviceSalesMap.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5)

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold">Dashboard</h1>
        <DashboardDateRangePicker />
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalRevenue.toFixed(2)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Profit</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalProfit.toFixed(2)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalBookings}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Costs</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalCosts.toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Costs Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Costs Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Earring Costs</span>
              </div>
              <span className="text-sm font-bold">${totalEarringCosts.toFixed(2)}</span>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Car className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Travel Fees</span>
              </div>
              <span className="text-sm font-bold">${totalTravelFees.toFixed(2)}</span>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Booksy Fees</span>
              </div>
              <span className="text-sm font-bold">${totalBooksyFees.toFixed(2)}</span>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Broken Earring Losses</span>
              </div>
              <span className="text-sm font-bold">${totalBrokenEarringLosses.toFixed(2)}</span>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Tax</span>
              </div>
              <span className="text-sm font-bold">${totalTax.toFixed(2)}</span>
            </div>
            {totalAdditionalCosts > 0 && (
              <>
                <Separator />
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Receipt className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-semibold">Additional Costs</span>
                    </div>
                    <span className="text-sm font-bold">${totalAdditionalCosts.toFixed(2)}</span>
                  </div>
                  <div className="pl-6 space-y-1">
                    {additionalCostsByCategory.rent > 0 && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Rent</span>
                        <span className="font-medium">${additionalCostsByCategory.rent.toFixed(2)}</span>
                      </div>
                    )}
                    {additionalCostsByCategory.ads > 0 && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Ads</span>
                        <span className="font-medium">${additionalCostsByCategory.ads.toFixed(2)}</span>
                      </div>
                    )}
                    {additionalCostsByCategory.print > 0 && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Print</span>
                        <span className="font-medium">${additionalCostsByCategory.print.toFixed(2)}</span>
                      </div>
                    )}
                    {additionalCostsByCategory.consumables > 0 && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Consumables</span>
                        <span className="font-medium">${additionalCostsByCategory.consumables.toFixed(2)}</span>
                      </div>
                    )}
                    {additionalCostsByCategory.other > 0 && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Other</span>
                        <span className="font-medium">${additionalCostsByCategory.other.toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Averages per Booking */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Revenue/Booking</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${avgRevenuePerBooking.toFixed(2)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Profit/Booking</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${avgProfitPerBooking.toFixed(2)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Cost/Booking</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${avgCostPerBooking.toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Top Earrings and Services */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gem className="h-5 w-5" />
              Top 5 Earrings by Sales
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topEarrings.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Earring</TableHead>
                    <TableHead className="text-right">Quantity Sold</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topEarrings.map((earring, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{earring.name}</TableCell>
                      <TableCell className="text-right">{earring.qty}</TableCell>
                      <TableCell className="text-right">${earring.revenue.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-muted-foreground">No earring sales in this period</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              Top Services by Sales
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topServices.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Service</TableHead>
                    <TableHead className="text-right">Bookings</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topServices.map((service, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{service.name}</TableCell>
                      <TableCell className="text-right">{service.count}</TableCell>
                      <TableCell className="text-right">${service.revenue.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-muted-foreground">No service sales in this period</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

