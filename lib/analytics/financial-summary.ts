import { createAdminClient } from '@/lib/supabase/admin'
import {
  createAdditionalCostDateFilter,
  createBookingDateFilter,
} from '@/lib/date-utils'
import {
  type AnalyticsPeriod,
  periodLabel,
  resolveDatesForPreset,
} from '@/lib/analytics/date-presets'

export interface FinancialSummary {
  period: AnalyticsPeriod
  label: string
  timezone: string
  revenue: number
  profit: number
  bookingCount: number
}

export async function getFinancialSummary(
  userId: string,
  period: AnalyticsPeriod,
  timezone: string = 'Europe/Warsaw'
): Promise<FinancialSummary> {
  const resolved = resolveDatesForPreset(period, timezone)
  if (!resolved) {
    throw new Error(`Unsupported analytics period: ${period}`)
  }
  const { from, to } = resolved
  const bookingDateFilter = createBookingDateFilter(from, to, timezone)
  const additionalCostDateFilter = createAdditionalCostDateFilter(from, to)

  const supabase = createAdminClient()

  let bookingsQuery = supabase
    .from('bookings')
    .select('id, total_paid, profit, travel_fee')
    .eq('user_id', userId)

  if (bookingDateFilter.from) {
    bookingsQuery = bookingsQuery.gte(
      'start_time',
      bookingDateFilter.from.toISOString()
    )
  }
  if (bookingDateFilter.to) {
    bookingsQuery = bookingsQuery.lte(
      'start_time',
      bookingDateFilter.to.toISOString()
    )
  }

  const { data: bookings, error: bookingsError } = await bookingsQuery
  if (bookingsError) throw bookingsError

  let additionalCostsQuery = supabase
    .from('additional_costs')
    .select('amount')
    .eq('user_id', userId)

  if (additionalCostDateFilter.fromDateStr) {
    additionalCostsQuery = additionalCostsQuery.gte(
      'date',
      additionalCostDateFilter.fromDateStr
    )
  }
  if (additionalCostDateFilter.toDateStr) {
    additionalCostsQuery = additionalCostsQuery.lte(
      'date',
      additionalCostDateFilter.toDateStr
    )
  }

  const { data: additionalCosts, error: costsError } =
    await additionalCostsQuery
  if (costsError) throw costsError

  const rows = (bookings ?? []) as Array<{
    total_paid: number | null
    profit: number | null
    travel_fee: number | null
  }>
  const revenue = rows.reduce((sum, b) => sum + (Number(b.total_paid) || 0), 0)
  const totalTravelFees = rows.reduce(
    (sum, b) => sum + (Number(b.travel_fee) || 0),
    0
  )
  const totalProfitFromBookings = rows.reduce(
    (sum, b) => sum + (Number(b.profit) || 0),
    0
  )
  const totalAdditionalCosts = (
    (additionalCosts ?? []) as Array<{ amount: number | null }>
  ).reduce((sum, c) => sum + (Number(c.amount) || 0), 0)
  const profit = totalProfitFromBookings - totalTravelFees - totalAdditionalCosts

  return {
    period,
    label: periodLabel(period),
    timezone,
    revenue,
    profit,
    bookingCount: rows.length,
  }
}

export function formatPlnAmount(n: number): string {
  return new Intl.NumberFormat('pl-PL', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round(n))
}

export function formatFinancialSummary(summary: FinancialSummary): string {
  return [
    `${summary.label} (${summary.timezone})`,
    `Выручка: ${formatPlnAmount(summary.revenue)} PLN`,
    `Прибыль: ${formatPlnAmount(summary.profit)} PLN`,
    `Записей: ${summary.bookingCount}`,
  ].join('\n')
}

/** Compact one-liner for post-save Telegram reply */
export function formatTodaySnapshot(summary: FinancialSummary): string {
  return `📊 <b>Сегодня:</b> выручка ${formatPlnAmount(summary.revenue)} PLN, прибыль ${formatPlnAmount(summary.profit)} PLN (${summary.bookingCount} зап.)`
}
