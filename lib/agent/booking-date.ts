import { calendarDateToUTCRange, getTodayInTimezone } from '@/lib/date-utils'

/**
 * Parse booking_date from AI (YYYY-MM-DD or DD.MM / DD.MM.YYYY).
 * Always prefers European DD.MM; corrects years far from the current year.
 */
export function resolveBookingDateString(
  raw: string | undefined,
  timezone: string
): string | undefined {
  if (!raw?.trim()) return undefined

  const today = getTodayInTimezone(timezone)
  const refYear = Number(today.split('-')[0])
  const trimmed = raw.trim()

  const dm = trimmed.match(/^(\d{1,2})\.(\d{1,2})(?:\.(\d{2,4}))?$/)
  if (dm) {
    const day = Number(dm[1])
    const month = Number(dm[2])
    let year = dm[3] ? Number(dm[3]) : refYear
    if (year < 100) year += 2000
    if (Math.abs(year - refYear) > 1) year = refYear
    if (month < 1 || month > 12 || day < 1 || day > 31) return undefined
    return formatYmd(year, month, day)
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const [y, m, d] = trimmed.split('-').map(Number)
    let year = y
    if (Math.abs(year - refYear) > 1) year = refYear
    return formatYmd(year, m, d)
  }

  return undefined
}

function formatYmd(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

/** Calendar day at ~noon in the user's timezone (for start_time on the bookings calendar) */
export function bookingStartTimeForDate(
  bookingDate: string | undefined,
  timezone: string,
  fallback: Date = new Date()
): Date {
  if (!bookingDate) return fallback

  const resolved = resolveBookingDateString(bookingDate, timezone) ?? bookingDate
  if (!/^\d{4}-\d{2}-\d{2}$/.test(resolved)) return fallback

  const { from } = calendarDateToUTCRange(resolved, timezone)
  return new Date(from.getTime() + 12 * 60 * 60 * 1000)
}
