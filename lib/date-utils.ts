/**
 * Date Utilities
 * 
 * This module provides consistent date handling across the application.
 * All functions are designed to work with calendar dates (what users see)
 * rather than timezone-specific timestamps.
 * 
 * HOLISTIC DATE HANDLING APPROACH:
 * ================================
 * 
 * There are TWO types of dates in this application:
 * 
 * 1. CALENDAR DATES (DATE fields in DB, e.g., additional_costs.date)
 *    - Format: "YYYY-MM-DD" (no time component)
 *    - Represent a specific day regardless of timezone
 *    - SAVING: Use formatDateForDatabase(date) → "YYYY-MM-DD"
 *    - PARSING: Use parseDateString(dateStr) → Date at noon local time
 *    - DISPLAY: Use toLocaleDateString() on the parsed Date
 * 
 * 2. TIMESTAMPS (TIMESTAMP fields in DB, e.g., bookings.start_time)
 *    - Format: "YYYY-MM-DDTHH:mm:ss.sssZ" (ISO 8601 UTC)
 *    - Represent a specific moment in time
 *    - SAVING: Use date.toISOString() → UTC timestamp
 *    - PARSING: Use new Date(isoString) → local Date
 *    - DISPLAY: Use toLocaleString() or date-fns format()
 * 
 * 3. DATE RANGE FILTERING (dashboard date picker)
 *    - URLs/Storage: Use dateToCalendarISOString (from) and dateToCalendarISOStringEnd (to)
 *    - Reading back: Use parseCalendarDateFromISO → Date at noon local time
 *    - DB Queries: Use createBookingDateFilter with user's timezone
 * 
 * KEY RULE: Always use noon (12:00) for calendar dates to avoid timezone shifts
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
 * Converts to start of day (midnight UTC)
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
 * Convert a Date object to an ISO string at end of day UTC for the calendar date
 * This is used for "to" dates in date ranges to ensure the full day is included
 * Converts to end of day (23:59:59.999 UTC)
 */
export function dateToCalendarISOStringEnd(date: Date): string {
  // Extract local date components to get the calendar date
  const year = date.getFullYear()
  const month = date.getMonth()
  const day = date.getDate()
  // Create a new date at end of day UTC for this calendar date
  const utcDate = new Date(Date.UTC(year, month, day, 23, 59, 59, 999))
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
 * Parse a calendar date from an ISO string and return a local Date at noon
 * This avoids timezone issues when displaying dates in the UI
 * The noon time ensures the date won't shift due to timezone conversions
 */
export function parseCalendarDateFromISO(isoString: string): Date {
  const dateStr = isoString.split('T')[0]
  const [year, month, day] = dateStr.split('-').map(Number)
  // Use noon local time to avoid timezone boundary issues
  return new Date(year, month - 1, day, 12, 0, 0, 0)
}

/**
 * Parse a date string (YYYY-MM-DD) from database DATE field and return a local Date at noon
 * This is the standard way to parse DATE fields for display purposes
 * The noon time ensures the date won't shift due to timezone conversions
 * 
 * IMPORTANT: Always use this instead of new Date(dateString) for DATE fields!
 * new Date("2025-11-26") parses as UTC midnight, which can shift dates in some timezones
 */
export function parseDateString(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number)
  // Use noon local time to avoid timezone boundary issues
  return new Date(year, month - 1, day, 12, 0, 0, 0)
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
 * Uses a simpler approach: calculates timezone offset and adjusts UTC times accordingly
 */
export function calendarDateToUTCRange(dateStr: string, timezone: string): { from: Date; to: Date } {
  // Parse the date string
  const [year, month, day] = dateStr.split('-').map(Number)
  
  // Get the timezone offset in minutes for this date
  // We create a date at noon to avoid DST edge cases
  const testDate = new Date(Date.UTC(year, month - 1, day, 12, 0, 0))
  
  // Get the offset by comparing UTC time with local time in the timezone
  const utcString = testDate.toLocaleString('en-US', { timeZone: 'UTC' })
  const tzString = testDate.toLocaleString('en-US', { timeZone: timezone })
  const utcDate = new Date(utcString)
  const tzDate = new Date(tzString)
  
  // Offset in milliseconds (positive means timezone is ahead of UTC)
  const offsetMs = tzDate.getTime() - utcDate.getTime()
  
  // Start of day in the target timezone = midnight local time
  // To get this in UTC, we create midnight UTC and subtract the offset
  const startLocal = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0))
  const startUTC = new Date(startLocal.getTime() - offsetMs)
  
  // End of day in the target timezone = 23:59:59.999 local time
  const endLocal = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999))
  const endUTC = new Date(endLocal.getTime() - offsetMs)
  
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

/**
 * Get the calendar date (YYYY-MM-DD) for today in a specific timezone
 */
export function getTodayInTimezone(timezone: string): string {
  const now = new Date()
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  return formatter.format(now)
}

/**
 * Create a Date object representing a calendar date in a specific timezone
 * Uses noon UTC to avoid DST edge cases
 */
export function calendarDateInTimezone(year: number, month: number, day: number, timezone: string): Date {
  // Create a date at noon UTC for this calendar date
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0))
}

/**
 * Get start and end of month as Date objects for a given calendar date in a timezone
 * This ensures month boundaries are calculated correctly regardless of server timezone
 */
export function getMonthBoundsInTimezone(year: number, month: number, timezone: string): { from: Date; to: Date } {
  // Calculate days in month (using UTC to avoid timezone issues)
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate()
  
  // Get the first day of the month - use calendarDateToUTCRange to get proper timezone boundaries
  const firstDayStr = `${year}-${String(month).padStart(2, '0')}-01`
  const fromRange = calendarDateToUTCRange(firstDayStr, timezone)
  
  // Get the last day of the month
  const lastDayStr = `${year}-${String(month).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`
  const toRange = calendarDateToUTCRange(lastDayStr, timezone)
  
  return { from: fromRange.from, to: toRange.to }
}

