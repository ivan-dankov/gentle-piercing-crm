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
} from 'date-fns'

export type AnalyticsPeriod = 'today' | 'thisWeek' | 'thisMonth'

export function resolveDatesForPreset(
  preset: AnalyticsPeriod,
  timezone: string = 'Europe/Warsaw'
): { from: string; to: string } {
  const todayStr = getTodayInTimezone(timezone)
  const [year, month, day] = todayStr.split('-').map(Number)
  const todayInTz = new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0))

  let presetDates: { from: Date; to: Date }

  switch (preset) {
    case 'today':
      presetDates = { from: startOfDay(todayInTz), to: endOfDay(todayInTz) }
      break
    case 'thisWeek':
      presetDates = {
        from: startOfWeek(todayInTz, { weekStartsOn: 1 }),
        to: endOfWeek(todayInTz, { weekStartsOn: 1 }),
      }
      break
    case 'thisMonth': {
      const thisMonthFirst = getMonthBoundsInTimezone(year, month, timezone).from
      presetDates = { from: thisMonthFirst, to: endOfDay(todayInTz) }
      break
    }
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
