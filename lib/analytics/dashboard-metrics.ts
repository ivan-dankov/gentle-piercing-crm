import { getISOWeek, getISOWeekYear } from 'date-fns'
import { extractCalendarDateInTimezone } from '@/lib/date-utils'

type GroupBy = 'daily' | 'weekly' | 'monthly'

export interface DashboardBookingRow {
  start_time: string
  total_paid: number | null
  profit: number | null
  earring_cost: number | null
  travel_fee: number | null
  booksy_fee: number | null
  broken_earring_loss: number | null
  tax_amount: number | null
  service_id?: string | null
  service_price?: number | null
  service?: { id: string; name: string } | { id: string; name: string }[] | null
  earring_id?: string | null
  earring_qty?: number | null
  earring_revenue?: number | null
  product?: { id: string; name: string } | { id: string; name: string }[] | null
  booking_products?: Array<{
    qty: number | null
    price: number | null
    product?: { id: string; name: string } | { id: string; name: string }[] | null
  }>
  booking_services?: Array<{
    price: number | null
    service?: { id: string; name: string } | { id: string; name: string }[] | null
  }>
}

export interface DashboardAdditionalCostRow {
  date: string
  amount: number | null
  type?: string | null
}

export interface DashboardMetrics {
  totalRevenue: number
  totalBookings: number
  totalProfit: number
  totalCosts: number
  totalEarringCosts: number
  totalTravelFees: number
  totalBooksyFees: number
  totalBrokenEarringLosses: number
  totalTax: number
  totalAdditionalCosts: number
  additionalCostsByCategory: Record<string, number>
  avgRevenuePerBooking: number
  avgProfitPerBooking: number
  avgCostPerBooking: number
  topProducts: Array<{ name: string; qty: number; revenue: number }>
  topServices: Array<{ name: string; count: number; revenue: number }>
}

export interface ChartPoint {
  label: string
  revenue: number
  costs: number
  profit: number
}

function unwrapRelation<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null
  return Array.isArray(value) ? value[0] ?? null : value
}

/** Booking-level costs included in the costs breakdown and chart. */
export function getBookingDirectCosts(booking: DashboardBookingRow): number {
  return (
    (booking.earring_cost || 0) +
    (booking.travel_fee || 0) +
    (booking.booksy_fee || 0) +
    (booking.broken_earring_loss || 0) +
    (booking.tax_amount || 0)
  )
}

/**
 * Stored profit excludes travel_fee. Subtract travel and additional costs for
 * the figure shown on the dashboard and chart.
 */
export function getBookingProfit(booking: DashboardBookingRow): number {
  return (booking.profit || 0) - (booking.travel_fee || 0)
}

export function getPeriodKey(
  date: Date | string,
  groupBy: GroupBy,
  timezone: string
): string {
  const instant = typeof date === 'string' ? new Date(date) : date

  switch (groupBy) {
    case 'daily':
      return extractCalendarDateInTimezone(instant, timezone)
    case 'weekly': {
      const calendarDate = extractCalendarDateInTimezone(instant, timezone)
      const [year, month, day] = calendarDate.split('-').map(Number)
      const localDate = new Date(year, month - 1, day, 12, 0, 0)
      const week = getISOWeek(localDate)
      const weekYear = getISOWeekYear(localDate)
      return `${weekYear}-W${String(week).padStart(2, '0')}`
    }
    case 'monthly': {
      const calendarDate = extractCalendarDateInTimezone(instant, timezone)
      return calendarDate.slice(0, 7)
    }
  }
}

export function calculateDashboardMetrics(
  bookings: DashboardBookingRow[],
  additionalCosts: DashboardAdditionalCostRow[]
): DashboardMetrics {
  const additionalCostsByCategory: Record<string, number> = {}

  additionalCosts.forEach((cost) => {
    if (cost.type) {
      additionalCostsByCategory[cost.type] =
        (additionalCostsByCategory[cost.type] || 0) + (cost.amount || 0)
    }
  })

  const totalAdditionalCosts = Object.values(additionalCostsByCategory).reduce(
    (sum, value) => sum + value,
    0
  )

  let totalEarringCosts = 0
  let totalTravelFees = 0
  let totalBooksyFees = 0
  let totalBrokenEarringLosses = 0
  let totalTax = 0
  let totalProfitFromBookings = 0

  bookings.forEach((booking) => {
    totalEarringCosts += booking.earring_cost || 0
    totalTravelFees += booking.travel_fee || 0
    totalBooksyFees += booking.booksy_fee || 0
    totalBrokenEarringLosses += booking.broken_earring_loss || 0
    totalTax += booking.tax_amount || 0
    totalProfitFromBookings += booking.profit || 0
  })

  const totalRevenue = bookings.reduce((sum, booking) => sum + (booking.total_paid || 0), 0)
  const totalBookings = bookings.length
  const totalCosts =
    totalEarringCosts +
    totalTravelFees +
    totalBooksyFees +
    totalBrokenEarringLosses +
    totalTax +
    totalAdditionalCosts
  const totalProfit = totalProfitFromBookings - totalTravelFees - totalAdditionalCosts

  const productSalesMap = new Map<string, { name: string; qty: number; revenue: number }>()
  const serviceSalesMap = new Map<string, { name: string; count: number; revenue: number }>()

  bookings.forEach((booking) => {
    if (booking.booking_products?.length) {
      booking.booking_products.forEach((item) => {
        const product = unwrapRelation(item.product)
        if (!product) return

        const existing = productSalesMap.get(product.id) || {
          name: product.name,
          qty: 0,
          revenue: 0,
        }

        productSalesMap.set(product.id, {
          name: existing.name,
          qty: existing.qty + (item.qty || 0),
          revenue: existing.revenue + (item.price ? item.price * (item.qty || 0) : 0),
        })
      })
    } else {
      const product = unwrapRelation(booking.product)
      if (product) {
        const existing = productSalesMap.get(product.id) || {
          name: product.name,
          qty: 0,
          revenue: 0,
        }

        productSalesMap.set(product.id, {
          name: existing.name,
          qty: existing.qty + (booking.earring_qty || 0),
          revenue: existing.revenue + (booking.earring_revenue || 0),
        })
      }
    }

    if (booking.booking_services?.length) {
      booking.booking_services.forEach((item) => {
        const service = unwrapRelation(item.service)
        if (!service) return

        const existing = serviceSalesMap.get(service.id) || {
          name: service.name,
          count: 0,
          revenue: 0,
        }

        serviceSalesMap.set(service.id, {
          name: existing.name,
          count: existing.count + 1,
          revenue: existing.revenue + (item.price || 0),
        })
      })
    } else {
      const service = unwrapRelation(booking.service)
      if (service && booking.service_id) {
        const existing = serviceSalesMap.get(service.id) || {
          name: service.name,
          count: 0,
          revenue: 0,
        }

        serviceSalesMap.set(service.id, {
          name: existing.name,
          count: existing.count + 1,
          revenue: existing.revenue + (booking.service_price || 0),
        })
      }
    }
  })

  return {
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
    avgRevenuePerBooking: totalBookings > 0 ? totalRevenue / totalBookings : 0,
    avgProfitPerBooking: totalBookings > 0 ? totalProfit / totalBookings : 0,
    avgCostPerBooking: totalBookings > 0 ? totalCosts / totalBookings : 0,
    topProducts: Array.from(productSalesMap.values())
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5),
    topServices: Array.from(serviceSalesMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5),
  }
}

export function buildChartData(
  bookings: DashboardBookingRow[],
  additionalCosts: DashboardAdditionalCostRow[],
  groupBy: GroupBy,
  timezone: string
): ChartPoint[] {
  const periodMap = new Map<
    string,
    {
      revenue: number
      bookingCosts: number
      bookingProfit: number
      travelFees: number
      additionalCosts: number
    }
  >()

  for (const booking of bookings) {
    const key = getPeriodKey(booking.start_time, groupBy, timezone)
    const prev = periodMap.get(key) ?? {
      revenue: 0,
      bookingCosts: 0,
      bookingProfit: 0,
      travelFees: 0,
      additionalCosts: 0,
    }

    periodMap.set(key, {
      revenue: prev.revenue + (booking.total_paid || 0),
      bookingCosts: prev.bookingCosts + getBookingDirectCosts(booking),
      bookingProfit: prev.bookingProfit + (booking.profit || 0),
      travelFees: prev.travelFees + (booking.travel_fee || 0),
      additionalCosts: prev.additionalCosts,
    })
  }

  for (const cost of additionalCosts) {
    const key = getPeriodKey(cost.date + 'T12:00:00', groupBy, timezone)
    const prev = periodMap.get(key) ?? {
      revenue: 0,
      bookingCosts: 0,
      bookingProfit: 0,
      travelFees: 0,
      additionalCosts: 0,
    }
    periodMap.set(key, {
      ...prev,
      additionalCosts: prev.additionalCosts + (cost.amount || 0),
    })
  }

  const allKeys = Array.from(
    new Set([
      ...bookings.map((booking) => getPeriodKey(booking.start_time, groupBy, timezone)),
      ...additionalCosts.map((cost) =>
        getPeriodKey(cost.date + 'T12:00:00', groupBy, timezone)
      ),
    ])
  ).sort()

  return allKeys.map((key) => {
    const period = periodMap.get(key)!
    return {
      label: key,
      revenue: period.revenue,
      costs: period.bookingCosts + period.additionalCosts,
      profit: period.bookingProfit - period.travelFees - period.additionalCosts,
    }
  })
}

/** Verify chart totals reconcile with headline metrics. */
export function chartTotalsMatchMetrics(
  chartData: ChartPoint[],
  metrics: Pick<DashboardMetrics, 'totalRevenue' | 'totalCosts' | 'totalProfit'>
): boolean {
  const chartRevenue = chartData.reduce((sum, point) => sum + point.revenue, 0)
  const chartCosts = chartData.reduce((sum, point) => sum + point.costs, 0)
  const chartProfit = chartData.reduce((sum, point) => sum + point.profit, 0)
  const epsilon = 0.01

  return (
    Math.abs(chartRevenue - metrics.totalRevenue) < epsilon &&
    Math.abs(chartCosts - metrics.totalCosts) < epsilon &&
    Math.abs(chartProfit - metrics.totalProfit) < epsilon
  )
}
