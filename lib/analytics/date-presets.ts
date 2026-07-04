import {
  addDaysToCalendarDate,
  getTodayInTimezone,
  getUTCDayOfWeekForCalendarDate,
} from '@/lib/date-utils'

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

function toPresetRange(fromDateStr: string, toDateStr: string): { from: string; to: string } {
  return {
    from: `${fromDateStr}T00:00:00.000Z`,
    to: `${toDateStr}T23:59:59.999Z`,
  }
}

function formatCalendarDate(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function getDaysInCalendarMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

function startOfWeekMonday(dateStr: string): string {
  const dayOfWeek = getUTCDayOfWeekForCalendarDate(dateStr)
  const daysSinceMonday = (dayOfWeek + 6) % 7
  return addDaysToCalendarDate(dateStr, -daysSinceMonday)
}

export function resolveDatesForPreset(
  preset: DashboardPreset | AnalyticsPeriod,
  timezone: string = 'Europe/Warsaw'
): { from: string; to: string } | null {
  const todayStr = getTodayInTimezone(timezone)
  const [year, month] = todayStr.split('-').map(Number)

  switch (preset) {
    case 'today':
      return toPresetRange(todayStr, todayStr)
    case 'yesterday': {
      const yesterday = addDaysToCalendarDate(todayStr, -1)
      return toPresetRange(yesterday, yesterday)
    }
    case 'thisWeek': {
      const weekStart = startOfWeekMonday(todayStr)
      const weekEnd = addDaysToCalendarDate(weekStart, 6)
      return toPresetRange(weekStart, weekEnd)
    }
    case 'lastWeek': {
      const thisWeekStart = startOfWeekMonday(todayStr)
      const lastWeekStart = addDaysToCalendarDate(thisWeekStart, -7)
      const lastWeekEnd = addDaysToCalendarDate(lastWeekStart, 6)
      return toPresetRange(lastWeekStart, lastWeekEnd)
    }
    case 'last7days':
      return toPresetRange(addDaysToCalendarDate(todayStr, -6), todayStr)
    case 'last30days':
      return toPresetRange(addDaysToCalendarDate(todayStr, -29), todayStr)
    case 'thisMonth':
      return toPresetRange(formatCalendarDate(year, month, 1), todayStr)
    case 'lastMonth': {
      const lastMonthNum = month === 1 ? 12 : month - 1
      const lastMonthYear = month === 1 ? year - 1 : year
      const lastDay = getDaysInCalendarMonth(lastMonthYear, lastMonthNum)
      return toPresetRange(
        formatCalendarDate(lastMonthYear, lastMonthNum, 1),
        formatCalendarDate(lastMonthYear, lastMonthNum, lastDay)
      )
    }
    case 'thisYear':
      return toPresetRange(formatCalendarDate(year, 1, 1), todayStr)
    default:
      return null
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
