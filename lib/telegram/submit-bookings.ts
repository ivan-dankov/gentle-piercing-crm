import type { ResolvedBookingDraft } from '@/lib/agent/schemas'
import { createBooking } from '@/lib/bookings/create-booking'
import type { CatalogService } from '@/lib/agent/product-matcher'

export function bookingStartTime(
  bookingDate: string | undefined,
  fallback: Date = new Date()
): Date {
  if (!bookingDate) return fallback
  const [y, m, d] = bookingDate.split('-').map(Number)
  if (!y || !m || !d) return fallback
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0, 0))
}

export function bookingEndTime(
  start: Date,
  serviceIds: string[],
  catalogServices: CatalogService[]
): Date | null {
  const duration = serviceIds.reduce((sum, id) => {
    const s = catalogServices.find((c) => c.id === id)
    return sum + (s?.duration_minutes ?? 30)
  }, 0)
  if (duration <= 0) return null
  const end = new Date(start)
  end.setMinutes(end.getMinutes() + duration)
  return end
}

export async function submitResolvedBookings(
  userId: string,
  bookings: ResolvedBookingDraft[],
  catalogServices: CatalogService[],
  productCostMap: Map<string, number | null>
): Promise<string[]> {
  const ids: string[] = []

  for (const b of bookings) {
    const services = b.services
      .filter((s) => s.service_id)
      .map((s) => ({
        service_id: s.service_id!,
        price: s.price,
      }))

    const products = b.products
      .filter((p) => p.product_id)
      .map((p) => ({
        product_id: p.product_id!,
        qty: p.qty ?? 1,
        price: p.price,
      }))

    const startTime = bookingStartTime(b.booking_date)
    const endTime = bookingEndTime(
      startTime,
      services.map((s) => s.service_id),
      catalogServices
    )

    const id = await createBooking({
      userId,
      clientId: null,
      services,
      products,
      totalPaid: b.total_paid,
      paymentMethod: b.payment_method,
      booksyFeeEnabled: b.booksy_fee_enabled,
      taxEnabled: false,
      notes: b.notes ?? null,
      startTime,
      endTime,
      productCosts: productCostMap,
    })
    ids.push(id)
  }

  return ids
}
