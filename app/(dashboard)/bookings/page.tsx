import { createClient } from '@/lib/supabase/server'
import { BookingCalendar } from '@/components/booking-calendar'
import { BookingForm } from '@/components/booking-form'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function BookingsPage() {
  const supabase = await createClient()
  const { data: bookings } = await supabase
    .from('bookings')
    .select(`
      *,
      client:clients(*),
      product:products(*),
      service:services(*),
      booking_products(
        id,
        product_id,
        qty,
        price,
        product:products(*)
      ),
      booking_services(
        id,
        service_id,
        price,
        service:services(*)
      ),
      booking_broken_products(
        id,
        product_id,
        qty,
        cost,
        product:products(*)
      )
    `)
    .order('start_time', { ascending: true })

  // Cast to any[] to handle Supabase's dynamic typing
  const bookingsAny = (bookings as any[]) || []

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
        <h1 className="text-2xl sm:text-3xl font-bold">Bookings</h1>
        <BookingForm>
          <Button size="sm" className="text-xs sm:text-sm">
            <Plus className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">New Booking</span>
            <span className="sm:hidden">New</span>
          </Button>
        </BookingForm>
      </div>
      <BookingCalendar bookings={bookingsAny} />
    </div>
  )
}

