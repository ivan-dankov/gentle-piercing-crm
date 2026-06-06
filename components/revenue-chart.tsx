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
import { format, startOfISOWeek, endOfISOWeek, addWeeks } from 'date-fns'
import {
  buildChartData,
  type DashboardAdditionalCostRow,
  type DashboardBookingRow,
} from '@/lib/analytics/dashboard-metrics'

type GroupBy = 'daily' | 'weekly' | 'monthly'

export type ChartBooking = DashboardBookingRow
export type ChartAdditionalCost = DashboardAdditionalCostRow

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
  timezone: string
}

export function RevenueChart({ bookings, additionalCosts, timezone }: RevenueChartProps) {
  const [groupBy, setGroupBy] = useState<GroupBy>('daily')

  const chartData = useMemo(
    () =>
      buildChartData(bookings, additionalCosts, groupBy, timezone).map((point) => ({
        ...point,
        label: formatPeriodLabel(point.label, groupBy),
      })),
    [bookings, additionalCosts, groupBy, timezone]
  )

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
