import { createClient } from '@/lib/supabase/server'
import { BookingCalendar } from '@/components/booking-calendar'

export default async function BookingsPage() {
  const supabase = await createClient()
  const { data: bookings } = await supabase
    .from('bookings')
    .select(`
      *,
      client:clients(*),
      earring:earrings(*),
      service:services(*),
      booking_earrings(
        id,
        earring_id,
        qty,
        price,
        earring:earrings(*)
      ),
      booking_services(
        id,
        service_id,
        price,
        service:services(*)
      ),
      booking_broken_earrings(
        id,
        earring_id,
        qty,
        cost,
        earring:earrings(*)
      )
    `)
    .order('start_time', { ascending: true })

  // Cast to any[] to handle Supabase's dynamic typing
  const bookingsAny = (bookings as any[]) || []

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Bookings</h1>
      <BookingCalendar bookings={bookingsAny} />
    </div>
  )
}

