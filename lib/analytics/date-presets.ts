import {
  dateToCalendarISOString,
  dateToCalendarISOStringEnd,
  getMonthBoundsInTimezone,
  getTodayInTimezone,
} from '@/lib/date-utils'
import {
  endOfDay,
  endOfWeek,
  startOfDay,
  startOfWeek,
  startOfYear,
  subDays,
  subMonths,
  subWeeks,
} from 'date-fns'

export type AnalyticsPeriod = 'today' | 'thisWeek' | 'thisMonth'

export type DashboardPreset =
  | AnalyticsPeriod
  | 'yesterday'
  | 'lastWeek'
  | 'last7days'
  | 'last30days'
  | 'lastMonth'
  | 'thisYear'

export const RELATIVE_DASHBOARD_PRESETS: DashboardPreset[] = [
  'today',
  'yesterday',
  'thisWeek',
  'lastWeek',
  'last7days',
  'last30days',
  'thisMonth',
  'lastMonth',
  'thisYear',
]

export function resolveDatesForPreset(
  preset: DashboardPreset | AnalyticsPeriod,
  timezone: string = 'Europe/Warsaw'
): { from: string; to: string } | null {
  const todayStr = getTodayInTimezone(timezone)
  const [year, month] = todayStr.split('-').map(Number)
  const todayInTz = new Date(Date.UTC(year, month - 1, Number(todayStr.split('-')[2]), 12, 0, 0, 0))

  let presetDates: { from: Date; to: Date } | null = null

  switch (preset) {
    case 'today':
      presetDates = { from: startOfDay(todayInTz), to: endOfDay(todayInTz) }
      break
    case 'yesterday': {
      const yesterday = subDays(todayInTz, 1)
      presetDates = { from: startOfDay(yesterday), to: endOfDay(yesterday) }
      break
    }
    case 'thisWeek':
      presetDates = {
        from: startOfWeek(todayInTz, { weekStartsOn: 1 }),
        to: endOfWeek(todayInTz, { weekStartsOn: 1 }),
      }
      break
    case 'lastWeek': {
      const lastWeek = subWeeks(todayInTz, 1)
      presetDates = {
        from: startOfWeek(lastWeek, { weekStartsOn: 1 }),
        to: endOfWeek(lastWeek, { weekStartsOn: 1 }),
      }
      break
    }
    case 'last7days':
      presetDates = { from: startOfDay(subDays(todayInTz, 6)), to: endOfDay(todayInTz) }
      break
    case 'last30days':
      presetDates = { from: startOfDay(subDays(todayInTz, 29)), to: endOfDay(todayInTz) }
      break
    case 'thisMonth': {
      const thisMonthFirst = getMonthBoundsInTimezone(year, month, timezone).from
      presetDates = { from: thisMonthFirst, to: endOfDay(todayInTz) }
      break
    }
    case 'lastMonth': {
      const lastMonthNum = month === 1 ? 12 : month - 1
      const lastMonthYear = month === 1 ? year - 1 : year
      presetDates = getMonthBoundsInTimezone(lastMonthYear, lastMonthNum, timezone)
      break
    }
    case 'thisYear':
      presetDates = { from: startOfYear(todayInTz), to: endOfDay(todayInTz) }
      break
    default:
      return null
  }

  return {
    from: dateToCalendarISOString(presetDates.from),
    to: dateToCalendarISOStringEnd(presetDates.to),
  }
}

export function periodLabel(preset: AnalyticsPeriod): string {
  switch (preset) {
    case 'today':
      return 'Сегодня'
    case 'thisWeek':
      return 'Эта неделя'
    case 'thisMonth':
      return 'Этот месяц'
  }
}
