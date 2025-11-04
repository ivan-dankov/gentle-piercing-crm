import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { BookingForm } from '@/components/booking-form'
import { DeleteBookingButton } from '@/components/delete-booking-button'
import { Edit, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default async function BookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: booking } = await supabase
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
    .eq('id', id)
    .single()

  if (!booking) {
    notFound()
  }

  // Type assertion for the relations (Supabase may return arrays)
  const client = Array.isArray(booking.client) ? booking.client[0] : booking.client
  const service = Array.isArray(booking.service) ? booking.service[0] : booking.service
  const earring = Array.isArray(booking.earring) ? booking.earring[0] : booking.earring

  return (
    <div>
      <Link href="/bookings">
        <Button variant="ghost" className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Calendar
        </Button>
      </Link>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Booking Details</h1>
          <p className="text-muted-foreground mt-1">
            {client?.name || 'No Client'} • {new Date(booking.start_time).toLocaleDateString()}
          </p>
        </div>
        <div className="flex gap-2">
          <BookingForm booking={booking}>
            <Button>
              <Edit className="h-4 w-4 mr-2" />
              Edit Booking
            </Button>
          </BookingForm>
          <DeleteBookingButton bookingId={booking.id} />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Booking Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Client</p>
              <p className="font-medium">
                {client ? (
                  <Link href={`/clients/${client.id}`} className="hover:underline">
                    {client.name}
                  </Link>
                ) : (
                  'No Client'
                )}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Service</p>
              <p className="font-medium">{service?.name || 'No Service'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Earring</p>
              <p className="font-medium">{earring?.name || 'No Earring'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Earring Quantity</p>
              <p className="font-medium">{booking.earring_qty}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Start Time</p>
              <p className="font-medium">
                {new Date(booking.start_time).toLocaleString()}
              </p>
            </div>
            {booking.end_time && (
              <div>
                <p className="text-sm text-muted-foreground">End Time</p>
                <p className="font-medium">
                  {new Date(booking.end_time).toLocaleString()}
                </p>
              </div>
            )}
            {booking.location && (
              <div>
                <p className="text-sm text-muted-foreground">Location</p>
                <p className="font-medium">{booking.location}</p>
              </div>
            )}
            {booking.notes && (
              <div>
                <p className="text-sm text-muted-foreground">Notes</p>
                <p className="font-medium whitespace-pre-wrap">{booking.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Financial Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Service Price</p>
              <p className="font-medium">${booking.service_price.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Earring Cost</p>
              <p className="font-medium">${(booking.earring_cost || 0).toFixed(2)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Earring Revenue</p>
              <p className="font-medium">${(booking.earring_revenue || 0).toFixed(2)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Travel Fee</p>
              <p className="font-medium">${booking.travel_fee.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Booksy Fee</p>
              <p className="font-medium">${booking.booksy_fee.toFixed(2)}</p>
            </div>
            {booking.custom_discount > 0 && (
              <div>
                <p className="text-sm text-muted-foreground">Custom Discount</p>
                <p className="font-medium">${booking.custom_discount.toFixed(2)}</p>
              </div>
            )}
            {booking.broken_earring_loss > 0 && (
              <div>
                <p className="text-sm text-muted-foreground">Broken Earring Loss</p>
                <p className="font-medium">${booking.broken_earring_loss.toFixed(2)}</p>
              </div>
            )}
            {booking.tax_enabled && (
              <>
                <div>
                  <p className="text-sm text-muted-foreground">Tax Rate</p>
                  <p className="font-medium">{booking.tax_rate}%</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tax Amount</p>
                  <p className="font-medium">${booking.tax_amount.toFixed(2)}</p>
                </div>
              </>
            )}
            <div className="border-t pt-4">
              <p className="text-sm text-muted-foreground">Total Paid</p>
              <p className="text-2xl font-bold">${booking.total_paid.toFixed(2)}</p>
            </div>
            <div className="border-t pt-4">
              <p className="text-sm text-muted-foreground">Profit</p>
              <p className="text-2xl font-bold text-green-600">
                ${(booking.profit || 0).toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Payment Method</p>
              <p className="font-medium capitalize">{booking.payment_method || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Is Model</p>
              <p className="font-medium">{booking.is_model ? 'Yes' : 'No'}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

