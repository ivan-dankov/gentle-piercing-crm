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
import { dateToCalendarISOString, dateToCalendarISOStringEnd } from '@/lib/date-utils'
import {
  startOfDay,
  endOfDay,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  startOfWeek,
  endOfWeek,
  subDays,
  subMonths,
  subWeeks,
} from 'date-fns'
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
      from: dateRange?.from?.toISOString() || null,
      to: dateRange?.to?.toISOString() || null,
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

function getPresetDates(preset: Preset): { from: Date; to: Date } | null {
  const today = new Date()
  
  switch (preset) {
    case 'today':
      return {
        from: startOfDay(today),
        to: endOfDay(today),
      }
    case 'yesterday':
      const yesterday = subDays(today, 1)
      return {
        from: startOfDay(yesterday),
        to: endOfDay(yesterday),
      }
    case 'thisWeek':
      return {
        from: startOfWeek(today, { weekStartsOn: 1 }), // Monday
        to: endOfWeek(today, { weekStartsOn: 1 }),
      }
    case 'lastWeek':
      const lastWeek = subWeeks(today, 1)
      return {
        from: startOfWeek(lastWeek, { weekStartsOn: 1 }), // Monday
        to: endOfWeek(lastWeek, { weekStartsOn: 1 }),
      }
    case 'last7days':
      return {
        from: startOfDay(subDays(today, 6)),
        to: endOfDay(today),
      }
    case 'last30days':
      return {
        from: startOfDay(subDays(today, 29)),
        to: endOfDay(today),
      }
    case 'thisMonth':
      return {
        from: startOfMonth(today),
        to: endOfMonth(today),
      }
    case 'lastMonth':
      const lastMonth = subMonths(today, 1)
      return {
        from: startOfMonth(lastMonth),
        to: endOfMonth(lastMonth),
      }
    case 'thisYear':
      return {
        from: startOfYear(today),
        to: endOfDay(today),
      }
    case 'allTime':
    case 'custom':
      return null
    default:
      return null
  }
}

function detectPresetFromRange(range: DateRange | undefined): Preset {
  if (!range?.from || !range?.to) {
    return 'allTime'
  }
  
  // Check each preset to see if the range matches
  const presetsToCheck: Preset[] = ['today', 'yesterday', 'thisWeek', 'lastWeek', 'last7days', 'last30days', 'thisMonth', 'lastMonth', 'thisYear']
  
  for (const preset of presetsToCheck) {
    const presetDates = getPresetDates(preset)
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

export function DashboardDateRangePicker() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [date, setDate] = useState<DateRange | undefined>({ from: undefined, to: undefined })
  const [preset, setPreset] = useState<Preset>('allTime')
  const [open, setOpen] = useState(false)

  // Initialize from URL params or localStorage
  useEffect(() => {
    const fromParam = searchParams.get('from')
    const toParam = searchParams.get('to')
    const presetParam = searchParams.get('preset') as Preset | null

    // If URL has params, use them (highest priority)
    if (presetParam && presets.some(p => p.value === presetParam)) {
      setPreset(presetParam)
      const presetDates = getPresetDates(presetParam)
      if (presetDates) {
        setDate({ from: presetDates.from, to: presetDates.to })
      } else {
        setDate({ from: undefined, to: undefined })
      }
    } else if (fromParam && toParam) {
      const from = new Date(fromParam)
      const to = new Date(toParam)
      const dateRange = { from, to }
      setDate(dateRange)
      const detectedPreset = detectPresetFromRange(dateRange)
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
            const from = new Date(stored.from)
            const to = new Date(stored.to)
            setDate({ from, to })
          } else {
            const presetDates = getPresetDates(stored.preset)
            if (presetDates) {
              setDate({ from: presetDates.from, to: presetDates.to })
            } else {
              setDate({ from: undefined, to: undefined })
            }
          }
        } else if (stored.from && stored.to) {
          const from = new Date(stored.from)
          const to = new Date(stored.to)
          const dateRange = { from, to }
          setDate(dateRange)
          const detectedPreset = detectPresetFromRange(dateRange)
          setPreset(detectedPreset)
        }
      }
    }
  }, [searchParams])

  const handlePresetChange = (newPreset: Preset) => {
    setPreset(newPreset)
    const presetDates = getPresetDates(newPreset)
    
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
    
    const detectedPreset = detectPresetFromRange(range)
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

  return (
    <div className="flex items-center gap-2">
      <Select value={preset} onValueChange={handlePresetChange}>
        <SelectTrigger className="w-[180px]">
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
              'w-[300px] justify-start text-left font-normal',
              !date && 'text-muted-foreground'
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date?.from ? (
              date.to ? (
                <>
                  {format(date.from, 'LLL dd, y')} -{' '}
                  {format(date.to, 'LLL dd, y')}
                </>
              ) : (
                format(date.from, 'LLL dd, y')
              )
            ) : (
              <span>Pick a date range</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={date?.from || new Date()}
            selected={date}
            onSelect={handleDateSelect}
            numberOfMonths={2}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}

