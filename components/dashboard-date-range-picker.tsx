'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { format } from 'date-fns'
import { CalendarIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { dateToCalendarISOString, dateToCalendarISOStringEnd, parseCalendarDateFromISO } from '@/lib/date-utils'
import { resolveDatesForPreset } from '@/lib/analytics/date-presets'
import type { DateRange } from 'react-day-picker'

type Preset = 'today' | 'yesterday' | 'thisWeek' | 'lastWeek' | 'last7days' | 'last30days' | 'thisMonth' | 'lastMonth' | 'thisYear' | 'allTime' | 'custom'

const presets: { label: string; value: Preset }[] = [
  { label: 'Today', value: 'today' },
  { label: 'Yesterday', value: 'yesterday' },
  { label: 'This Week', value: 'thisWeek' },
  { label: 'Last Week', value: 'lastWeek' },
  { label: 'Last 7 Days', value: 'last7days' },
  { label: 'Last 30 Days', value: 'last30days' },
  { label: 'This Month', value: 'thisMonth' },
  { label: 'Last Month', value: 'lastMonth' },
  { label: 'This Year', value: 'thisYear' },
  { label: 'All Time', value: 'allTime' },
  { label: 'Custom', value: 'custom' },
]

const STORAGE_KEY = 'dashboard-date-range'
const COOKIE_KEY = 'dashboard-date-range'

function saveToLocalStorage(preset: Preset, dateRange: DateRange | undefined) {
  if (typeof window === 'undefined') return
  
  try {
    const data = {
      preset,
      // Use the same format as URL params for consistency
      from: dateRange?.from ? dateToCalendarISOString(dateRange.from) : null,
      to: dateRange?.to ? dateToCalendarISOStringEnd(dateRange.to) : null,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    
    // Also save to cookie so server can read it
    const cookieValue = JSON.stringify(data)
    document.cookie = `${COOKIE_KEY}=${encodeURIComponent(cookieValue)}; path=/; max-age=${365 * 24 * 60 * 60}; SameSite=Lax`
  } catch (error) {
    console.error('Failed to save date range to localStorage/cookie:', error)
  }
}

function loadFromLocalStorage(): { preset: Preset; from: string | null; to: string | null } | null {
  if (typeof window === 'undefined') return null
  
  try {
    // Try localStorage first
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const data = JSON.parse(stored)
      return {
        preset: data.preset || 'allTime',
        from: data.from || null,
        to: data.to || null,
      }
    }
    
    // Fallback to cookie
    const cookies = document.cookie.split(';')
    const cookie = cookies.find(c => c.trim().startsWith(`${COOKIE_KEY}=`))
    if (cookie) {
      const value = decodeURIComponent(cookie.split('=')[1])
      const data = JSON.parse(value)
      return {
        preset: data.preset || 'allTime',
        from: data.from || null,
        to: data.to || null,
      }
    }
    
    return null
  } catch (error) {
    console.error('Failed to load date range from localStorage/cookie:', error)
    return null
  }
}

function getPresetDates(preset: Preset, timezone: string): { from: Date; to: Date } | null {
  if (preset === 'allTime' || preset === 'custom') {
    return null
  }

  const resolved = resolveDatesForPreset(preset, timezone)
  if (!resolved) {
    return null
  }

  return {
    from: parseCalendarDateFromISO(resolved.from),
    to: parseCalendarDateFromISO(resolved.to),
  }
}

function detectPresetFromRange(range: DateRange | undefined, timezone: string): Preset {
  if (!range?.from || !range?.to) {
    return 'allTime'
  }
  
  // Check each preset to see if the range matches
  const presetsToCheck: Preset[] = ['today', 'yesterday', 'thisWeek', 'lastWeek', 'last7days', 'last30days', 'thisMonth', 'lastMonth', 'thisYear']
  
  for (const preset of presetsToCheck) {
    const presetDates = getPresetDates(preset, timezone)
    if (presetDates) {
      // Compare dates by their ISO string (using start for "from" and end for "to")
      const rangeFromStr = dateToCalendarISOString(range.from)
      const rangeToStr = dateToCalendarISOStringEnd(range.to)
      const presetFromStr = dateToCalendarISOString(presetDates.from)
      const presetToStr = dateToCalendarISOStringEnd(presetDates.to)
      
      if (rangeFromStr === presetFromStr && rangeToStr === presetToStr) {
        return preset
      }
    }
  }
  
  // If no preset matches, it's a custom range
  return 'custom'
}

interface DashboardDateRangePickerProps {
  timezone?: string
}

export function DashboardDateRangePicker({ timezone = 'Europe/Warsaw' }: DashboardDateRangePickerProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [date, setDate] = useState<DateRange | undefined>({ from: undefined, to: undefined })
  const [preset, setPreset] = useState<Preset>('allTime')
  const [open, setOpen] = useState(false)
  const [isCompact, setIsCompact] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 1279px)')
    const update = () => setIsCompact(mediaQuery.matches)
    update()
    mediaQuery.addEventListener('change', update)
    return () => mediaQuery.removeEventListener('change', update)
  }, [])

  // Initialize from URL params or localStorage
  useEffect(() => {
    const fromParam = searchParams.get('from')
    const toParam = searchParams.get('to')
    const presetParam = searchParams.get('preset') as Preset | null

    // If URL has params, use them (highest priority)
    if (presetParam && presets.some(p => p.value === presetParam)) {
      setPreset(presetParam)
      const presetDates = getPresetDates(presetParam, timezone)
      if (presetDates) {
        setDate({ from: presetDates.from, to: presetDates.to })
      } else {
        setDate({ from: undefined, to: undefined })
      }
    } else if (fromParam && toParam) {
      // Parse dates preserving the calendar date (avoid timezone shift)
      const from = parseCalendarDateFromISO(fromParam)
      const to = parseCalendarDateFromISO(toParam)
      const dateRange = { from, to }
      setDate(dateRange)
      const detectedPreset = detectPresetFromRange(dateRange, timezone)
      setPreset(detectedPreset)
    } else {
      // No URL params, try loading from localStorage/cookie
      // Server already reads from cookie, so this is just for client-side display
      const stored = loadFromLocalStorage()
      if (stored) {
        if (stored.preset && presets.some(p => p.value === stored.preset)) {
          setPreset(stored.preset)
          // For 'custom' preset, use stored dates instead of generating preset dates
          if (stored.preset === 'custom' && stored.from && stored.to) {
            const from = parseCalendarDateFromISO(stored.from)
            const to = parseCalendarDateFromISO(stored.to)
            setDate({ from, to })
          } else {
            const presetDates = getPresetDates(stored.preset, timezone)
            if (presetDates) {
              setDate({ from: presetDates.from, to: presetDates.to })
            } else {
              setDate({ from: undefined, to: undefined })
            }
          }
        } else if (stored.from && stored.to) {
          const from = parseCalendarDateFromISO(stored.from)
          const to = parseCalendarDateFromISO(stored.to)
          const dateRange = { from, to }
          setDate(dateRange)
          const detectedPreset = detectPresetFromRange(dateRange, timezone)
          setPreset(detectedPreset)
        }
      }
    }
  }, [searchParams, timezone])

  const handlePresetChange = (newPreset: Preset) => {
    setPreset(newPreset)
    const presetDates = getPresetDates(newPreset, timezone)
    
    const params = new URLSearchParams(searchParams.toString())
    params.set('preset', newPreset)
    
    if (presetDates) {
      params.set('from', dateToCalendarISOString(presetDates.from))
      params.set('to', dateToCalendarISOStringEnd(presetDates.to))
      setDate({ from: presetDates.from, to: presetDates.to })
      saveToLocalStorage(newPreset, { from: presetDates.from, to: presetDates.to })
    } else {
      params.delete('from')
      params.delete('to')
      setDate({ from: undefined, to: undefined })
      saveToLocalStorage(newPreset, undefined)
    }
    
    router.push(`?${params.toString()}`)
  }

  const handleDateSelect = (range: DateRange | undefined) => {
    setDate(range)
    
    const detectedPreset = detectPresetFromRange(range, timezone)
    setPreset(detectedPreset)
    
    const params = new URLSearchParams(searchParams.toString())
    
    if (range?.from && range?.to) {
      params.set('from', dateToCalendarISOString(range.from))
      params.set('to', dateToCalendarISOStringEnd(range.to))
      // Only set preset param if it's not custom (custom ranges don't need preset param)
      if (detectedPreset !== 'custom') {
        params.set('preset', detectedPreset)
      } else {
        params.delete('preset')
      }
      saveToLocalStorage(detectedPreset, range)
    } else if (range?.from) {
      params.set('from', dateToCalendarISOString(range.from))
      params.delete('to')
      params.delete('preset')
      saveToLocalStorage('custom', range)
    } else {
      params.delete('from')
      params.delete('to')
      params.delete('preset')
      saveToLocalStorage('allTime', undefined)
    }
    
    router.push(`?${params.toString()}`)
  }

  const dateLabel = date?.from
    ? date.to
      ? `${format(date.from, 'MMM d, yyyy')} – ${format(date.to, 'MMM d, yyyy')}`
      : format(date.from, 'MMM d, yyyy')
    : 'Pick a date range'

  return (
    <div className="flex w-full min-w-0 flex-col gap-2 xl:w-auto xl:flex-row xl:items-center">
      <Select value={preset} onValueChange={handlePresetChange}>
        <SelectTrigger className="w-full xl:w-[180px] xl:shrink-0">
          <SelectValue placeholder="Select preset" />
        </SelectTrigger>
        <SelectContent>
          {presets.map((p) => (
            <SelectItem key={p.value} value={p.value}>
              {p.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant="outline"
            className={cn(
              'w-full min-w-0 justify-start text-left font-normal xl:w-[min(280px,100%)] xl:shrink',
              !date && 'text-muted-foreground'
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
            <span className="truncate">{dateLabel}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-auto max-w-[calc(100vw-2rem)] p-0"
          align={isCompact ? 'center' : 'start'}
          collisionPadding={16}
        >
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={date?.from || new Date()}
            selected={date}
            onSelect={handleDateSelect}
            numberOfMonths={isCompact ? 1 : 2}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}

