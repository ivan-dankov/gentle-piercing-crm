'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Calendar, momentLocalizer, View, Event, ToolbarProps } from 'react-big-calendar'
import moment from 'moment'
import { BookingForm } from './booking-form'
import { BookingDetailsDrawer } from './booking-details-popover'
import { Button } from './ui/button'
import { Plus, ChevronLeft, ChevronRight, User, Brush, MapPin } from 'lucide-react'
import type { BookingWithRelations } from '@/lib/types'

const localizer = momentLocalizer(moment)

// Custom toolbar component
function CustomToolbar({ label, onNavigate, onView, view }: ToolbarProps) {
  return (
    <div className="mb-4 space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onNavigate('PREV')}
            className="shrink-0"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="text-base sm:text-lg font-semibold truncate">{label}</div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onNavigate('NEXT')}
            className="shrink-0"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onNavigate('TODAY')}
            className="shrink-0"
          >
            Today
          </Button>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <Button
          variant={view === 'month' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onView('month')}
          className="flex-1 sm:flex-none"
        >
          Month
        </Button>
        <Button
          variant={view === 'week' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onView('week')}
          className="flex-1 sm:flex-none"
        >
          Week
        </Button>
        <Button
          variant={view === 'day' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onView('day')}
          className="flex-1 sm:flex-none"
        >
          Day
        </Button>
        <Button
          variant={view === 'agenda' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onView('agenda')}
          className="flex-1 sm:flex-none"
        >
          Agenda
        </Button>
      </div>
    </div>
  )
}

interface BookingCalendarProps {
  bookings: BookingWithRelations[]
}

export function BookingCalendar({ bookings }: BookingCalendarProps) {
  const router = useRouter()
  const [view, setView] = useState<View>('month')
  const [date, setDate] = useState(new Date())
  const [selectedSlot, setSelectedSlot] = useState<Date | null>(null)
  const [selectedBooking, setSelectedBooking] = useState<BookingWithRelations | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  // Update selectedBooking when bookings change (after refresh)
  useEffect(() => {
    if (selectedBooking) {
      const updatedBooking = bookings.find(b => b.id === selectedBooking.id)
      if (updatedBooking) {
        setSelectedBooking(updatedBooking)
      }
    }
  }, [bookings, selectedBooking])

  const events: Event[] = (bookings || []).map((booking) => {
    const startTime = new Date(booking.start_time)
    
    const parts: string[] = []
    
    // Client name
    if (booking.client?.name) {
      parts.push(booking.client.name)
    }
    
    // Service names - check both service and booking_services
    const serviceNames: string[] = []
    if (booking.service?.name) {
      serviceNames.push(booking.service.name)
    }
    if (booking.booking_services && Array.isArray(booking.booking_services)) {
      booking.booking_services.forEach((bs: any) => {
        if (bs.service?.name && !serviceNames.includes(bs.service.name)) {
          serviceNames.push(bs.service.name)
        }
      })
    }
    if (serviceNames.length > 0) {
      parts.push(serviceNames.join(', '))
    }
    
    // Add payment info if available
    if (booking.payment_method) {
      parts.push(booking.payment_method.toUpperCase())
    }
    if (booking.total_paid) {
      parts.push(`${booking.total_paid.toFixed(2)} PLN`)
    }
    
    const title = parts.length > 0 ? parts.join(' • ') : 'Booking'
    
    return {
      id: booking.id,
      title,
      start: startTime,
      end: booking.end_time ? new Date(booking.end_time) : startTime,
      resource: booking,
    }
  })

  const eventStyleGetter = (event: Event) => {
    const booking = event.resource as BookingWithRelations
    let backgroundColor = '#3174ad' // Default blue for regular bookings
    let borderColor = 'white'
    
    if (booking) {
      if (booking.is_model) {
        // Model bookings - purple
        backgroundColor = '#9b59b6'
      } else if (booking.travel_fee && booking.travel_fee > 0) {
        // Travel bookings - orange
        backgroundColor = '#e67e22'
      }
      // Regular bookings keep the default blue
    }
    
    return {
      style: {
        backgroundColor,
        border: `1px solid ${borderColor}`,
        borderRadius: '4px',
        color: 'white',
      },
    }
  }

  const handleSelectSlot = ({ start }: { start: Date }) => {
    setSelectedSlot(start)
  }

  const handleSelectEvent = (event: Event) => {
    const booking = event.resource as BookingWithRelations
    if (booking) {
      setSelectedBooking(booking)
      setDrawerOpen(true)
    }
  }

  // Custom event component with icon
  const CustomEvent = ({ event }: { event: Event }) => {
    const booking = event.resource as BookingWithRelations
    let Icon = User // Default icon for regular bookings
    
    if (booking) {
      if (booking.is_model) {
        Icon = Brush // Model bookings
      } else if (booking.travel_fee && booking.travel_fee > 0) {
        Icon = MapPin // Travel bookings
      }
    }
    
    return (
      <div className="flex items-center gap-1 h-full">
        <Icon className="h-3 w-3 flex-shrink-0" />
        <span className="truncate">{event.title}</span>
      </div>
    )
  }


  return (
    <>
      <div className="h-[calc(100dvh-12rem)] sm:h-[calc(100dvh-10rem)]">
        <div className="mb-4 flex items-center justify-end">
          <BookingForm defaultStartTime={selectedSlot || undefined}>
            <Button size="sm" className="text-xs sm:text-sm">
              <Plus className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">New Booking</span>
              <span className="sm:hidden">New</span>
            </Button>
          </BookingForm>
        </div>
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          view={view}
          onView={setView}
          date={date}
          onNavigate={setDate}
          onSelectSlot={handleSelectSlot}
          onSelectEvent={handleSelectEvent}
          selectable
          style={{ height: '100%' }}
          components={{
            toolbar: CustomToolbar,
            event: CustomEvent,
          }}
          formats={{
            eventTimeRangeFormat: () => '',
            eventTimeRangeStartFormat: () => '',
            eventTimeRangeEndFormat: () => '',
          }}
          eventPropGetter={eventStyleGetter}
          min={view !== 'month' ? new Date(2000, 0, 1, 8, 0) : undefined}
          scrollToTime={view !== 'month' ? new Date(2000, 0, 1, 8, 0) : undefined}
        />
      </div>
      {selectedBooking && (
        <BookingDetailsDrawer
          booking={selectedBooking}
          open={drawerOpen}
          onOpenChange={(open) => {
            setDrawerOpen(open)
            if (!open) {
              setSelectedBooking(null)
            }
          }}
          onBookingUpdate={(updatedBooking) => {
            setSelectedBooking(updatedBooking)
            router.refresh()
          }}
        />
      )}
    </>
  )
}

