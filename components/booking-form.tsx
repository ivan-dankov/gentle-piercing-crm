'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { createClient } from '@/lib/supabase/client'
import type { Booking, BookingWithRelations, Client, Earring, Service } from '@/lib/types'
import { CalendarIcon, Plus, FileText, Trash2, Clock, User, Scissors, CreditCard, Check, ChevronsUpDown, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react'
import { Separator } from '@/components/ui/separator'
import { Loader } from '@/components/ui/loader'
import { cn } from '@/lib/utils'
import { GooglePlacesAutocomplete } from './google-places-autocomplete'

// Helper function to get next half hour
function getNextHalfHour(): Date {
  const now = new Date()
  const minutes = now.getMinutes()
  const nextHalf = minutes <= 30 ? 30 : 60
  const result = new Date(now)
  result.setMinutes(nextHalf === 60 ? 0 : nextHalf, 0, 0)
  if (nextHalf === 60) {
    result.setHours(result.getHours() + 1)
  }
  return result
}

interface EarringItem {
  id: string
  earring_id: string
  qty: number
  price?: number | null
}

interface BrokenEarringItem {
  id: string
  earring_id: string
  qty: number
  cost?: number | null
}

interface ServiceItem {
  id: string
  service_id: string
  price: number | null
}

const bookingSchema = z.object({
  client_id: z.string().nullable().optional(), // Can be "new", UUID, or null
  client_name: z.string().optional(),
  client_phone: z.string().optional(),
  client_source: z.enum(['booksy', 'instagram', 'referral', 'walk-in']).nullable().optional(),
  client_notes: z.string().optional(),
  earring_items: z.array(z.object({
    id: z.string().optional(),
    earring_id: z.string().uuid(),
    qty: z.number().int().min(1),
    price: z.number().min(0).nullable().optional(),
  })).min(1),
  service_items: z.array(z.object({
    id: z.string().optional(),
    service_id: z.string().uuid(),
    price: z.number().min(0).nullable().optional(),
  })).min(1),
  is_model: z.boolean(),
  earring_cost: z.number().min(0).nullable().optional(),
  earring_revenue: z.number().min(0).nullable().optional(),
  travel_enabled: z.boolean(),
  travel_fee: z.number().min(0).nullable().optional(),
  location: z.string().optional(),
  broken_earring_enabled: z.boolean(),
  broken_earring_loss: z.number().min(0).nullable().optional(),
  broken_earring_items: z.array(z.object({
    id: z.string().optional(),
    earring_id: z.string().uuid(),
    qty: z.number().int().min(1),
    cost: z.number().min(0).nullable().optional(),
  })).optional(),
  calculated_total: z.number().min(0).nullable().optional(),
  total_paid: z.number().min(0).nullable().optional(),
  payment_method: z.enum(['cash', 'blik']),
  tax_enabled: z.boolean(),
  tax_rate: z.number().min(0).max(100).nullable().optional(),
  tax_amount: z.number().min(0).nullable().optional(),
  booksy_fee_enabled: z.boolean(),
  booksy_fee: z.number().min(0).nullable().optional(),
  notes: z.string().optional(),
  start_time: z.date(),
  end_time: z.date().nullable().optional(),
})

type BookingFormValues = z.infer<typeof bookingSchema>

interface BookingFormProps {
  booking?: BookingWithRelations
  defaultStartTime?: Date
  children: React.ReactNode
}

export function BookingForm({ booking, defaultStartTime, children }: BookingFormProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [dataLoading, setDataLoading] = useState(false)
  const [clients, setClients] = useState<Client[]>([])
  const [earrings, setEarrings] = useState<Earring[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [timeClientExpanded, setTimeClientExpanded] = useState(true)
  const [serviceExpanded, setServiceExpanded] = useState(true)
  const [earringsExpanded, setEarringsExpanded] = useState(true)
  const [paymentExpanded, setPaymentExpanded] = useState(true)
  const [notesExpanded, setNotesExpanded] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    if (open) {
      loadData()
    }
  }, [open])

  const loadData = async () => {
    setDataLoading(true)
    try {
      const [clientsRes, earringsRes, servicesRes] = await Promise.all([
        supabase.from('clients').select('*').order('name'),
        supabase.from('earrings').select('*').eq('active', true).order('name'),
        supabase.from('services').select('*').eq('active', true).order('name'),
      ])
      if (clientsRes.data) setClients(clientsRes.data)
      if (earringsRes.data) {
        setEarrings(earringsRes.data)
      }
      if (servicesRes.data) {
        setServices(servicesRes.data)
      }
    } finally {
      setDataLoading(false)
    }
  }

  // Auto-select first service and earring when data loads (only for new bookings)
  useEffect(() => {
    if (!booking && services.length > 0 && earrings.length > 0 && open) {
      const currentServiceItems = form.getValues('service_items')
      const currentEarringItems = form.getValues('earring_items')
      
      // Select first service if none selected
      if (currentServiceItems.length > 0 && !currentServiceItems[0].service_id) {
        form.setValue('service_items.0.service_id', services[0].id)
        form.setValue('service_items.0.price', services[0].base_price)
      }
      
      // Select first earring if none selected
      if (currentEarringItems.length > 0 && !currentEarringItems[0].earring_id) {
        form.setValue('earring_items.0.earring_id', earrings[0].id)
        form.setValue('earring_items.0.price', earrings[0].sale_price)
      }
    }
  }, [services, earrings, booking, open])

  // Initialize earring items from junction table or legacy field
  const initialEarringItems: EarringItem[] = booking?.booking_earrings && booking.booking_earrings.length > 0
    ? booking.booking_earrings.map((be: { id: string; earring_id: string; qty: number; price?: number | null }) => ({
        id: be.id,
        earring_id: be.earring_id,
        qty: be.qty || 1,
        price: be.price ?? null,
      }))
    : booking?.earring_id
      ? [{
          id: Math.random().toString(),
          earring_id: booking.earring_id,
          qty: booking.earring_qty || 1,
          price: null,
        }]
      : [{ id: Math.random().toString(), earring_id: '', qty: 1, price: null }]

  // Initialize service items from junction table or legacy field
  const initialServiceItems: ServiceItem[] = booking?.booking_services && booking.booking_services.length > 0
    ? booking.booking_services.map((bs: { id: string; service_id: string; price: number | null }) => ({
        id: bs.id,
        service_id: bs.service_id,
        price: bs.price ?? null,
      }))
    : booking?.service_id
      ? [{
          id: Math.random().toString(),
          service_id: booking.service_id,
          price: booking.service_price ?? null,
        }]
      : [{ id: Math.random().toString(), service_id: '', price: null }]

  // Initialize broken earring items from junction table or empty array
  const initialBrokenEarringItems: BrokenEarringItem[] = booking?.booking_broken_earrings && booking.booking_broken_earrings.length > 0
    ? booking.booking_broken_earrings.map((be) => ({
        id: be.id,
        earring_id: be.earring_id,
        qty: be.qty || 1,
        cost: be.cost ?? null,
      }))
    : []

  const getDefaultValues = () => ({
    client_id: booking?.client_id || 'new',
    client_name: booking?.client?.name || '',
    client_phone: booking?.client?.phone || '',
    client_source: booking?.client?.source || null,
    client_notes: booking?.client?.notes || '',
    earring_items: initialEarringItems,
    service_items: initialServiceItems,
    is_model: booking?.is_model || false,
    earring_cost: booking?.earring_cost ?? null,
    earring_revenue: booking?.earring_revenue ?? null,
    travel_enabled: booking?.travel_fee ? booking.travel_fee > 0 : false,
    travel_fee: booking?.travel_fee ?? 20,
    location: booking?.location || '',
    broken_earring_enabled: booking?.broken_earring_loss ? booking.broken_earring_loss > 0 : false,
    broken_earring_loss: booking?.broken_earring_loss ?? null,
    broken_earring_items: initialBrokenEarringItems,
    calculated_total: null,
    total_paid: booking?.total_paid ?? null,
    payment_method: (booking?.payment_method || 'cash') as 'cash' | 'blik',
    tax_enabled: booking?.payment_method === 'blik' ? (booking?.tax_enabled ?? true) : (booking?.tax_enabled ?? false),
    tax_rate: 8.5, // Always 8.5%
    tax_amount: booking?.tax_amount ?? null,
    booksy_fee_enabled: booking?.client?.source === 'booksy' ? (booking.booksy_fee ? booking.booksy_fee > 0 : true) : (booking?.booksy_fee ? booking.booksy_fee > 0 : false),
    booksy_fee: booking?.booksy_fee ?? null,
    notes: booking?.notes || '',
    start_time: booking?.start_time ? new Date(booking.start_time) : (defaultStartTime || getNextHalfHour()),
    end_time: booking?.end_time ? new Date(booking.end_time) : null,
  })

  const form = useForm<BookingFormValues>({
    resolver: zodResolver(bookingSchema),
    defaultValues: getDefaultValues(),
  })

  // Reset form when dialog closes or when booking changes (for editing)
  useEffect(() => {
    if (!open) {
      form.reset(getDefaultValues())
    } else if (open && booking?.id) {
      // When dialog opens with a booking, reset form with that booking's data
      form.reset(getDefaultValues())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, booking?.id])

  // Watch fields for conditional rendering and auto-calculations
  const clientId = useWatch({ control: form.control, name: 'client_id' })
  const clientName = useWatch({ control: form.control, name: 'client_name' })
  const clientPhone = useWatch({ control: form.control, name: 'client_phone' })
  const clientSource = useWatch({ control: form.control, name: 'client_source' })
  const clientNotes = useWatch({ control: form.control, name: 'client_notes' })
  const earringItems = useWatch({ control: form.control, name: 'earring_items' }) || []
  const serviceItems = useWatch({ control: form.control, name: 'service_items' }) || []
  const isModel = useWatch({ control: form.control, name: 'is_model' })
  const paymentMethod = useWatch({ control: form.control, name: 'payment_method' })
  const totalPaid = useWatch({ control: form.control, name: 'total_paid' })
  const taxEnabled = useWatch({ control: form.control, name: 'tax_enabled' })
  const taxRate = useWatch({ control: form.control, name: 'tax_rate' })
  const travelEnabled = useWatch({ control: form.control, name: 'travel_enabled' })
  const travelFee = useWatch({ control: form.control, name: 'travel_fee' })
  const brokenEarringEnabled = useWatch({ control: form.control, name: 'broken_earring_enabled' })
  const brokenEarringLoss = useWatch({ control: form.control, name: 'broken_earring_loss' })
  const brokenEarringItems = useWatch({ control: form.control, name: 'broken_earring_items' }) || []
  const calculatedTotal = useWatch({ control: form.control, name: 'calculated_total' })
  const booksyFeeEnabled = useWatch({ control: form.control, name: 'booksy_fee_enabled' })
  const booksyFee = useWatch({ control: form.control, name: 'booksy_fee' })
  const startTime = useWatch({ control: form.control, name: 'start_time' })

  // Auto-fill client fields when existing client is selected
  useEffect(() => {
    if (clientId && clientId !== 'new' && clientId !== 'none') {
      const selectedClient = clients.find(c => c.id === clientId)
      if (selectedClient) {
        form.setValue('client_name', selectedClient.name)
        form.setValue('client_phone', selectedClient.phone || '')
        form.setValue('client_source', selectedClient.source)
        form.setValue('client_notes', selectedClient.notes || '')
      }
    } else if (clientId === 'new') {
      // Clear fields when "new" is selected
      form.setValue('client_name', '')
      form.setValue('client_phone', '')
      form.setValue('client_source', null)
      form.setValue('client_notes', '')
    }
  }, [clientId, clients, form])

  // Auto-enable booksy fee when client source is booksy
  useEffect(() => {
    if (clientId && clientId !== 'new' && clientId !== 'none') {
      const selectedClient = clients.find(c => c.id === clientId)
      if (selectedClient?.source === 'booksy') {
        form.setValue('booksy_fee_enabled', true)
      }
    }
  }, [clientId, clients, form])

  // Default travel fee to 20 when enabled
  useEffect(() => {
    if (travelEnabled && !travelFee) {
      form.setValue('travel_fee', 20)
    }
  }, [travelEnabled])

  // Calculate earring totals from all earring items
  useEffect(() => {
    if (earringItems.length > 0 && earringItems.some(item => item.earring_id)) {
      let totalCost = 0
      let totalRevenue = 0
      
      earringItems.forEach(item => {
        if (item.earring_id) {
          const earring = earrings.find(e => e.id === item.earring_id)
          if (earring) {
            const cost = (earring.cost || 0) * item.qty
            // Use override price if available, otherwise use sale_price
            const unitPrice = item.price !== null && item.price !== undefined ? item.price : earring.sale_price
            const revenue = unitPrice * item.qty
            totalCost += cost
            totalRevenue += revenue
          }
        }
      })
      
      form.setValue('earring_cost', totalCost)
      form.setValue('earring_revenue', totalRevenue)
    } else {
      form.setValue('earring_cost', null)
      form.setValue('earring_revenue', null)
    }
  }, [earringItems, earrings, form])

  // Auto-add broken earring item when enabled
  useEffect(() => {
    if (brokenEarringEnabled && earrings.length > 0 && brokenEarringItems.length === 0) {
      const firstEarring = earrings[0]
      form.setValue('broken_earring_items', [{
        id: Math.random().toString(),
        earring_id: firstEarring.id,
        qty: 1,
        cost: firstEarring.cost || 0,
      }])
    }
  }, [brokenEarringEnabled, earrings, brokenEarringItems.length, form])

  // Calculate broken earring loss from broken earring items
  useEffect(() => {
    if (brokenEarringItems.length > 0 && brokenEarringItems.some(item => item.earring_id)) {
      let totalLoss = 0
      
      brokenEarringItems.forEach(item => {
        if (item.earring_id) {
          const earring = earrings.find(e => e.id === item.earring_id)
          if (earring) {
            // Use override cost if available, otherwise use base cost
            const unitCost = item.cost !== null && item.cost !== undefined ? item.cost : (earring.cost || 0)
            totalLoss += unitCost * item.qty
          }
        }
      })
      
      form.setValue('broken_earring_loss', totalLoss)
    } else {
      form.setValue('broken_earring_loss', null)
    }
  }, [brokenEarringItems, earrings, form])

  // No useEffect for service price updates - handled directly in onChange handlers

  // Handle model toggle - set all service prices to 0 or restore base prices
  const handleModelToggle = (isModel: boolean) => {
    serviceItems.forEach((item, index) => {
      if (item.service_id) {
        if (isModel) {
          form.setValue(`service_items.${index}.price`, 0)
        } else {
          const service = services.find(s => s.id === item.service_id)
          if (service) {
            form.setValue(`service_items.${index}.price`, service.base_price)
          }
        }
      }
    })
  }

  // Update service prices when is_model changes
  useEffect(() => {
    if (serviceItems.length > 0) {
      handleModelToggle(isModel)
    }
  }, [isModel, serviceItems.length])

  // Get totals for calculations
  const earringRevenue = form.watch('earring_revenue') || 0
  const totalServicePrice = serviceItems.reduce((sum, item) => sum + (Number(item.price) || 0), 0)

  // Auto-calculate total (service_price + earring_revenue + travel_fee if enabled)
  useEffect(() => {
    const sp = Number(totalServicePrice) || 0
    const er = Number(earringRevenue) || 0
    const tf = travelEnabled ? (Number(travelFee) || 0) : 0
    const calculated = sp + er + tf
    if (calculated > 0) {
      form.setValue('calculated_total', calculated)
    } else {
      form.setValue('calculated_total', null)
    }
  }, [totalServicePrice, earringRevenue, travelEnabled, travelFee])

  // Auto-calculate end_time from sum of all service durations
  useEffect(() => {
    if (serviceItems.length > 0 && startTime) {
      const totalDuration = serviceItems
        .map(item => {
          const service = services.find(s => s.id === item.service_id)
          return service?.duration_minutes || 0
        })
        .reduce((sum, duration) => sum + duration, 0)
      if (totalDuration > 0) {
        const endTime = new Date(startTime)
        endTime.setMinutes(endTime.getMinutes() + totalDuration)
        form.setValue('end_time', endTime)
      }
    }
  }, [serviceItems, startTime, services])

  // Auto-enable tax for BLIK (but can be disabled)
  useEffect(() => {
    if (paymentMethod === 'blik' && form.getValues('tax_enabled') === false) {
      form.setValue('tax_enabled', true)
    }
  }, [paymentMethod])

  // Auto-calculate tax (always 8.5%)
  useEffect(() => {
    if (taxEnabled && totalPaid && totalPaid > 0) {
      const taxAmount = (totalPaid * 8.5) / 100
      form.setValue('tax_amount', taxAmount)
      form.setValue('tax_rate', 8.5) // Always ensure it's 8.5
    } else {
      form.setValue('tax_amount', null)
    }
  }, [taxEnabled, totalPaid, form])

  // Auto-calculate booksy fee (43.05% of first service price)
  useEffect(() => {
    if (booksyFeeEnabled && serviceItems.length > 0 && serviceItems[0].service_id && serviceItems[0].price !== null && serviceItems[0].price !== undefined) {
      const firstServicePrice = serviceItems[0].price || 0
      const calculatedFee = firstServicePrice * 0.4305
      form.setValue('booksy_fee', calculatedFee)
    } else if (!booksyFeeEnabled) {
      form.setValue('booksy_fee', null)
    }
  }, [booksyFeeEnabled, serviceItems, form])

  // Calculate profit (revenue - costs)
  // Revenue includes: Service Revenue + Earring Revenue + Travel Fee
  // Costs include: Earring Cost + Booksy Fee + Broken Earring Loss + Tax
  const earringCost = Number(useWatch({ control: form.control, name: 'earring_cost' }) || 0)
  const taxAmount = Number(useWatch({ control: form.control, name: 'tax_amount'}) || 0)
  const bFee = booksyFeeEnabled ? (Number(booksyFee) || 0) : 0
  const bLoss = brokenEarringEnabled ? (Number(brokenEarringLoss) || 0) : 0
  // Calculate revenue on-the-fly for display (don't rely on calculatedTotal which might be null)
  // Revenue = Service Revenue + Earring Revenue + Travel Fee (if enabled)
  const revenue = (Number(totalServicePrice) || 0) + (Number(earringRevenue) || 0) + (travelEnabled ? (Number(travelFee) || 0) : 0)
  const totalPaidAmount = Number(totalPaid) || 0
  const totalCosts = earringCost + bFee + bLoss + taxAmount
  const projectedProfit = revenue - totalCosts
  const realProfit = totalPaidAmount - totalCosts
  const profitsAreEqual = Math.abs(projectedProfit - realProfit) < 0.01 // Account for floating point precision

  const addEarringItem = () => {
    const currentItems = form.getValues('earring_items') || []
    form.setValue('earring_items', [
      ...currentItems,
      { id: Math.random().toString(), earring_id: '', qty: 1, price: null }
    ])
  }

  const removeEarringItem = (id: string | undefined) => {
    const currentItems = form.getValues('earring_items') || []
    if (currentItems.length > 1 && id) {
      form.setValue('earring_items', currentItems.filter(item => item.id !== id))
    }
  }

  const addBrokenEarringItem = () => {
    const currentItems = form.getValues('broken_earring_items') || []
    const firstEarring = earrings.length > 0 ? earrings[0] : null
    form.setValue('broken_earring_items', [
      ...currentItems,
      { 
        id: Math.random().toString(), 
        earring_id: firstEarring ? firstEarring.id : '', 
        qty: 1, 
        cost: firstEarring ? (firstEarring.cost || 0) : null 
      }
    ])
  }

  const removeBrokenEarringItem = (id: string | undefined) => {
    const currentItems = form.getValues('broken_earring_items') || []
    if (id) {
      form.setValue('broken_earring_items', currentItems.filter(item => item.id !== id))
    }
  }

  const addServiceItem = () => {
    const currentItems = form.getValues('service_items') || []
    form.setValue('service_items', [
      ...currentItems,
      { id: Math.random().toString(), service_id: '', price: null }
    ])
  }

  const removeServiceItem = (id: string | undefined) => {
    const currentItems = form.getValues('service_items') || []
    if (currentItems.length > 1 && id) {
      form.setValue('service_items', currentItems.filter(item => item.id !== id))
    }
  }

  const handleCancel = () => {
    form.reset(getDefaultValues())
    setOpen(false)
  }

  const onSubmit = async (values: BookingFormValues) => {
    setLoading(true)
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('You must be logged in to create a booking')
      }

      // Calculate aggregated totals
      const totalServicePrice = values.service_items.reduce((sum, item) => sum + (Number(item.price) || 0), 0)
      
      // Handle client creation if "new" is selected
      let finalClientId: string | null = null
      if (values.client_id === 'new') {
        // Create new client
        if (values.client_name) {
          const { data: newClient, error: clientError } = await supabase
            .from('clients')
            // @ts-expect-error - Supabase types issue
            .insert([{
              name: values.client_name,
              phone: values.client_phone || null,
              source: values.client_source,
              notes: values.client_notes || null,
              user_id: user.id,
            }])
            .select()
            .single()
          
          if (clientError) throw clientError
          // @ts-expect-error - Supabase types issue
          finalClientId = newClient.id
        }
      } else {
        finalClientId = values.client_id || null
      }
      
      // Convert empty/null values to 0 for number fields
      const bookingData = {
        client_id: finalClientId,
        // Keep legacy fields for backward compatibility (will be null/0)
        earring_id: null,
        earring_qty: 0,
        service_id: null,
        service_price: totalServicePrice,
        is_model: values.is_model || false,
        earring_cost: values.earring_cost ?? 0,
        earring_revenue: values.earring_revenue ?? 0,
        travel_fee: values.travel_enabled ? (values.travel_fee ?? 20) : 0,
        location: values.travel_enabled ? values.location : null,
        booksy_fee: values.booksy_fee_enabled ? (values.booksy_fee ?? 0) : 0,
        broken_earring_loss: values.broken_earring_enabled ? (values.broken_earring_loss ?? 0) : 0,
        total_paid: values.total_paid !== null && values.total_paid !== undefined ? Number(values.total_paid) : 0,
        payment_method: values.payment_method,
        tax_enabled: values.tax_enabled,
        tax_rate: 8.5, // Always 8.5%
        tax_amount: values.tax_amount ?? 0,
        notes: values.notes,
        start_time: values.start_time.toISOString(),
        end_time: values.end_time?.toISOString() || null,
        // Calculate real profit: Total Paid - Costs
        // Real Profit = what was actually paid - costs
        // Costs = Earring Cost + Booksy Fee + Broken Earring Loss + Tax
        profit: (values.total_paid ?? 0) - ((values.earring_cost ?? 0) + (values.booksy_fee_enabled ? (values.booksy_fee ?? 0) : 0) + (values.broken_earring_enabled ? (values.broken_earring_loss ?? 0) : 0) + (values.tax_amount ?? 0)),
      }

      let bookingId: string

      if (booking) {
        const { data: updatedBooking, error } = await supabase
          .from('bookings')
          // @ts-expect-error - Supabase types issue
          .update(bookingData)
          .eq('id', booking.id)
          .select()
          .single()
        if (error) throw error
        // @ts-expect-error - Supabase types issue
        bookingId = updatedBooking.id

        // Delete existing junction table entries
        await supabase.from('booking_earrings').delete().eq('booking_id', bookingId)
        await supabase.from('booking_services').delete().eq('booking_id', bookingId)
        await supabase.from('booking_broken_earrings').delete().eq('booking_id', bookingId)
      } else {
        const { data: newBooking, error } = await supabase
          .from('bookings')
          // @ts-expect-error - Supabase types issue
          .insert([{ ...bookingData, user_id: user.id }])
          .select()
          .single()
        if (error) throw error
        // @ts-expect-error - Supabase types issue
        bookingId = newBooking.id
      }

      // Insert earring items
      if (values.earring_items && values.earring_items.length > 0) {
        const earringItems = values.earring_items
          .filter(item => item.earring_id)
          .map(item => ({
            booking_id: bookingId,
            earring_id: item.earring_id,
            qty: item.qty || 1,
            price: item.price ?? null,
            user_id: user.id,
          }))
        
        if (earringItems.length > 0) {
          const { error: earringError } = await supabase
            .from('booking_earrings')
            // @ts-expect-error - Supabase types issue
            .insert(earringItems)
          if (earringError) throw earringError
        }
      }

      // Insert service items
      if (values.service_items && values.service_items.length > 0) {
        const serviceItems = values.service_items
          .filter(item => item.service_id)
          .map(item => ({
            booking_id: bookingId,
            service_id: item.service_id,
            price: item.price ?? 0,
            user_id: user.id,
          }))
        
        if (serviceItems.length > 0) {
          const { error: serviceError } = await supabase
            .from('booking_services')
            // @ts-expect-error - Supabase types issue
            .insert(serviceItems)
          if (serviceError) throw serviceError
        }
      }

      // Insert broken earring items (only if feature is enabled)
      if (values.broken_earring_enabled && values.broken_earring_items && values.broken_earring_items.length > 0) {
        const brokenEarringItems = values.broken_earring_items
          .filter(item => item.earring_id)
          .map(item => ({
            booking_id: bookingId,
            earring_id: item.earring_id,
            qty: item.qty || 1,
            cost: item.cost ?? null,
            user_id: user.id,
          }))
        
        if (brokenEarringItems.length > 0) {
          const { error: brokenEarringError } = await supabase
            .from('booking_broken_earrings')
            // @ts-expect-error - Supabase types issue
            .insert(brokenEarringItems)
          if (brokenEarringError) {
            console.error('Error inserting broken earring items:', brokenEarringError)
            throw brokenEarringError
          }
        }
      }
      setOpen(false)
      form.reset(getDefaultValues())
      router.refresh()
    } catch (error) {
      console.error('Error saving booking:', error)
      let errorMessage = 'Failed to save booking'
      if (error instanceof Error) {
        errorMessage = error.message
      } else if (typeof error === 'object' && error !== null) {
        // Handle Supabase errors
        if ('message' in error) {
          errorMessage = String(error.message)
        } else if ('error' in error) {
          errorMessage = String((error as any).error)
        }
      }
      alert(`Failed to save booking: ${errorMessage}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="!max-w-[calc(100vw-2rem)] sm:!max-w-lg md:!max-w-2xl lg:!max-w-4xl xl:!max-w-[1000px] w-full max-h-[95dvh] flex flex-col p-0 gap-0 !top-1/2 !left-1/2 !-translate-x-1/2 !-translate-y-1/2">
        {dataLoading && (
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <Loader size="lg" />
              <p className="text-sm text-muted-foreground">Loading data...</p>
            </div>
          </div>
        )}
        <DialogHeader className="px-6 pt-4 pb-3 border-b gap-0">
          <DialogTitle className="text-2xl">{booking ? 'Edit Booking' : 'New Booking'}</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form 
            onSubmit={(e) => {
              // Prevent form submission when clicking on Google Places suggestions
              const target = e.target as HTMLElement
              if (target.closest('.pac-container')) {
                e.preventDefault()
                e.stopPropagation()
                return false
              }
              form.handleSubmit(onSubmit)(e)
            }}
            className="flex flex-col flex-1 min-h-0"
          >
            <div className="flex-1 overflow-y-auto px-6 pt-0 pb-0">
              <div className="space-y-6 py-6">
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Left Column - Main Fields */}
              <div className="space-y-6">
                {/* Section 1: Time & Client */}
                <Card className="py-6">
                  <CardHeader 
                    className="pb-0 px-6 pt-0 gap-0 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => setTimeClientExpanded(!timeClientExpanded)}
                  >
                    <CardTitle className="flex items-center justify-between text-lg">
                      <div className="flex items-center gap-2">
                        <Clock className="h-5 w-5" />
                        Time & Client
                      </div>
                      {timeClientExpanded ? (
                        <ChevronUp className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-muted-foreground" />
                      )}
                    </CardTitle>
                  </CardHeader>
                  {timeClientExpanded && (
                  <CardContent className="space-y-4 pt-0">
                    <FormField
                      control={form.control}
                      name="start_time"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Date & Time</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  className="w-full pl-3 text-left font-normal"
                                >
                                  {field.value ? (
                                    format(field.value, 'PPP HH:mm')
                                  ) : (
                                    <span>Pick a date and time</span>
                                  )}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                disabled={(date) => date < new Date()}
                              />
                              <div className="p-3 border-t">
                                <Input
                                  type="time"
                                  value={field.value ? format(field.value, 'HH:mm') : ''}
                                  onChange={(e) => {
                                    const [hours, minutes] = e.target.value.split(':')
                                    const newDate = new Date(field.value || new Date())
                                    newDate.setHours(parseInt(hours) || 0, parseInt(minutes) || 0)
                                    field.onChange(newDate)
                                  }}
                                />
                              </div>
                            </PopoverContent>
                          </Popover>
                          {form.watch('end_time') && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Ends: {format(form.watch('end_time')!, 'HH:mm')}
                            </p>
                          )}
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Separator className="my-6" />

                    <FormField
                      control={form.control}
                      name="client_id"
                      render={({ field }) => {
                        const [open, setOpen] = useState(false)
                        const [searchQuery, setSearchQuery] = useState('')
                        
                        // Filter clients by name or phone
                        const filteredClients = clients.filter(client => {
                          if (!searchQuery) return true
                          const query = searchQuery.toLowerCase()
                          return (
                            client.name.toLowerCase().includes(query) ||
                            (client.phone && client.phone.toLowerCase().includes(query))
                          )
                        })
                        
                        const selectedClient = clients.find(c => c.id === field.value)
                        
                        return (
                          <FormItem>
                            <FormLabel>Client</FormLabel>
                            <Popover open={open} onOpenChange={setOpen}>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant="outline"
                                    role="combobox"
                                    className="w-full justify-between"
                                    type="button"
                                  >
                                    {field.value === 'new' 
                                      ? 'New client'
                                      : selectedClient 
                                        ? `${selectedClient.name}${selectedClient.phone ? ` (${selectedClient.phone})` : ''}`
                                        : 'Select client...'}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 max-h-[400px] flex flex-col" align="start">
                                <Command className="flex flex-col">
                                  <CommandInput 
                                    placeholder="Search by name or phone..." 
                                    value={searchQuery}
                                    onValueChange={setSearchQuery}
                                  />
                                  <CommandList className="flex-1 min-h-0">
                                    <CommandEmpty>No client found.</CommandEmpty>
                                    <CommandGroup>
                                      <CommandItem
                                        value="new"
                                        onSelect={() => {
                                          field.onChange('new')
                                          setOpen(false)
                                          setSearchQuery('')
                                        }}
                                      >
                                        <Check
                                          className={cn(
                                            "mr-2 h-4 w-4",
                                            field.value === 'new' ? "opacity-100" : "opacity-0"
                                          )}
                                        />
                                        New client
                                      </CommandItem>
                                      {filteredClients.map((client) => (
                                        <CommandItem
                                          key={client.id}
                                          value={client.id}
                                          onSelect={() => {
                                            field.onChange(client.id)
                                            setOpen(false)
                                            setSearchQuery('')
                                          }}
                                        >
                                          <Check
                                            className={cn(
                                              "mr-2 h-4 w-4",
                                              field.value === client.id ? "opacity-100" : "opacity-0"
                                            )}
                                          />
                                          {client.name}
                                          {client.phone && <span className="text-muted-foreground ml-2">({client.phone})</span>}
                                        </CommandItem>
                                      ))}
                                    </CommandGroup>
                                  </CommandList>
                                </Command>
                              </PopoverContent>
                            </Popover>
                            <FormMessage />
                          </FormItem>
                        )
                      }}
                    />
                    
                    {/* Client Fields - Show only for new clients */}
                    {clientId === 'new' && (
                      <div className="space-y-4">
                        <FormField
                          control={form.control}
                          name="client_name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Name</FormLabel>
                              <FormControl>
                                <Input 
                                  {...field} 
                                  placeholder="Client name"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="client_phone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Phone</FormLabel>
                              <FormControl>
                                <Input 
                                  {...field} 
                                  placeholder="Phone number"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="client_source"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Source</FormLabel>
                              <Select
                                onValueChange={(value) => field.onChange(value === 'none' ? null : value)}
                                value={field.value || 'none'}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select source" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="none">None</SelectItem>
                                  <SelectItem value="booksy">Booksy</SelectItem>
                                  <SelectItem value="instagram">Instagram</SelectItem>
                                  <SelectItem value="referral">Referral</SelectItem>
                                  <SelectItem value="walk-in">Walk-in</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="client_notes"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Notes</FormLabel>
                              <FormControl>
                                <Textarea 
                                  {...field} 
                                  placeholder="Client notes"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    )}
                  </CardContent>
                  )}
                </Card>

                {/* Section 3: Service */}
                <Card className="py-6">
                  <CardHeader 
                    className="pb-0 px-6 pt-0 gap-0 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => setServiceExpanded(!serviceExpanded)}
                  >
                    <CardTitle className="flex items-center justify-between text-lg">
                      <div className="flex items-center gap-2">
                        <Scissors className="h-5 w-5" />
                        Service
                      </div>
                      {serviceExpanded ? (
                        <ChevronUp className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-muted-foreground" />
                      )}
                    </CardTitle>
                  </CardHeader>
                  {serviceExpanded && (
                  <CardContent className="space-y-4 pt-0">
                    {/* Service Items */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <FormLabel className="text-base font-semibold">Services</FormLabel>
                        <Button type="button" variant="outline" size="sm" onClick={addServiceItem}>
                          <Plus className="h-4 w-4 mr-2" />
                          Add Service
                        </Button>
                      </div>
                      {serviceItems.map((item, index) => {
                        const selectedService = services.find(s => s.id === item.service_id)
                        return (
                          <div key={item.id || index} className="p-3 border rounded-lg space-y-3">
                            <div className="flex items-start gap-3">
                              <div className="flex-1 min-w-0">
                                <FormField
                                  control={form.control}
                                  name={`service_items.${index}.service_id`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel className="text-xs">Service</FormLabel>
                                      <Select
                                        onValueChange={(value) => {
                                          field.onChange(value)
                                          // Update price to base_price when service changes
                                          const service = services.find(s => s.id === value)
                                          if (service && !isModel) {
                                            form.setValue(`service_items.${index}.price`, service.base_price)
                                          } else if (service && isModel) {
                                            form.setValue(`service_items.${index}.price`, 0)
                                          }
                                        }}
                                        value={field.value}
                                      >
                                        <FormControl>
                                          <SelectTrigger className="w-full">
                                            <SelectValue placeholder="Select service" />
                                          </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                          {services.map((service) => (
                                            <SelectItem key={service.id} value={service.id}>
                                              {service.name} ({service.duration_minutes} min)
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </FormItem>
                                  )}
                                />
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => removeServiceItem(item.id)}
                                disabled={serviceItems.length === 1}
                                className="h-8 w-8 shrink-0 mt-6"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                            <div className="grid gap-3 sm:grid-cols-2">
                              <FormField
                                control={form.control}
                                name={`service_items.${index}.price`}
                                render={({ field }) => {
                                  const currentPrice = field.value === null || field.value === undefined ? null : Number(field.value)
                                  const basePrice = selectedService ? selectedService.base_price : null
                                  const isPriceDifferent = selectedService && currentPrice !== null && basePrice !== null && currentPrice !== basePrice && !isModel
                                  
                                  return (
                                    <FormItem>
                                      <div className="flex items-center gap-1">
                                        <FormLabel className="text-xs">Price</FormLabel>
                                        {isPriceDifferent && (
                                          <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="h-4 w-4 p-0 hover:bg-transparent"
                                            onClick={() => {
                                              if (selectedService && !isModel) {
                                                form.setValue(`service_items.${index}.price`, selectedService.base_price)
                                              }
                                            }}
                                          >
                                            <RefreshCw className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                                          </Button>
                                        )}
                                      </div>
                                      <FormControl>
                                      <Input
                                        type="number"
                                        step="0.01"
                                        value={field.value === null || field.value === undefined ? '' : field.value}
                                        onChange={(e) => {
                                          const value = e.target.value
                                          field.onChange(value === '' ? '' : value)
                                        }}
                                        onBlur={(e) => {
                                          const value = e.target.value
                                          field.onBlur()
                                          if (value === '') {
                                            field.onChange(null)
                                          } else {
                                            const numValue = parseFloat(value)
                                            field.onChange(isNaN(numValue) ? null : numValue)
                                          }
                                        }}
                                        disabled={isModel || !item.service_id}
                                        className={isModel || !item.service_id ? 'opacity-50' : ''}
                                        placeholder="0.00"
                                        name={field.name}
                                        ref={field.ref}
                                      />
                                      </FormControl>
                                    </FormItem>
                                  )
                                }}
                              />
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    <Separator className="my-6" />

                    {/* Travel */}
                    <div className="space-y-4">
                      <FormField
                        control={form.control}
                        name="travel_enabled"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center gap-3">
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <FormLabel className="text-sm font-medium">Travel</FormLabel>
                          </FormItem>
                        )}
                      />
                      
                      {travelEnabled && (
                        <div className="grid gap-4 sm:grid-cols-2">
                          <FormField
                            control={form.control}
                            name="location"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Location</FormLabel>
                                <FormControl>
                                  <GooglePlacesAutocomplete
                                    value={field.value || ''}
                                    onChange={field.onChange}
                                    placeholder="Search for a location..."
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="travel_fee"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Travel Fee</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    value={field.value === null || field.value === undefined ? '' : field.value}
                                    onChange={(e) => {
                                      const value = e.target.value
                                      field.onChange(value === '' ? '' : value)
                                    }}
                                    onBlur={(e) => {
                                      const value = e.target.value
                                      field.onBlur()
                                      if (value === '') {
                                        field.onChange(null)
                                      } else {
                                        const numValue = parseFloat(value)
                                        field.onChange(isNaN(numValue) ? null : numValue)
                                      }
                                    }}
                                    placeholder="20.00"
                                    name={field.name}
                                    ref={field.ref}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      )}
                    </div>

                    <Separator className="my-6" />

                    {/* Model Session */}
                    <div className="space-y-4">
                      <FormField
                        control={form.control}
                        name="is_model"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center gap-3">
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={(checked) => {
                                  field.onChange(checked)
                                  handleModelToggle(checked)
                                }}
                              />
                            </FormControl>
                            <FormLabel className="text-sm font-medium">Model Session</FormLabel>
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                  )}
                </Card>

                {/* Section 3: Earrings */}
                <Card className="py-6">
                  <CardHeader 
                    className="pb-0 px-6 pt-0 gap-0 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => setEarringsExpanded(!earringsExpanded)}
                  >
                    <CardTitle className="flex items-center justify-between text-lg">
                      <div className="flex items-center gap-2">
                        <Scissors className="h-5 w-5" />
                        Earrings
                      </div>
                      {earringsExpanded ? (
                        <ChevronUp className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-muted-foreground" />
                      )}
                    </CardTitle>
                  </CardHeader>
                  {earringsExpanded && (
                  <CardContent className="space-y-4 pt-0">
                    {/* Earrings List */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <FormLabel className="text-base font-semibold">Earrings</FormLabel>
                        <Button type="button" variant="outline" size="sm" onClick={addEarringItem}>
                          <Plus className="h-4 w-4 mr-2" />
                          Add Earring
                        </Button>
                      </div>
                      {earringItems.map((item, index) => {
                        const selectedEarring = earrings.find(e => e.id === item.earring_id)
                        return (
                          <div key={item.id || index} className="p-3 border rounded-lg space-y-3">
                            <div className="flex items-start gap-3">
                              <div className="flex-1 min-w-0">
                                <FormField
                                  control={form.control}
                                  name={`earring_items.${index}.earring_id`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel className="text-xs">Earring</FormLabel>
                                      <Select
                                        onValueChange={(value) => {
                                          field.onChange(value)
                                          // Update price to sale_price when earring changes
                                          const earring = earrings.find(e => e.id === value)
                                          if (earring) {
                                            form.setValue(`earring_items.${index}.price`, earring.sale_price)
                                          }
                                        }}
                                        value={field.value}
                                      >
                                        <FormControl>
                                          <SelectTrigger className="w-full">
                                            <SelectValue placeholder="Select earring" />
                                          </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                          {earrings.map((earring) => (
                                            <SelectItem key={earring.id} value={earring.id}>
                                              {earring.name} {earring.stock_qty > 0 ? `(Stock: ${earring.stock_qty})` : '(Out of stock)'}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </FormItem>
                                  )}
                                />
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => removeEarringItem(item.id)}
                                disabled={earringItems.length === 1}
                                className="h-8 w-8 shrink-0 mt-6"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                            <div className="grid gap-3 sm:grid-cols-2">
                              <FormField
                                control={form.control}
                                name={`earring_items.${index}.price`}
                                render={({ field }) => {
                                  const currentPrice = field.value === null || field.value === undefined ? null : Number(field.value)
                                  const basePrice = selectedEarring ? selectedEarring.sale_price : null
                                  const isPriceDifferent = selectedEarring && currentPrice !== null && basePrice !== null && currentPrice !== basePrice
                                  
                                  return (
                                    <FormItem>
                                      <div className="flex items-center gap-1">
                                        <FormLabel className="text-xs">Price</FormLabel>
                                        {isPriceDifferent && (
                                          <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="h-4 w-4 p-0 hover:bg-transparent"
                                            onClick={() => {
                                              if (selectedEarring) {
                                                form.setValue(`earring_items.${index}.price`, selectedEarring.sale_price)
                                              }
                                            }}
                                          >
                                            <RefreshCw className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                                          </Button>
                                        )}
                                      </div>
                                      <FormControl>
                                        <Input
                                          type="number"
                                          step="0.01"
                                          value={field.value === null || field.value === undefined ? '' : field.value}
                                          onChange={(e) => {
                                            const value = e.target.value
                                            field.onChange(value === '' ? '' : value)
                                          }}
                                          onBlur={(e) => {
                                            const value = e.target.value
                                            field.onBlur()
                                            if (value === '') {
                                              field.onChange(null)
                                            } else {
                                              const numValue = parseFloat(value)
                                              field.onChange(isNaN(numValue) ? null : numValue)
                                            }
                                          }}
                                          placeholder={selectedEarring ? selectedEarring.sale_price.toFixed(2) : "0.00"}
                                          name={field.name}
                                          ref={field.ref}
                                        />
                                      </FormControl>
                                    </FormItem>
                                  )
                                }}
                              />
                              <FormField
                                control={form.control}
                                name={`earring_items.${index}.qty`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-xs">Qty</FormLabel>
                                    <FormControl>
                                      <Input
                                        type="number"
                                        min="1"
                                        value={field.value === null || field.value === undefined ? '' : field.value}
                                        onChange={(e) => {
                                          const value = e.target.value
                                          field.onChange(value === '' ? '' : value)
                                        }}
                                        onBlur={(e) => {
                                          const value = e.target.value
                                          field.onBlur()
                                          if (value === '') {
                                            field.onChange(undefined)
                                          } else {
                                            const numValue = parseInt(value, 10)
                                            field.onChange(isNaN(numValue) || numValue < 1 ? 1 : numValue)
                                          }
                                        }}
                                        name={field.name}
                                        ref={field.ref}
                                      />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    <Separator className="my-6" />

                    {/* Broken Earring */}
                    <div className="space-y-4">
                      <FormField
                        control={form.control}
                        name="broken_earring_enabled"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center gap-3">
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <FormLabel className="text-sm font-medium">Broken Earring Loss</FormLabel>
                          </FormItem>
                        )}
                      />
                      
                      {brokenEarringEnabled && (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <FormLabel className="text-base font-semibold">Broken Earrings</FormLabel>
                            <Button type="button" variant="outline" size="sm" onClick={addBrokenEarringItem}>
                              <Plus className="h-4 w-4 mr-2" />
                              Add Broken Earring
                            </Button>
                          </div>
                          {brokenEarringItems.length > 0 && brokenEarringItems.map((item, index) => {
                            const selectedEarring = earrings.find(e => e.id === item.earring_id)
                            return (
                              <div key={item.id || index} className="p-3 border rounded-lg space-y-3">
                                <div className="flex items-start gap-3">
                                  <div className="flex-1 min-w-0">
                                    <FormField
                                      control={form.control}
                                      name={`broken_earring_items.${index}.earring_id`}
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel className="text-xs">Earring</FormLabel>
                                          <Select
                                            onValueChange={(value) => {
                                              field.onChange(value)
                                              // Update cost to base cost when earring changes
                                              const earring = earrings.find(e => e.id === value)
                                              if (earring) {
                                                form.setValue(`broken_earring_items.${index}.cost`, earring.cost || 0)
                                              }
                                            }}
                                            value={field.value}
                                          >
                                            <FormControl>
                                              <SelectTrigger className="w-full">
                                                <SelectValue placeholder="Select earring" />
                                              </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                              {earrings.map((earring) => (
                                                <SelectItem key={earring.id} value={earring.id}>
                                                  {earring.name} {earring.stock_qty > 0 ? `(Stock: ${earring.stock_qty})` : '(Out of stock)'}
                                                </SelectItem>
                                              ))}
                                            </SelectContent>
                                          </Select>
                                        </FormItem>
                                      )}
                                    />
                                  </div>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => removeBrokenEarringItem(item.id)}
                                    disabled={brokenEarringItems.length === 1}
                                    className="h-8 w-8 shrink-0 mt-6"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                                <div className="grid gap-3 sm:grid-cols-2">
                                  <FormField
                                    control={form.control}
                                    name={`broken_earring_items.${index}.cost`}
                                    render={({ field }) => {
                                      const currentCost = field.value === null || field.value === undefined ? null : Number(field.value)
                                      const baseCost = selectedEarring ? (selectedEarring.cost || 0) : null
                                      const isCostDifferent = selectedEarring && currentCost !== null && baseCost !== null && currentCost !== baseCost
                                      
                                      return (
                                        <FormItem>
                                          <div className="flex items-center gap-1">
                                            <FormLabel className="text-xs">Cost</FormLabel>
                                            {isCostDifferent && (
                                              <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                className="h-4 w-4 p-0 hover:bg-transparent"
                                                onClick={() => {
                                                  if (selectedEarring) {
                                                    form.setValue(`broken_earring_items.${index}.cost`, selectedEarring.cost || 0)
                                                  }
                                                }}
                                              >
                                                <RefreshCw className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                                              </Button>
                                            )}
                                          </div>
                                          <FormControl>
                                            <Input
                                              type="number"
                                              step="0.01"
                                              value={field.value === null || field.value === undefined ? '' : field.value}
                                              onChange={(e) => {
                                                const value = e.target.value
                                                field.onChange(value === '' ? '' : value)
                                              }}
                                              onBlur={(e) => {
                                                const value = e.target.value
                                                field.onBlur()
                                                if (value === '') {
                                                  field.onChange(null)
                                                } else {
                                                  const numValue = parseFloat(value)
                                                  field.onChange(isNaN(numValue) ? null : numValue)
                                                }
                                              }}
                                              placeholder={selectedEarring ? (selectedEarring.cost || 0).toFixed(2) : "0.00"}
                                              name={field.name}
                                              ref={field.ref}
                                            />
                                          </FormControl>
                                        </FormItem>
                                      )
                                    }}
                                  />
                                  <FormField
                                    control={form.control}
                                    name={`broken_earring_items.${index}.qty`}
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel className="text-xs">Qty</FormLabel>
                                        <FormControl>
                                          <Input
                                            type="number"
                                            min="1"
                                            value={field.value === null || field.value === undefined ? '' : field.value}
                                            onChange={(e) => {
                                              const value = e.target.value
                                              field.onChange(value === '' ? '' : value)
                                            }}
                                            onBlur={(e) => {
                                              const value = e.target.value
                                              field.onBlur()
                                              if (value === '') {
                                                field.onChange(undefined)
                                              } else {
                                                const numValue = parseInt(value, 10)
                                                field.onChange(isNaN(numValue) || numValue < 1 ? 1 : numValue)
                                              }
                                            }}
                                            name={field.name}
                                            ref={field.ref}
                                          />
                                        </FormControl>
                                      </FormItem>
                                    )}
                                  />
                                </div>
                              </div>
                            )
                          })}
                          {brokenEarringItems.length === 0 && (
                            <Button type="button" variant="outline" size="sm" onClick={addBrokenEarringItem} className="w-full">
                              <Plus className="h-4 w-4 mr-2" />
                              Add Broken Earring
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                  )}
                </Card>

                {/* Section 4: Payment */}
                <Card className="py-6">
                  <CardHeader 
                    className="pb-0 px-6 pt-0 gap-0 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => setPaymentExpanded(!paymentExpanded)}
                  >
                    <CardTitle className="flex items-center justify-between text-lg">
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-5 w-5" />
                        Payment
                      </div>
                      {paymentExpanded ? (
                        <ChevronUp className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-muted-foreground" />
                      )}
                    </CardTitle>
                  </CardHeader>
                  {paymentExpanded && (
                  <CardContent className="space-y-4 pt-0">
                    {/* Payment Method */}
                    <FormField
                      control={form.control}
                      name="payment_method"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Payment Method</FormLabel>
                          <FormControl>
                            <RadioGroup
                              onValueChange={field.onChange}
                              value={field.value}
                              className="flex gap-6"
                            >
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="cash" id="cash" />
                                <label htmlFor="cash" className="cursor-pointer">Cash</label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="blik" id="blik" />
                                <label htmlFor="blik" className="cursor-pointer">BLIK</label>
                              </div>
                            </RadioGroup>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Tax Settings */}
                    <div className="space-y-4">
                      <FormField
                        control={form.control}
                        name="tax_enabled"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center gap-3">
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <FormLabel className="text-sm font-medium">Tax (8.5%)</FormLabel>
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Booksy Fee */}
                    <div className="space-y-4">
                      <FormField
                        control={form.control}
                        name="booksy_fee_enabled"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center gap-3">
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <FormLabel className="text-sm font-medium">Booksy Fee (43.05% of first service)</FormLabel>
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                  )}
                </Card>

                {/* Section 5: Notes */}
                <Card className="py-6">
                  <CardHeader 
                    className="pb-0 px-6 pt-0 gap-0 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => setNotesExpanded(!notesExpanded)}
                  >
                    <CardTitle className="flex items-center justify-between text-lg">
                      <div className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Notes
                      </div>
                      {notesExpanded ? (
                        <ChevronUp className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-muted-foreground" />
                      )}
                    </CardTitle>
                  </CardHeader>
                  {notesExpanded && (
                  <CardContent className="pt-0">
                    <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Textarea 
                              {...field} 
                              placeholder="Add any additional notes about this booking..."
                              rows={4}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                  )}
                </Card>
              </div>

              {/* Right Column - Totals (Sticky) */}
              <div className="space-y-6">
                <Card className="sticky top-6 py-6">
                  <CardHeader className="pb-0 px-6 pt-0 gap-0">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <CreditCard className="h-5 w-5" />
                      Totals
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 pt-0">
                    {/* Revenue Breakdown */}
                    <div>
                      <p className="text-sm font-semibold mb-2">Revenue</p>
                      <div className="space-y-2 pl-2">
                        {Number(totalServicePrice) > 0 && (
                          <div className="flex justify-between">
                            <p className="text-sm text-muted-foreground">Service Revenue</p>
                            <p className="text-sm font-medium">${Number(totalServicePrice).toFixed(2)}</p>
                          </div>
                        )}
                        {earringRevenue > 0 && (
                          <div className="flex justify-between">
                            <p className="text-sm text-muted-foreground">Earring Revenue</p>
                            <p className="text-sm font-medium">${Number(earringRevenue).toFixed(2)}</p>
                          </div>
                        )}
                        {travelEnabled && travelFee && Number(travelFee) > 0 && (
                          <div className="flex justify-between">
                            <p className="text-sm text-muted-foreground">Travel Fee</p>
                            <p className="text-sm font-medium">${Number(travelFee).toFixed(2)}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Costs Breakdown */}
                    <div className="border-t pt-3 mt-3">
                      <p className="text-sm font-semibold mb-2">Costs</p>
                      <div className="space-y-2 pl-2">
                        {earringCost > 0 && (
                          <div className="flex justify-between">
                            <p className="text-sm text-muted-foreground">Earring Cost</p>
                            <p className="text-sm font-medium">${earringCost.toFixed(2)}</p>
                          </div>
                        )}
                        {booksyFeeEnabled && booksyFee && Number(booksyFee) > 0 && (
                          <div className="flex justify-between">
                            <p className="text-sm text-muted-foreground">Booksy Fee</p>
                            <p className="text-sm font-medium">${Number(booksyFee).toFixed(2)}</p>
                          </div>
                        )}
                        {brokenEarringEnabled && (
                          <div className="flex justify-between">
                            <p className="text-sm text-muted-foreground">Broken Earring Loss</p>
                            <p className="text-sm font-medium">${Number(brokenEarringLoss || 0).toFixed(2)}</p>
                          </div>
                        )}
                        {taxEnabled && taxAmount && taxAmount > 0 && (
                          <div className="flex justify-between">
                            <p className="text-sm text-muted-foreground">Tax (8.5%)</p>
                            <p className="text-sm font-medium">${taxAmount.toFixed(2)}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Totals */}
                    <div className="border-t pt-3 mt-3 space-y-3">
                      {revenue > 0 && (
                        <div className="flex justify-between items-center">
                          <p className="text-sm font-semibold">To Pay</p>
                          <p className="text-xl font-bold">${revenue.toFixed(2)}</p>
                        </div>
                      )}
                      <FormField
                        control={form.control}
                        name="total_paid"
                        render={({ field }) => (
                          <FormItem>
                            <div className="flex justify-between items-center">
                              <FormLabel className="text-sm font-semibold">Total Paid</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={field.value === null || field.value === undefined ? '' : field.value}
                                  onChange={(e) => {
                                    const value = e.target.value
                                    if (value === '') {
                                      field.onChange(null)
                                    } else {
                                      const numValue = parseFloat(value)
                                      field.onChange(isNaN(numValue) ? null : numValue)
                                    }
                                  }}
                                  onBlur={(e) => {
                                    const value = e.target.value
                                    field.onBlur()
                                    if (value === '') {
                                      field.onChange(null)
                                    } else {
                                      const numValue = parseFloat(value)
                                      field.onChange(isNaN(numValue) ? null : numValue)
                                    }
                                  }}
                                  placeholder="0.00"
                                  className="text-xl font-bold h-10 w-32 text-right"
                                  name={field.name}
                                  ref={field.ref}
                                />
                              </FormControl>
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      {(totalPaidAmount > 0 || revenue > 0) && (
                        <>
                          {profitsAreEqual ? (
                            <div className="flex justify-between items-center">
                              <p className="text-sm font-semibold">Profit</p>
                              <p className={`text-xl font-bold ${realProfit < 0 ? 'text-red-600' : 'text-green-600'}`}>
                                ${realProfit.toFixed(2)}
                              </p>
                            </div>
                          ) : (
                            <>
                              {revenue > 0 && (
                                <div className="flex justify-between items-center">
                                  <p className="text-sm font-semibold">Projected Profit</p>
                                  <p className={`text-lg font-semibold ${projectedProfit < 0 ? 'text-red-600' : 'text-muted-foreground'}`}>
                                    ${projectedProfit.toFixed(2)}
                                  </p>
                                </div>
                              )}
                              {totalPaidAmount > 0 && (
                                <div className="flex justify-between items-center">
                                  <p className="text-sm font-semibold">Real Profit</p>
                                  <p className={`text-xl font-bold ${realProfit < 0 ? 'text-red-600' : 'text-green-600'}`}>
                                    ${realProfit.toFixed(2)}
                                  </p>
                                </div>
                              )}
                            </>
                          )}
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
            </div>
            </div>
          </form>
        </Form>
        
        <DialogFooter className="bg-background px-6 py-3 rounded-b-lg border-t">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button 
            type="button"
            onClick={form.handleSubmit(onSubmit)}
            disabled={loading || dataLoading}
          >
            {loading ? (
              <>
                <Loader size="sm" className="mr-2" />
                Saving...
              </>
            ) : booking ? (
              'Update Booking'
            ) : (
              'Create Booking'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
