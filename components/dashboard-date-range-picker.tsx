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
import {
  startOfDay,
  endOfDay,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  subDays,
  subMonths,
} from 'date-fns'
import type { DateRange } from 'react-day-picker'

type Preset = 'today' | 'last7days' | 'last30days' | 'thisMonth' | 'lastMonth' | 'thisYear' | 'allTime'

const presets: { label: string; value: Preset }[] = [
  { label: 'Today', value: 'today' },
  { label: 'Last 7 Days', value: 'last7days' },
  { label: 'Last 30 Days', value: 'last30days' },
  { label: 'This Month', value: 'thisMonth' },
  { label: 'Last Month', value: 'lastMonth' },
  { label: 'This Year', value: 'thisYear' },
  { label: 'All Time', value: 'allTime' },
]

function getPresetDates(preset: Preset): { from: Date; to: Date } | null {
  const today = new Date()
  
  switch (preset) {
    case 'today':
      return {
        from: startOfDay(today),
        to: endOfDay(today),
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
      return null
    default:
      return null
  }
}

export function DashboardDateRangePicker() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [date, setDate] = useState<DateRange | undefined>({ from: undefined, to: undefined })
  const [preset, setPreset] = useState<Preset>('allTime')
  const [open, setOpen] = useState(false)

  // Initialize from URL params
  useEffect(() => {
    const fromParam = searchParams.get('from')
    const toParam = searchParams.get('to')
    const presetParam = searchParams.get('preset') as Preset | null

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
      setDate({ from, to })
      setPreset('allTime') // Custom range
    }
  }, [searchParams])

  const handlePresetChange = (newPreset: Preset) => {
    setPreset(newPreset)
    const presetDates = getPresetDates(newPreset)
    
    const params = new URLSearchParams(searchParams.toString())
    params.set('preset', newPreset)
    
    if (presetDates) {
      params.set('from', presetDates.from.toISOString())
      params.set('to', presetDates.to.toISOString())
      setDate({ from: presetDates.from, to: presetDates.to })
    } else {
      params.delete('from')
      params.delete('to')
      setDate({ from: undefined, to: undefined })
    }
    
    router.push(`?${params.toString()}`)
  }

  const handleDateSelect = (range: DateRange | undefined) => {
    setDate(range)
    
    const params = new URLSearchParams(searchParams.toString())
    params.delete('preset') // Remove preset when custom range is selected
    
    if (range?.from && range?.to) {
      params.set('from', range.from.toISOString())
      params.set('to', range.to.toISOString())
      setPreset('allTime') // Mark as custom
    } else if (range?.from) {
      params.set('from', range.from.toISOString())
      params.delete('to')
    } else {
      params.delete('from')
      params.delete('to')
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

