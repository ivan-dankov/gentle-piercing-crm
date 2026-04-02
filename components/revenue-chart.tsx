'use client'

import { useState, useMemo } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { format, getISOWeek, getISOWeekYear, startOfISOWeek, endOfISOWeek, addWeeks } from 'date-fns'

type GroupBy = 'daily' | 'weekly' | 'monthly'

export interface ChartBooking {
  start_time: string
  total_paid: number
  earring_cost: number
  travel_fee: number
  booksy_fee: number
  broken_earring_loss: number
  tax_amount: number
  profit: number
}

export interface ChartAdditionalCost {
  date: string
  amount: number
}

interface PeriodData {
  revenue: number
  bookingCosts: number
  bookingProfit: number
  travelFees: number
  additionalCosts: number
}

interface ChartPoint {
  label: string
  revenue: number
  costs: number
  profit: number
}

function getPeriodKey(date: Date, groupBy: GroupBy): string {
  switch (groupBy) {
    case 'daily':
      return format(date, 'yyyy-MM-dd')
    case 'weekly': {
      const week = getISOWeek(date)
      const year = getISOWeekYear(date)
      return `${year}-W${String(week).padStart(2, '0')}`
    }
    case 'monthly':
      return format(date, 'yyyy-MM')
  }
}

function formatPeriodLabel(key: string, groupBy: GroupBy): string {
  switch (groupBy) {
    case 'daily': {
      const date = new Date(key + 'T12:00:00')
      return format(date, 'MMM d')
    }
    case 'weekly': {
      const [yearStr, weekStr] = key.split('-W')
      const year = parseInt(yearStr)
      const week = parseInt(weekStr)
      // Get Monday of the given ISO week
      const jan4 = new Date(year, 0, 4)
      const weekOneStart = startOfISOWeek(jan4)
      const weekStart = addWeeks(weekOneStart, week - 1)
      const weekEnd = endOfISOWeek(weekStart)
      return `${format(weekStart, 'MMM d')}–${format(weekEnd, 'MMM d')}`
    }
    case 'monthly': {
      const date = new Date(key + '-15')
      return format(date, 'MMM yyyy')
    }
  }
}

// Custom tooltip component
function ChartTooltip({ active, payload, label }: {
  active?: boolean
  payload?: { name: string; value: number; color: string }[]
  label?: string
}) {
  if (!active || !payload?.length) return null

  return (
    <div className="bg-card border border-border rounded-lg px-3 py-2.5 shadow-lg text-sm">
      <p className="font-semibold mb-2 text-foreground">{label}</p>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center gap-2 py-0.5">
          <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: entry.color }} />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-medium text-foreground ml-auto pl-3">
            ${entry.value.toFixed(2)}
          </span>
        </div>
      ))}
    </div>
  )
}

interface RevenueChartProps {
  bookings: ChartBooking[]
  additionalCosts: ChartAdditionalCost[]
}

export function RevenueChart({ bookings, additionalCosts }: RevenueChartProps) {
  const [groupBy, setGroupBy] = useState<GroupBy>('daily')

  const chartData = useMemo<ChartPoint[]>(() => {
    const periodMap = new Map<string, PeriodData>()

    for (const booking of bookings) {
      const date = new Date(booking.start_time)
      const key = getPeriodKey(date, groupBy)
      const prev = periodMap.get(key) ?? {
        revenue: 0,
        bookingCosts: 0,
        bookingProfit: 0,
        travelFees: 0,
        additionalCosts: 0,
      }

      const bookingCost =
        (booking.earring_cost || 0) +
        (booking.travel_fee || 0) +
        (booking.booksy_fee || 0) +
        (booking.broken_earring_loss || 0) +
        (booking.tax_amount || 0)

      periodMap.set(key, {
        revenue: prev.revenue + (booking.total_paid || 0),
        bookingCosts: prev.bookingCosts + bookingCost,
        bookingProfit: prev.bookingProfit + (booking.profit || 0),
        travelFees: prev.travelFees + (booking.travel_fee || 0),
        additionalCosts: prev.additionalCosts,
      })
    }

    for (const cost of additionalCosts) {
      const date = new Date(cost.date + 'T12:00:00')
      const key = getPeriodKey(date, groupBy)
      const prev = periodMap.get(key) ?? {
        revenue: 0,
        bookingCosts: 0,
        bookingProfit: 0,
        travelFees: 0,
        additionalCosts: 0,
      }
      periodMap.set(key, { ...prev, additionalCosts: prev.additionalCosts + (cost.amount || 0) })
    }

    // Collect and sort keys
    const allKeys = Array.from(
      new Set([
        ...bookings.map((b) => getPeriodKey(new Date(b.start_time), groupBy)),
        ...additionalCosts.map((c) => getPeriodKey(new Date(c.date + 'T12:00:00'), groupBy)),
      ])
    ).sort()

    return allKeys.map((key) => {
      const p = periodMap.get(key)!
      return {
        label: formatPeriodLabel(key, groupBy),
        revenue: p.revenue,
        costs: p.bookingCosts + p.additionalCosts,
        profit: p.bookingProfit - p.travelFees - p.additionalCosts,
      }
    })
  }, [bookings, additionalCosts, groupBy])

  const hasData = chartData.length > 0

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <CardTitle
            className="text-xl"
            style={{ fontFamily: 'var(--font-heading, var(--font-geist-sans))' }}
          >
            Revenue / Costs / Profit
          </CardTitle>
          <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1">
            {(['daily', 'weekly', 'monthly'] as GroupBy[]).map((option) => (
              <Button
                key={option}
                variant={groupBy === option ? 'default' : 'ghost'}
                size="sm"
                className="text-xs capitalize h-7 px-3"
                style={{ minHeight: 'unset', minWidth: 'unset' }}
                onClick={() => setGroupBy(option)}
              >
                {option.charAt(0).toUpperCase() + option.slice(1)}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {hasData ? (
          <ResponsiveContainer width="100%" height={320}>
            <BarChart
              data={chartData}
              margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
              barCategoryGap="25%"
              barGap={3}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.6} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: number) => `$${v}`}
                width={60}
              />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--muted)', opacity: 0.4 }} />
              <Legend
                wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
                formatter={(value: string) =>
                  value.charAt(0).toUpperCase() + value.slice(1)
                }
              />
              <Bar dataKey="revenue" name="Revenue" fill="var(--chart-1)" radius={[3, 3, 0, 0]} />
              <Bar dataKey="costs" name="Costs" fill="var(--chart-2)" radius={[3, 3, 0, 0]} />
              <Bar dataKey="profit" name="Profit" radius={[3, 3, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell
                    key={`profit-${index}`}
                    fill={entry.profit >= 0 ? 'var(--chart-3)' : 'var(--destructive)'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-[320px]">
            <p className="text-sm text-muted-foreground">No data available for the selected period.</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
