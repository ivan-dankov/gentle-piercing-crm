import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, Calendar, Gem, DollarSign, TrendingUp, TrendingDown, Package, Briefcase, Car, CreditCard, AlertTriangle, Receipt, Plus } from 'lucide-react'
import { DashboardDateRangePicker } from '@/components/dashboard-date-range-picker'
import { createBookingDateFilter, createAdditionalCostDateFilter, extractCalendarDate, extractCalendarDateFromTimestamp, dateToCalendarISOString, dateToCalendarISOStringEnd, getTodayInTimezone, getMonthBoundsInTimezone } from '@/lib/date-utils'
import { startOfDay, endOfDay, startOfMonth, endOfMonth, startOfYear, startOfWeek, endOfWeek, subDays, subMonths, subWeeks } from 'date-fns'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Separator } from '@/components/ui/separator'
import { BookingForm } from '@/components/booking-form'
import { Button } from '@/components/ui/button'

export const dynamic = 'force-dynamic'

interface DashboardPageProps {
  searchParams: Promise<{ from?: string; to?: string; preset?: string }>
}

export default async function Dashboard({ searchParams }: DashboardPageProps) {
  const params = await searchParams
  const supabase = await createClient()
  const cookieStore = await cookies()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  
  // Get user's timezone (default to Europe/Warsaw)
  let timezone = 'Europe/Warsaw'
  if (user) {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('timezone')
      .eq('user_id', user.id)
      .single()
    
    if (profile && typeof profile === 'object' && 'timezone' in profile) {
      const profileTimezone = (profile as { timezone?: string }).timezone
      if (typeof profileTimezone === 'string') {
        timezone = profileTimezone
      }
    }
  }

  // Get date range from URL params or cookie (for server-side rendering)
  let fromParam = params.from || null
  let toParam = params.to || null
  
  // If no URL params, try reading from cookie
  if (!fromParam || !toParam) {
    try {
      const dateRangeCookie = cookieStore.get('dashboard-date-range')
      if (dateRangeCookie?.value) {
        const cookieData = JSON.parse(decodeURIComponent(dateRangeCookie.value))
        
        // If preset is "allTime", we don't need dates (show all data)
        if (cookieData.preset === 'allTime') {
          fromParam = null
          toParam = null
        } else if (cookieData.preset && ['today', 'yesterday', 'thisWeek', 'lastWeek', 'last7days', 'last30days', 'thisMonth', 'lastMonth', 'thisYear'].includes(cookieData.preset)) {
          // For presets, regenerate dates on server side (dates in cookie might be stale)
          // This ensures "today" always means today, not the day it was last selected
          // Get "today" in the user's timezone to ensure correct month calculations
          const todayStr = getTodayInTimezone(timezone)
          const [year, month, day] = todayStr.split('-').map(Number)
          // Create a date at noon in the user's timezone to avoid DST issues
          const todayInTz = new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0))
          
          let presetDates: { from: Date; to: Date } | null = null
          switch (cookieData.preset) {
            case 'today':
              presetDates = { from: startOfDay(todayInTz), to: endOfDay(todayInTz) }
              break
            case 'yesterday':
              const yesterday = subDays(todayInTz, 1)
              presetDates = { from: startOfDay(yesterday), to: endOfDay(yesterday) }
              break
            case 'thisWeek':
              presetDates = { from: startOfWeek(todayInTz, { weekStartsOn: 1 }), to: endOfWeek(todayInTz, { weekStartsOn: 1 }) }
              break
            case 'lastWeek':
              const lastWeek = subWeeks(todayInTz, 1)
              presetDates = { from: startOfWeek(lastWeek, { weekStartsOn: 1 }), to: endOfWeek(lastWeek, { weekStartsOn: 1 }) }
              break
            case 'last7days':
              presetDates = { from: startOfDay(subDays(todayInTz, 6)), to: endOfDay(todayInTz) }
              break
            case 'last30days':
              presetDates = { from: startOfDay(subDays(todayInTz, 29)), to: endOfDay(todayInTz) }
              break
            case 'thisMonth':
              // This month: from 1st of current month to today
              const thisMonthFirst = getMonthBoundsInTimezone(year, month, timezone).from
              presetDates = { from: thisMonthFirst, to: endOfDay(todayInTz) }
              break
            case 'lastMonth':
              // Calculate last month in the user's timezone
              const lastMonthNum = month === 1 ? 12 : month - 1
              const lastMonthYear = month === 1 ? year - 1 : year
              presetDates = getMonthBoundsInTimezone(lastMonthYear, lastMonthNum, timezone)
              break
            case 'thisYear':
              presetDates = { from: startOfYear(todayInTz), to: endOfDay(todayInTz) }
              break
          }
          
          if (presetDates) {
            // Convert to calendar ISO strings for consistency
            // Use start of day for "from" and end of day for "to" to ensure full day coverage
            fromParam = dateToCalendarISOString(presetDates.from)
            toParam = dateToCalendarISOStringEnd(presetDates.to)
          }
        } else if (cookieData.from && cookieData.to) {
          // Custom date range - use stored dates
          fromParam = cookieData.from
          toParam = cookieData.to
        }
      }
    } catch (error) {
      // Ignore cookie parsing errors
      console.error('Failed to parse date range cookie:', error)
    }
  }

  // Parse date range from searchParams or cookie using consistent date utilities with timezone
  const bookingDateFilter = createBookingDateFilter(fromParam, toParam, timezone)
  const additionalCostDateFilter = createAdditionalCostDateFilter(fromParam, toParam)

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
      booking_products(
        id,
        qty,
        price,
        product:products(
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
      booking_broken_products(
        id,
        qty,
        cost,
        product:products(
          id,
          name,
          cost
        )
      )
    `)

  if (bookingDateFilter.from) {
    bookingsQuery = bookingsQuery.gte('start_time', bookingDateFilter.from.toISOString())
  }
  if (bookingDateFilter.to) {
    bookingsQuery = bookingsQuery.lte('start_time', bookingDateFilter.to.toISOString())
  }

  const bookingsResult = await bookingsQuery
  const bookingsData = (bookingsResult.data as any[]) || []
  
  // Note: We use an expanded date range (1 day on each side) to ensure bookings
  // made at 00:00 local time in any timezone are included. The database query
  // handles the filtering, and the expanded range ensures we don't miss edge cases.

  // Fetch additional costs within date range
  let additionalCostsQuery = supabase
    .from('additional_costs')
    .select('*')

  if (additionalCostDateFilter.fromDateStr) {
    additionalCostsQuery = additionalCostsQuery.gte('date', additionalCostDateFilter.fromDateStr)
  }
  if (additionalCostDateFilter.toDateStr) {
    additionalCostsQuery = additionalCostsQuery.lte('date', additionalCostDateFilter.toDateStr)
  }

  const additionalCostsResult = await additionalCostsQuery
  const additionalCostsData = (additionalCostsResult.data as any[]) || []

  // Calculate additional costs by category (dynamically from data)
  const additionalCostsByCategory: Record<string, number> = {}

  additionalCostsData.forEach((cost: any) => {
    if (cost.type) {
      if (!additionalCostsByCategory[cost.type]) {
        additionalCostsByCategory[cost.type] = 0
      }
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
    // Product costs from booking_products
    if (booking.booking_products && Array.isArray(booking.booking_products)) {
      booking.booking_products.forEach((be: any) => {
        const product = Array.isArray(be.product) ? be.product[0] : be.product
        if (product?.cost) {
          totalEarringCosts += (product.cost || 0) * (be.qty || 0)
        }
      })
    }

    // Travel fees
    totalTravelFees += booking.travel_fee || 0

    // Booksy fees
    totalBooksyFees += booking.booksy_fee || 0

    // Broken product losses from booking_broken_products
    if (booking.booking_broken_products && Array.isArray(booking.booking_broken_products)) {
      booking.booking_broken_products.forEach((bbe: any) => {
        const cost = bbe.cost || (Array.isArray(bbe.product) ? bbe.product[0]?.cost : bbe.product?.cost) || 0
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

  // Top 5 products by sales (quantity)
  const productSalesMap = new Map<string, { name: string; qty: number; revenue: number }>()
  
  bookingsData.forEach((booking: any) => {
    if (booking.booking_products && Array.isArray(booking.booking_products)) {
      booking.booking_products.forEach((be: any) => {
        const product = Array.isArray(be.product) ? be.product[0] : be.product
        if (product) {
          const productId = product.id
          const existing = productSalesMap.get(productId) || { name: product.name, qty: 0, revenue: 0 }
          
          // Calculate revenue proportion based on price or estimate from total_paid
          const revenue = be.price ? be.price * (be.qty || 0) : (booking.total_paid || 0) * 0.5 // Estimate if no price
          
          productSalesMap.set(productId, {
            name: existing.name,
            qty: existing.qty + (be.qty || 0),
            revenue: existing.revenue + revenue,
          })
        }
      })
    }
  })
  
  const topProducts = Array.from(productSalesMap.values())
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
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight" style={{ fontFamily: 'var(--font-heading, var(--font-geist-sans))' }}>
          Dashboard
        </h1>
        <div className="flex items-center gap-3 self-start sm:self-auto">
          <BookingForm>
            <Button size="sm" className="text-xs sm:text-sm shadow-sm">
              <Plus className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">New Booking</span>
              <span className="sm:hidden">New</span>
            </Button>
          </BookingForm>
          <DashboardDateRangePicker />
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
            <div className="p-2 bg-primary/10 rounded-lg">
              <DollarSign className="h-5 w-5 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight">${totalRevenue.toFixed(2)}</div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Profit</CardTitle>
            <div className="p-2 bg-accent/20 rounded-lg">
              <TrendingUp className="h-5 w-5 text-accent" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight">${totalProfit.toFixed(2)}</div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Bookings</CardTitle>
            <div className="p-2 bg-secondary/40 rounded-lg">
              <Calendar className="h-5 w-5 text-secondary-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight">{totalBookings}</div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Costs</CardTitle>
            <div className="p-2 bg-muted/60 rounded-lg">
              <TrendingDown className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight">${totalCosts.toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Costs Breakdown */}
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader>
          <CardTitle className="text-xl" style={{ fontFamily: 'var(--font-heading, var(--font-geist-sans))' }}>
            Costs Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/30 transition-colors">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Package className="h-4 w-4 text-primary" />
                </div>
                <span className="text-sm font-medium">Product Costs</span>
              </div>
              <span className="text-sm font-bold tracking-tight">${totalEarringCosts.toFixed(2)}</span>
            </div>
            <Separator />
            <div className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/30 transition-colors">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-accent/20 rounded-lg">
                  <Car className="h-4 w-4 text-accent" />
                </div>
                <span className="text-sm font-medium">Travel Fees</span>
              </div>
              <span className="text-sm font-bold tracking-tight">${totalTravelFees.toFixed(2)}</span>
            </div>
            <Separator />
            <div className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/30 transition-colors">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-secondary/40 rounded-lg">
                  <CreditCard className="h-4 w-4 text-secondary-foreground" />
                </div>
                <span className="text-sm font-medium">Booksy Fees</span>
              </div>
              <span className="text-sm font-bold tracking-tight">${totalBooksyFees.toFixed(2)}</span>
            </div>
            <Separator />
            <div className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/30 transition-colors">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-destructive/10 rounded-lg">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                </div>
                <span className="text-sm font-medium">Broken Product Losses</span>
              </div>
              <span className="text-sm font-bold tracking-tight">${totalBrokenEarringLosses.toFixed(2)}</span>
            </div>
            <Separator />
            <div className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/30 transition-colors">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-muted/60 rounded-lg">
                  <Receipt className="h-4 w-4 text-muted-foreground" />
                </div>
                <span className="text-sm font-medium">Tax</span>
              </div>
              <span className="text-sm font-bold tracking-tight">${totalTax.toFixed(2)}</span>
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
                    {Object.entries(additionalCostsByCategory)
                      .sort(([a], [b]) => a.localeCompare(b))
                      .map(([category, amount]) => (
                        <div key={category} className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground capitalize">{category}</span>
                          <span className="font-medium">${amount.toFixed(2)}</span>
                        </div>
                      ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Averages per Booking */}
      <div className="grid gap-5 md:grid-cols-3">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg Revenue/Booking</CardTitle>
            <div className="p-2 bg-primary/10 rounded-lg">
              <DollarSign className="h-5 w-5 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight">${avgRevenuePerBooking.toFixed(2)}</div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg Profit/Booking</CardTitle>
            <div className="p-2 bg-accent/20 rounded-lg">
              <TrendingUp className="h-5 w-5 text-accent" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight">${avgProfitPerBooking.toFixed(2)}</div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg Cost/Booking</CardTitle>
            <div className="p-2 bg-muted/60 rounded-lg">
              <TrendingDown className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight">${avgCostPerBooking.toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Top Earrings and Services */}
      <div className="grid gap-5 md:grid-cols-2">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-xl" style={{ fontFamily: 'var(--font-heading, var(--font-geist-sans))' }}>
              <div className="p-2 bg-primary/10 rounded-lg">
                <Gem className="h-5 w-5 text-primary" />
              </div>
              Top 5 Products by Sales
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topProducts.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-semibold">Product</TableHead>
                    <TableHead className="text-right font-semibold">Quantity Sold</TableHead>
                    <TableHead className="text-right font-semibold">Revenue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topProducts.map((product, index) => (
                      <TableRow key={index} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell className="text-right">{product.qty}</TableCell>
                      <TableCell className="text-right font-semibold">${product.revenue.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-muted-foreground">No product sales in this period</p>
            )}
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-xl" style={{ fontFamily: 'var(--font-heading, var(--font-geist-sans))' }}>
              <div className="p-2 bg-accent/20 rounded-lg">
                <Briefcase className="h-5 w-5 text-accent" />
              </div>
              Top Services by Sales
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topServices.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-semibold">Service</TableHead>
                    <TableHead className="text-right font-semibold">Bookings</TableHead>
                    <TableHead className="text-right font-semibold">Revenue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topServices.map((service, index) => (
                    <TableRow key={index} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="font-medium">{service.name}</TableCell>
                      <TableCell className="text-right">{service.count}</TableCell>
                      <TableCell className="text-right font-semibold">${service.revenue.toFixed(2)}</TableCell>
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

