/**
 * Date Utilities
 * 
 * This module provides consistent date handling across the application.
 * All functions are designed to work with calendar dates (what users see)
 * rather than timezone-specific timestamps.
 */

/**
 * Extract the calendar date (YYYY-MM-DD) from an ISO string or Date object
 * For ISO strings, extracts the UTC date part (YYYY-MM-DD)
 * For Date objects, uses local date components to get the calendar date the user sees
 */
export function extractCalendarDate(date: Date | string): string {
  if (typeof date === 'string') {
    // If it's an ISO string, extract the date part (UTC date)
    return date.split('T')[0]
  }
  // For Date objects, use local date components to get the calendar date
  // This is what the user sees in their timezone
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Extract the calendar date from a timestamp string in UTC
 * This is used when we have an ISO timestamp and want to get the UTC date
 */
export function extractCalendarDateFromTimestamp(timestamp: string): string {
  return timestamp.split('T')[0]
}

/**
 * Create a Date object at midnight UTC for a given calendar date (YYYY-MM-DD)
 * This ensures consistent date boundaries regardless of server timezone
 */
export function calendarDateToUTCDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0))
}

/**
 * Create a Date object at end of day UTC for a given calendar date (YYYY-MM-DD)
 * This ensures consistent date boundaries regardless of server timezone
 */
export function calendarDateToUTCEndOfDay(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999))
}

/**
 * Convert a Date object to an ISO string that preserves the calendar date
 * This is used when sending dates to the server to ensure the calendar date is preserved
 */
export function dateToCalendarISOString(date: Date): string {
  // Extract local date components to get the calendar date
  const year = date.getFullYear()
  const month = date.getMonth()
  const day = date.getDate()
  // Create a new date at midnight UTC for this calendar date
  const utcDate = new Date(Date.UTC(year, month, day, 0, 0, 0, 0))
  return utcDate.toISOString()
}

/**
 * Format a date for storage in the database as a DATE field (YYYY-MM-DD)
 * Uses local date components to match what the user selected in the calendar
 */
export function formatDateForDatabase(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Parse date range from URL search params
 * Returns date objects and date strings for both bookings (timestamp) and additional costs (date)
 */
export function parseDateRangeFromParams(
  fromParam: string | null,
  toParam: string | null
): {
  fromDate: Date | undefined
  toDate: Date | undefined
  fromDateStr: string | undefined
  toDateStr: string | undefined
} {
  if (!fromParam || !toParam) {
    return {
      fromDate: undefined,
      toDate: undefined,
      fromDateStr: undefined,
      toDateStr: undefined,
    }
  }

  // Extract calendar dates from ISO strings
  const fromDateStr = extractCalendarDate(fromParam)
  const toDateStr = extractCalendarDate(toParam)

  // Create UTC date objects for timestamp filtering (bookings)
  const fromDate = calendarDateToUTCDate(fromDateStr)
  const toDate = calendarDateToUTCEndOfDay(toDateStr)

  return {
    fromDate,
    toDate,
    fromDateStr,
    toDateStr,
  }
}

/**
 * Convert a calendar date (YYYY-MM-DD) to UTC date range for a given timezone
 * This ensures bookings are filtered correctly based on the user's timezone
 * 
 * Uses a simple approach: creates dates for start/end of day and uses
 * the timezone offset to convert to UTC boundaries
 */
export function calendarDateToUTCRange(dateStr: string, timezone: string): { from: Date; to: Date } {
  // Parse the date string
  const [year, month, day] = dateStr.split('-').map(Number)
  
  // Create a date at noon UTC on this day (to avoid DST edge cases at midnight)
  const noonUTC = new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0))
  
  // Format this date in the target timezone to see what time it is there
  const formatter = new Intl.DateTimeFormat('en', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  
  const utcFormatter = new Intl.DateTimeFormat('en', {
    timeZone: 'UTC',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  
  const tzParts = formatter.formatToParts(noonUTC)
  const utcParts = utcFormatter.formatToParts(noonUTC)
  
  const tzHour = parseInt(tzParts.find(p => p.type === 'hour')?.value || '12')
  const utcHour = parseInt(utcParts.find(p => p.type === 'hour')?.value || '12')
  
  // Calculate offset in hours (how many hours ahead/behind UTC the timezone is)
  const offsetHours = tzHour - utcHour
  
  // Create start of day: 00:00:00 in timezone
  // If timezone is ahead of UTC (e.g., +2), then 00:00 local = 22:00 previous day UTC
  // So we subtract the offset from midnight UTC
  let startHour = -offsetHours
  let startDay = day
  if (startHour < 0) {
    startHour += 24
    startDay -= 1
    // Handle month/year rollover if needed
    if (startDay < 1) {
      const prevMonth = month - 1
      if (prevMonth < 1) {
        return calendarDateToUTCRange(`${year - 1}-12-31`, timezone) // Fallback for edge case
      }
      // Get days in previous month (simplified - assumes 31 days)
      startDay = 31
    }
  }
  const startUTC = new Date(Date.UTC(year, month - 1, startDay, startHour, 0, 0, 0))
  
  // Create end of day: 23:59:59.999 in timezone
  let endHour = 23 - offsetHours
  let endDay = day
  if (endHour >= 24) {
    endHour -= 24
    endDay += 1
  } else if (endHour < 0) {
    endHour += 24
    endDay -= 1
  }
  const endUTC = new Date(Date.UTC(year, month - 1, endDay, endHour, 59, 59, 999))
  
  return {
    from: startUTC,
    to: endUTC,
  }
}

/**
 * Create a date range filter for bookings (using start_time timestamp)
 * Returns the filter object with UTC dates for database queries
 * 
 * Now uses timezone-aware filtering to ensure bookings appear on the correct
 * calendar date in the user's timezone.
 */
export function createBookingDateFilter(
  fromParam: string | null,
  toParam: string | null,
  timezone: string = 'Europe/Warsaw'
): {
  from?: Date
  to?: Date
} {
  if (!fromParam || !toParam) {
    return {
      from: undefined,
      to: undefined,
    }
  }

  // Extract calendar dates
  const fromDateStr = extractCalendarDate(fromParam)
  const toDateStr = extractCalendarDate(toParam)
  
  // Convert to UTC ranges using the user's timezone
  const fromRange = calendarDateToUTCRange(fromDateStr, timezone)
  const toRange = calendarDateToUTCRange(toDateStr, timezone)
  
  return {
    from: fromRange.from,
    to: toRange.to,
  }
}

/**
 * Create a date range filter for additional costs (using date field)
 * Returns the filter object with date strings for database queries
 */
export function createAdditionalCostDateFilter(
  fromParam: string | null,
  toParam: string | null
): {
  fromDateStr?: string
  toDateStr?: string
} {
  const { fromDateStr, toDateStr } = parseDateRangeFromParams(fromParam, toParam)
  return {
    fromDateStr,
    toDateStr,
  }
}

