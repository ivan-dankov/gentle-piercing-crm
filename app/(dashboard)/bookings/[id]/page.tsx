import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { BookingForm } from '@/components/booking-form'
import { DeleteBookingButton } from '@/components/delete-booking-button'
import { Edit, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

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
    .eq('id', id)
    .single()

  if (!booking) {
    notFound()
  }

  // Type assertion for the relations (Supabase may return arrays)
  // Cast to any to handle Supabase's dynamic typing
  const bookingAny = booking as any
  const client = Array.isArray(bookingAny.client) ? bookingAny.client[0] : bookingAny.client
  const service = Array.isArray(bookingAny.service) ? bookingAny.service[0] : bookingAny.service
  const earring = Array.isArray(bookingAny.earring) ? bookingAny.earring[0] : bookingAny.earring
  
  // Use bookingAny for all booking property access
  const bookingData = bookingAny

  return (
    <div>
      <Link href="/bookings">
        <Button variant="ghost" className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Calendar
        </Button>
      </Link>
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Booking Details</h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            {client?.name || 'No Client'} • {new Date(bookingData.start_time).toLocaleDateString()}
          </p>
        </div>
        <div className="flex gap-2">
          <BookingForm booking={bookingData}>
            <Button>
              <Edit className="h-4 w-4 mr-2" />
              Edit Booking
            </Button>
          </BookingForm>
          <DeleteBookingButton bookingId={bookingData.id} />
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
              <p className="font-medium">{bookingData.earring_qty}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Start Time</p>
              <p className="font-medium">
                {new Date(bookingData.start_time).toLocaleString()}
              </p>
            </div>
            {bookingData.end_time && (
              <div>
                <p className="text-sm text-muted-foreground">End Time</p>
                <p className="font-medium">
                  {new Date(bookingData.end_time).toLocaleString()}
                </p>
              </div>
            )}
            {bookingData.location && (
              <div>
                <p className="text-sm text-muted-foreground">Location</p>
                <p className="font-medium">{bookingData.location}</p>
              </div>
            )}
            {bookingData.notes && (
              <div>
                <p className="text-sm text-muted-foreground">Notes</p>
                <p className="font-medium whitespace-pre-wrap">{bookingData.notes}</p>
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
              <p className="font-medium">${bookingData.service_price.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Earring Cost</p>
              <p className="font-medium">${(bookingData.earring_cost || 0).toFixed(2)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Earring Revenue</p>
              <p className="font-medium">${(bookingData.earring_revenue || 0).toFixed(2)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Travel Fee</p>
              <p className="font-medium">${bookingData.travel_fee.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Booksy Fee</p>
              <p className="font-medium">${bookingData.booksy_fee.toFixed(2)}</p>
            </div>
            {bookingData.custom_discount > 0 && (
              <div>
                <p className="text-sm text-muted-foreground">Custom Discount</p>
                <p className="font-medium">${bookingData.custom_discount.toFixed(2)}</p>
              </div>
            )}
            {bookingData.broken_earring_loss > 0 && (
              <div>
                <p className="text-sm text-muted-foreground">Broken Earring Loss</p>
                <p className="font-medium">${bookingData.broken_earring_loss.toFixed(2)}</p>
              </div>
            )}
            {bookingData.tax_enabled && (
              <>
                <div>
                  <p className="text-sm text-muted-foreground">Tax Rate</p>
                  <p className="font-medium">{bookingData.tax_rate}%</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tax Amount</p>
                  <p className="font-medium">${bookingData.tax_amount.toFixed(2)}</p>
                </div>
              </>
            )}
            <div className="border-t pt-4">
              <p className="text-sm text-muted-foreground">Total Paid</p>
              <p className="text-2xl font-bold">${bookingData.total_paid.toFixed(2)}</p>
            </div>
            <div className="border-t pt-4">
              <p className="text-sm text-muted-foreground">Profit</p>
              <p className="text-2xl font-bold text-green-600">
                ${(bookingData.profit || 0).toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Payment Method</p>
              <p className="font-medium capitalize">{bookingData.payment_method || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Is Model</p>
              <p className="font-medium">{bookingData.is_model ? 'Yes' : 'No'}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

