import { createAdminClient } from '@/lib/supabase/admin'

const TAX_RATE = 8.5
const BOOKSY_FEE_RATE = 0.4305

export interface CreateBookingServiceItem {
  service_id: string
  price: number
}

export interface CreateBookingProductItem {
  product_id: string
  qty: number
  price: number
}

export interface CreateBookingInput {
  userId: string
  clientId?: string | null
  services: CreateBookingServiceItem[]
  products: CreateBookingProductItem[]
  totalPaid: number
  paymentMethod?: 'cash' | 'blik' | 'card'
  booksyFeeEnabled?: boolean
  taxEnabled?: boolean
  isModel?: boolean
  notes?: string | null
  startTime: Date
  endTime?: Date | null
  productCosts: Map<string, number | null>
}

export async function createBooking(
  input: CreateBookingInput
): Promise<string> {
  const supabase = createAdminClient()

  const totalServicePrice = input.services.reduce((s, i) => s + i.price, 0)
  let earringCost = 0
  let earringRevenue = 0

  for (const item of input.products) {
    const unitCost = input.productCosts.get(item.product_id) ?? 0
    earringCost += (unitCost || 0) * item.qty
    earringRevenue += item.price * item.qty
  }

  const booksyFeeBase =
    input.booksyFeeEnabled && input.services.length > 0
      ? input.services[0].price
      : 0
  const booksyFee = input.booksyFeeEnabled
    ? booksyFeeBase * BOOKSY_FEE_RATE
    : 0

  const taxAmount =
    input.taxEnabled && input.totalPaid > 0
      ? (input.totalPaid * TAX_RATE) / 100
      : 0

  const totalCosts = earringCost + booksyFee + taxAmount
  const profit = input.totalPaid - totalCosts

  const bookingData = {
    client_id: input.clientId ?? null,
    earring_id: null,
    earring_qty: 0,
    service_id: null,
    service_price: totalServicePrice,
    is_model: input.isModel ?? false,
    earring_cost: earringCost,
    earring_revenue: earringRevenue,
    travel_fee: 0,
    location: null,
    booksy_fee: booksyFee,
    broken_earring_loss: 0,
    total_paid: input.totalPaid,
    payment_method: input.paymentMethod ?? 'cash',
    tax_enabled: input.taxEnabled ?? false,
    tax_rate: TAX_RATE,
    tax_amount: taxAmount,
    notes: input.notes ?? null,
    start_time: input.startTime.toISOString(),
    end_time: input.endTime?.toISOString() ?? null,
    profit,
    user_id: input.userId,
  }

  const { data: newBooking, error } = await supabase
    .from('bookings')
    // @ts-expect-error — generated types omit some booking columns
    .insert([bookingData])
    .select('id')
    .single()

  if (error) throw error

  const bookingId = (newBooking as { id: string }).id

  if (input.products.length > 0) {
    const productRows = input.products.map((item) => ({
      booking_id: bookingId,
      product_id: item.product_id,
      qty: item.qty,
      price: item.price,
      user_id: input.userId,
    }))
    const { error: productError } = await supabase
      .from('booking_products')
      .insert(productRows as never)
    if (productError) throw productError
  }

  if (input.services.length > 0) {
    const serviceRows = input.services.map((item) => ({
      booking_id: bookingId,
      service_id: item.service_id,
      price: item.price,
      user_id: input.userId,
    }))
    const { error: serviceError } = await supabase
      .from('booking_services')
      .insert(serviceRows as never)
    if (serviceError) throw serviceError
  }

  return bookingId
}
