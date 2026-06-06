import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar, Gem, DollarSign, TrendingUp, TrendingDown, Package, Briefcase, Car, CreditCard, AlertTriangle, Receipt } from 'lucide-react'
import { DashboardDateRangePicker } from '@/components/dashboard-date-range-picker'
import { createBookingDateFilter, createAdditionalCostDateFilter } from '@/lib/date-utils'
import { RELATIVE_DASHBOARD_PRESETS, resolveDatesForPreset } from '@/lib/analytics/date-presets'
import { calculateDashboardMetrics, type DashboardAdditionalCostRow, type DashboardBookingRow } from '@/lib/analytics/dashboard-metrics'
import { fetchDashboardBookings } from '@/lib/bookings/fetch-dashboard-bookings'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Separator } from '@/components/ui/separator'
import { RevenueChart } from '@/components/revenue-chart'

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

  // If a named preset is in the URL, always regenerate dates fresh from today —
  // the from/to in the URL are stale (they were computed when the user last clicked the preset).
  if (params.preset && RELATIVE_DASHBOARD_PRESETS.includes(params.preset as typeof RELATIVE_DASHBOARD_PRESETS[number])) {
    const resolved = resolveDatesForPreset(params.preset as typeof RELATIVE_DASHBOARD_PRESETS[number], timezone)
    if (resolved) {
      fromParam = resolved.from
      toParam = resolved.to
    }
  } else if (!fromParam || !toParam) {
    // No usable URL params — fall back to cookie
    try {
      const dateRangeCookie = cookieStore.get('dashboard-date-range')
      if (dateRangeCookie?.value) {
        const cookieData = JSON.parse(decodeURIComponent(dateRangeCookie.value))

        if (cookieData.preset === 'allTime') {
          fromParam = null
          toParam = null
        } else if (cookieData.preset && RELATIVE_DASHBOARD_PRESETS.includes(cookieData.preset)) {
          const resolved = resolveDatesForPreset(cookieData.preset, timezone)
          if (resolved) {
            fromParam = resolved.from
            toParam = resolved.to
          }
        } else if (cookieData.from && cookieData.to) {
          fromParam = cookieData.from
          toParam = cookieData.to
        }
      }
    } catch (error) {
      console.error('Failed to parse date range cookie:', error)
    }
  }

  // Parse date range from searchParams or cookie using consistent date utilities with timezone
  const bookingDateFilter = createBookingDateFilter(fromParam, toParam, timezone)
  const additionalCostDateFilter = createAdditionalCostDateFilter(fromParam, toParam)

  const bookingsData = (await fetchDashboardBookings(supabase, {
    from: bookingDateFilter.from,
    to: bookingDateFilter.to,
  })) as DashboardBookingRow[]

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
  const additionalCostsData = (additionalCostsResult.data as DashboardAdditionalCostRow[]) || []

  const {
    totalRevenue,
    totalBookings,
    totalProfit,
    totalCosts,
    totalEarringCosts,
    totalTravelFees,
    totalBooksyFees,
    totalBrokenEarringLosses,
    totalTax,
    totalAdditionalCosts,
    additionalCostsByCategory,
    avgRevenuePerBooking,
    avgProfitPerBooking,
    avgCostPerBooking,
    topProducts,
    topServices,
  } = calculateDashboardMetrics(bookingsData, additionalCostsData)

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between xl:gap-6">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight shrink-0" style={{ fontFamily: 'var(--font-heading, var(--font-geist-sans))' }}>
          Dashboard
        </h1>
        <div className="w-full min-w-0 xl:w-auto xl:max-w-full">
          <DashboardDateRangePicker timezone={timezone} />
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

      {/* Revenue / Costs / Profit Chart */}
      <RevenueChart
        bookings={bookingsData}
        additionalCosts={additionalCostsData}
        timezone={timezone}
      />

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

