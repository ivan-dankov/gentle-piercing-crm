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
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { createClient } from '@/lib/supabase/client'
import type { Booking, BookingWithRelations, Client, Earring, Service } from '@/lib/types'
import { CalendarIcon, Plus, Clock, Scissors, CreditCard, Check, ChevronsUpDown, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { Loader } from '@/components/ui/loader'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { EarringForm } from './earring-form'

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
  payment_method: z.enum(['cash', 'blik', 'card']),
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
  const [mostUsedEarrings, setMostUsedEarrings] = useState<Earring[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [currentStep, setCurrentStep] = useState(1)
  const [clientDetailsExpanded, setClientDetailsExpanded] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    if (open) {
      loadData()
      // Reset to step 1 when dialog opens
      setCurrentStep(1)
      // Auto-set time to next half hour for new bookings
      if (!booking) {
        form.setValue('start_time', defaultStartTime || getNextHalfHour())
      }
    }
  }, [open])

  const loadData = async () => {
    setDataLoading(true)
    try {
      const [clientsRes, earringsRes, servicesRes] = await Promise.all([
        supabase.from('clients').select('*').order('name'),
        supabase.from('earrings').select('*').eq('active', true).order('sold_qty', { ascending: false }),
        supabase.from('services').select('*').eq('active', true).order('name'),
      ])
      if (clientsRes.data) setClients(clientsRes.data)
      if (earringsRes.data) {
        setEarrings(earringsRes.data)
        // Get top 10 most used earrings
        setMostUsedEarrings(earringsRes.data.slice(0, 10))
      }
      if (servicesRes.data) {
        setServices(servicesRes.data)
      }
    } finally {
      setDataLoading(false)
    }
  }

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
    location: booking?.location || '',
    broken_earring_enabled: booking?.broken_earring_loss ? booking.broken_earring_loss > 0 : false,
    broken_earring_loss: booking?.broken_earring_loss ?? null,
    broken_earring_items: initialBrokenEarringItems,
    calculated_total: null,
    total_paid: booking?.total_paid ?? null,
    payment_method: (booking?.payment_method || 'cash') as 'cash' | 'blik' | 'card',
    tax_enabled: booking?.tax_enabled ?? false,
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
      setCurrentStep(1)
    } else if (open && booking?.id) {
      // When dialog opens with a booking, reset form with that booking's data
      form.reset(getDefaultValues())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, booking?.id])

  // Step navigation functions
  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        // Time is always set, client is optional
        return true
      case 2:
        // At least one service required
        const serviceItems = form.getValues('service_items') || []
        return serviceItems.some(item => item.service_id)
      case 3:
        // At least one earring required
        const earringItems = form.getValues('earring_items') || []
        return earringItems.some(item => item.earring_id)
      case 4:
        // Payment method is always set (defaults to cash)
        return true
      case 5:
        // Totals step - always valid
        return true
      default:
        return false
    }
  }

  const goToNextStep = () => {
    if (validateStep(currentStep) && currentStep < 5) {
      setCurrentStep(currentStep + 1)
    }
  }

  const goToPreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  // Auto-fill total_paid when reaching step 5
  useEffect(() => {
    if (currentStep === 5 && !form.getValues('total_paid')) {
      const calculated = form.getValues('calculated_total')
      if (calculated) {
        form.setValue('total_paid', calculated)
      }
    }
  }, [currentStep, form])

  // Watch fields for conditional rendering and auto-calculations
  const clientId = useWatch({ control: form.control, name: 'client_id' })
  const earringItems = useWatch({ control: form.control, name: 'earring_items' }) || []
  const serviceItems = useWatch({ control: form.control, name: 'service_items' }) || []
  const isModel = useWatch({ control: form.control, name: 'is_model' })
  const totalPaid = useWatch({ control: form.control, name: 'total_paid' })
  const taxEnabled = useWatch({ control: form.control, name: 'tax_enabled' })
  const taxRate = useWatch({ control: form.control, name: 'tax_rate' })
  const brokenEarringEnabled = useWatch({ control: form.control, name: 'broken_earring_enabled' })
  const brokenEarringLoss = useWatch({ control: form.control, name: 'broken_earring_loss' })
  const brokenEarringItems = useWatch({ control: form.control, name: 'broken_earring_items' }) || []
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

  // Auto-calculate total (service_price + earring_revenue)
  useEffect(() => {
    const sp = Number(totalServicePrice) || 0
    const er = Number(earringRevenue) || 0
    const calculated = sp + er
    if (calculated > 0) {
      form.setValue('calculated_total', calculated)
    } else {
      form.setValue('calculated_total', null)
    }
  }, [totalServicePrice, earringRevenue])

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
  // Revenue includes: Service Revenue + Earring Revenue
  // Costs include: Earring Cost + Booksy Fee + Broken Earring Loss + Tax
  const earringCost = Number(useWatch({ control: form.control, name: 'earring_cost' }) || 0)
  const taxAmount = Number(useWatch({ control: form.control, name: 'tax_amount'}) || 0)
  const bFee = booksyFeeEnabled ? (Number(booksyFee) || 0) : 0
  const bLoss = brokenEarringEnabled ? (Number(brokenEarringLoss) || 0) : 0
  // Calculate revenue on-the-fly for display (don't rely on calculatedTotal which might be null)
  // Revenue = Service Revenue + Earring Revenue
  const revenue = (Number(totalServicePrice) || 0) + (Number(earringRevenue) || 0)
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

  const addEarringByChip = (earringId: string) => {
    const earring = earrings.find(e => e.id === earringId)
    if (!earring) return
    
    const currentItems = form.getValues('earring_items') || []
    // Check if earring already added, if so increment qty
    const existingIndex = currentItems.findIndex(item => item.earring_id === earringId)
    if (existingIndex >= 0) {
      const updatedItems = [...currentItems]
      updatedItems[existingIndex] = {
        ...updatedItems[existingIndex],
        qty: (updatedItems[existingIndex].qty || 1) + 1
      }
      form.setValue('earring_items', updatedItems)
    } else {
      form.setValue('earring_items', [
        ...currentItems,
        { 
          id: Math.random().toString(), 
          earring_id: earringId, 
          qty: 1, 
          price: earring.sale_price 
        }
      ])
    }
  }

  const removeEarringItem = (id: string | undefined) => {
    const currentItems = form.getValues('earring_items') || []
    if (id) {
      form.setValue('earring_items', currentItems.filter(item => item.id !== id))
    }
  }

  const handleClientCreated = async (clientId?: string) => {
    if (clientId) {
      // Reload clients to get the new one
      const { data } = await supabase.from('clients').select('*').order('name')
      if (data) {
        setClients(data)
        form.setValue('client_id', clientId)
      }
    }
  }

  const handleEarringCreated = async () => {
    // Reload earrings to get the new one
    const { data } = await supabase
      .from('earrings')
      .select('*')
      .eq('active', true)
      .order('sold_qty', { ascending: false })
    if (data) {
      setEarrings(data)
      setMostUsedEarrings(data.slice(0, 10))
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

  const addServiceByChip = (serviceId: string) => {
    const service = services.find(s => s.id === serviceId)
    if (!service) return
    
    const currentItems = form.getValues('service_items') || []
    // Check if service already added
    if (currentItems.some(item => item.service_id === serviceId)) {
      return
    }
    
    form.setValue('service_items', [
      ...currentItems,
      { 
        id: Math.random().toString(), 
        service_id: serviceId, 
        price: isModel ? 0 : service.base_price 
      }
    ])
  }

  const removeServiceItem = (id: string | undefined) => {
    const currentItems = form.getValues('service_items') || []
    if (id) {
      form.setValue('service_items', currentItems.filter(item => item.id !== id))
    }
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
        travel_fee: 0,
        location: values.location || null,
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
      <DialogContent className="!max-w-[calc(100vw-1rem)] sm:!max-w-lg w-full max-h-[95dvh] flex flex-col p-0 gap-0 !top-1/2 !left-1/2 !-translate-x-1/2 !-translate-y-1/2">
        {dataLoading && (
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <Loader size="lg" />
              <p className="text-sm text-muted-foreground">Loading data...</p>
            </div>
          </div>
        )}
        <DialogHeader className="px-4 sm:px-6 pt-4 pb-3 border-b pr-12 sm:pr-14">
          <div className="flex items-center justify-between mb-3">
            <DialogTitle className="text-xl sm:text-2xl">{booking ? 'Edit Booking' : 'New Booking'}</DialogTitle>
            {revenue > 0 && (
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="text-lg font-semibold">${revenue.toFixed(2)}</p>
              </div>
            )}
          </div>
          <div className="flex items-center justify-center gap-2">
            {[1, 2, 3, 4, 5].map((step) => (
              <div
                key={step}
                className={cn(
                  "h-2 rounded-full transition-all",
                  step === currentStep
                    ? "w-8 bg-primary"
                    : step < currentStep
                    ? "w-2 bg-primary/50"
                    : "w-2 bg-muted"
                )}
              />
            ))}
            <span className="ml-2 text-xs text-muted-foreground">
              {currentStep}/5
            </span>
          </div>
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
              if (currentStep === 5) {
                form.handleSubmit(onSubmit)(e)
              } else {
                e.preventDefault()
                goToNextStep()
              }
            }}
            className="flex flex-col flex-1 min-h-0"
          >
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 pb-20">
              {/* Step 1: Time & Client */}
              {currentStep === 1 && (
                <div className="space-y-4">
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Time & Client
                  </h2>
                  <div className="space-y-4">
                        <FormField
                          control={form.control}
                          name="start_time"
                          render={({ field }) => (
                            <FormItem className="flex flex-col">
                              <FormLabel className="text-base">Date & Time</FormLabel>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <FormControl>
                                    <Button
                                      variant="outline"
                                      className="w-full h-12 pl-3 text-left font-normal text-base"
                                    >
                                      {field.value ? (
                                        format(field.value, 'PPP HH:mm')
                                      ) : (
                                        <span>Pick a date and time</span>
                                      )}
                                      <CalendarIcon className="ml-auto h-5 w-5 opacity-50" />
                                    </Button>
                                  </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                  <Calendar
                                    mode="single"
                                    selected={field.value}
                                    onSelect={field.onChange}
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
                                      className="h-10"
                                    />
                                  </div>
                                </PopoverContent>
                              </Popover>
                              {form.watch('end_time') && (
                                <p className="text-sm text-muted-foreground mt-2">
                                  Ends: {format(form.watch('end_time')!, 'HH:mm')}
                                </p>
                              )}
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="client_id"
                          render={({ field }) => {
                            const [popoverOpen, setPopoverOpen] = useState(false)
                            const selectedClient = clients.find(c => c.id === field.value)
                            
                            return (
                              <FormItem>
                                <FormLabel className="text-base">Client</FormLabel>
                                <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                                  <PopoverTrigger asChild>
                                    <FormControl>
                                      <Button
                                        variant="outline"
                                        role="combobox"
                                        aria-expanded={popoverOpen}
                                        className="w-full h-12 justify-between text-base"
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
                                  <PopoverContent 
                                    className="w-[var(--radix-popover-trigger-width)] p-0 max-h-[70vh] sm:max-h-[400px] overflow-hidden" 
                                    align="start"
                                  >
                                    <Command className="h-full">
                                      <CommandInput placeholder="Search by name or phone..." />
                                      <CommandList className="max-h-[calc(70vh-3rem)] sm:max-h-[350px]">
                                        <CommandEmpty>No client found.</CommandEmpty>
                                        <CommandGroup>
                                          <CommandItem
                                            value="new"
                                            onSelect={() => {
                                              field.onChange('new')
                                              setPopoverOpen(false)
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
                                          {clients.map((client) => (
                                            <CommandItem
                                              key={client.id}
                                              value={`${client.name} ${client.phone || ''}`.trim()}
                                              keywords={[client.id, client.name, client.phone || '']}
                                              onSelect={() => {
                                                field.onChange(client.id)
                                                setPopoverOpen(false)
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
                          <div className="space-y-4 pt-2">
                            <Button
                              type="button"
                              variant="outline"
                              className="w-full justify-between h-11"
                              onClick={() => setClientDetailsExpanded(!clientDetailsExpanded)}
                            >
                              <span>Client Details</span>
                              {clientDetailsExpanded ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </Button>
                            {clientDetailsExpanded && (
                              <div className="space-y-4">
                                <FormField
                                  control={form.control}
                                  name="client_name"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel className="text-base">Name</FormLabel>
                                      <FormControl>
                                        <Input 
                                          {...field} 
                                          placeholder="Client name"
                                          className="h-11 text-base"
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
                                      <FormLabel className="text-base">Phone</FormLabel>
                                      <FormControl>
                                        <Input 
                                          {...field} 
                                          placeholder="Phone number"
                                          className="h-11 text-base"
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
                                      <FormLabel className="text-base">Source</FormLabel>
                                      <Select
                                        onValueChange={(value) => field.onChange(value === 'none' ? null : value)}
                                        value={field.value || 'none'}
                                      >
                                        <FormControl>
                                          <SelectTrigger className="h-11 text-base">
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
                                      <FormLabel className="text-base">Notes</FormLabel>
                                      <FormControl>
                                        <Textarea 
                                          {...field} 
                                          placeholder="Client notes"
                                          className="text-base min-h-[100px]"
                                        />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </div>
                            )}
                          </div>
                        )}
                  </div>
                </div>
              )}

              {/* Step 2: Services */}
              {currentStep === 2 && (
                <div className="space-y-4">
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <Scissors className="h-5 w-5" />
                    Services
                  </h2>
                  <div className="space-y-4">
                        {/* Service Chips */}
                        <div>
                          <FormLabel className="text-base mb-3 block">Select Services</FormLabel>
                          <div className="flex flex-wrap gap-2">
                            {services.map((service) => {
                              const isSelected = serviceItems.some(item => item.service_id === service.id)
                              return (
                                <Badge
                                  key={service.id}
                                  variant={isSelected ? "default" : "outline"}
                                  className="h-11 px-4 text-base cursor-pointer hover:bg-primary/90 transition-colors"
                                  onClick={() => {
                                    if (isSelected) {
                                      const item = serviceItems.find(item => item.service_id === service.id)
                                      if (item?.id) {
                                        removeServiceItem(item.id)
                                      }
                                    } else {
                                      addServiceByChip(service.id)
                                    }
                                  }}
                                >
                                  {service.name}
                                  {service.duration_minutes > 0 && (
                                    <span className="ml-1 text-xs opacity-75">({service.duration_minutes}m)</span>
                                  )}
                                </Badge>
                              )
                            })}
                          </div>
                        </div>

                        {/* Selected Services */}
                        {serviceItems.filter(item => item.service_id).length > 0 && (
                          <div className="space-y-3 pt-4 border-t">
                            <FormLabel className="text-base">Selected Services</FormLabel>
                            {serviceItems.filter(item => item.service_id).map((item, index) => {
                              const actualIndex = serviceItems.findIndex(si => si.id === item.id)
                              const selectedService = services.find(s => s.id === item.service_id)
                              return (
                                <div key={item.id || index} className="p-3 border rounded-lg space-y-3">
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <p className="font-medium">{selectedService?.name}</p>
                                      {selectedService && (
                                        <p className="text-sm text-muted-foreground">
                                          {selectedService.duration_minutes} min
                                        </p>
                                      )}
                                    </div>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => removeServiceItem(item.id)}
                                      className="h-9 w-9"
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </div>
                                  <FormField
                                    control={form.control}
                                    name={`service_items.${actualIndex}.price`}
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel className="text-sm">Price</FormLabel>
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
                                            className={isModel || !item.service_id ? 'opacity-50' : 'h-10'}
                                            placeholder="0.00"
                                            name={field.name}
                                            ref={field.ref}
                                          />
                                        </FormControl>
                                      </FormItem>
                                    )}
                                  />
                                </div>
                              )
                            })}
                          </div>
                        )}

                        {/* Model Session */}
                        <FormField
                          control={form.control}
                          name="is_model"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                              <div className="space-y-0.5">
                                <FormLabel className="text-base">Model Session</FormLabel>
                                <p className="text-sm text-muted-foreground">Set service prices to 0</p>
                              </div>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={(checked) => {
                                    field.onChange(checked)
                                    handleModelToggle(checked)
                                  }}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                  </div>
                </div>
              )}

              {/* Step 3: Earrings */}
              {currentStep === 3 && (
                <div className="space-y-4">
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <Scissors className="h-5 w-5" />
                    Earrings
                  </h2>
                  <div className="space-y-4">
                        {/* Most Used Earrings Chips */}
                        {mostUsedEarrings.length > 0 && (
                          <div>
                            <div className="flex items-center justify-between mb-3">
                              <FormLabel className="text-base">Most Used</FormLabel>
                              <EarringForm onSuccess={handleEarringCreated}>
                                <Button type="button" variant="outline" size="sm" className="h-9">
                                  <Plus className="h-4 w-4 mr-2" />
                                  Create Earring
                                </Button>
                              </EarringForm>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {mostUsedEarrings.map((earring) => {
                                const selectedItem = earringItems.find(item => item.earring_id === earring.id)
                                return (
                                  <Badge
                                    key={earring.id}
                                    variant={selectedItem ? "default" : "outline"}
                                    className="h-11 px-4 text-base cursor-pointer hover:bg-primary/90 transition-colors"
                                    onClick={() => addEarringByChip(earring.id)}
                                  >
                                    {earring.name}
                                    {selectedItem && (
                                      <span className="ml-2 text-xs opacity-75">x{selectedItem.qty}</span>
                                    )}
                                  </Badge>
                                )
                              })}
                            </div>
                          </div>
                        )}

                        {/* All Earrings Search */}
                        <div className="pt-4 border-t">
                          <FormLabel className="text-base mb-3 block">Search All Earrings</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className="w-full h-12 justify-between text-base"
                                type="button"
                              >
                                <span>Search or add earring...</span>
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent 
                              className="w-[var(--radix-popover-trigger-width)] p-0 max-h-[70vh] sm:max-h-[400px] overflow-hidden" 
                              align="start"
                            >
                              <Command className="h-full">
                                <CommandInput placeholder="Search earrings..." />
                                <CommandList className="max-h-[calc(70vh-3rem)] sm:max-h-[350px]">
                                  <CommandEmpty>No earring found.</CommandEmpty>
                                  <CommandGroup>
                                    {earrings.map((earring) => (
                                      <CommandItem
                                        key={earring.id}
                                        value={earring.name}
                                        keywords={[earring.id, earring.name]}
                                        onSelect={() => {
                                          addEarringByChip(earring.id)
                                        }}
                                      >
                                        {earring.name}
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                        </div>

                        {/* Selected Earrings */}
                        {earringItems.filter(item => item.earring_id).length > 0 && (
                          <div className="space-y-3 pt-4 border-t">
                            <FormLabel className="text-base">Selected Earrings</FormLabel>
                            {earringItems.filter(item => item.earring_id).map((item, index) => {
                              const actualIndex = earringItems.findIndex(ei => ei.id === item.id)
                              const selectedEarring = earrings.find(e => e.id === item.earring_id)
                              return (
                                <div key={item.id || index} className="p-3 border rounded-lg space-y-3">
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <p className="font-medium">{selectedEarring?.name}</p>
                                      {selectedEarring && (
                                        <p className="text-sm text-muted-foreground">
                                          ${selectedEarring.sale_price.toFixed(2)} each
                                        </p>
                                      )}
                                    </div>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => removeEarringItem(item.id)}
                                      className="h-9 w-9"
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </div>
                                  <div className="grid grid-cols-2 gap-3">
                                    <FormField
                                      control={form.control}
                                      name={`earring_items.${actualIndex}.qty`}
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel className="text-sm">Quantity</FormLabel>
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
                                              className="h-10"
                                              name={field.name}
                                              ref={field.ref}
                                            />
                                          </FormControl>
                                        </FormItem>
                                      )}
                                    />
                                    <FormField
                                      control={form.control}
                                      name={`earring_items.${actualIndex}.price`}
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel className="text-sm">Price</FormLabel>
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
                                              className="h-10"
                                              placeholder={selectedEarring ? selectedEarring.sale_price.toFixed(2) : "0.00"}
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
                        )}
                  </div>
                </div>
              )}

              {/* Step 4: Payment */}
              {currentStep === 4 && (
                <div className="space-y-4">
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Payment
                  </h2>
                  <div className="space-y-4">
                        {/* Payment Method */}
                        <FormField
                          control={form.control}
                          name="payment_method"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-base mb-3 block">Payment Method</FormLabel>
                              <FormControl>
                                <div className="grid grid-cols-3 gap-3">
                                  <Button
                                    type="button"
                                    variant={field.value === 'cash' ? 'default' : 'outline'}
                                    className="h-14 text-base"
                                    onClick={() => field.onChange('cash')}
                                  >
                                    Cash
                                  </Button>
                                  <Button
                                    type="button"
                                    variant={field.value === 'blik' ? 'default' : 'outline'}
                                    className="h-14 text-base"
                                    onClick={() => field.onChange('blik')}
                                  >
                                    Personal BLIK
                                  </Button>
                                  <Button
                                    type="button"
                                    variant={field.value === 'card' ? 'default' : 'outline'}
                                    className="h-14 text-base"
                                    onClick={() => field.onChange('card')}
                                  >
                                    Card
                                  </Button>
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {/* Tax Settings */}
                        <FormField
                          control={form.control}
                          name="tax_enabled"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                              <div className="space-y-0.5">
                                <FormLabel className="text-base">Tax (8.5%)</FormLabel>
                                <p className="text-sm text-muted-foreground">Apply tax to payment</p>
                              </div>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />

                        {/* Booksy Fee */}
                        <FormField
                          control={form.control}
                          name="booksy_fee_enabled"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                              <div className="space-y-0.5">
                                <FormLabel className="text-base">Booksy Fee</FormLabel>
                                <p className="text-sm text-muted-foreground">43.05% of first service</p>
                              </div>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                  </div>
                </div>
              )}

              {/* Step 5: Totals */}
              {currentStep === 5 && (
                <div className="space-y-4">
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Totals
                  </h2>
                  <div className="space-y-4">
                        {/* Revenue Breakdown */}
                        <div>
                          <p className="text-base font-semibold mb-3">Revenue</p>
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
                          </div>
                        </div>

                        {/* Costs Breakdown */}
                        <div className="border-t pt-3 mt-3">
                          <p className="text-base font-semibold mb-3">Costs</p>
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
                        <div className="border-t pt-4 mt-4 space-y-4">
                          {revenue > 0 && (
                            <div className="flex justify-between items-center">
                              <p className="text-base font-semibold">To Pay</p>
                              <p className="text-2xl font-bold">${revenue.toFixed(2)}</p>
                            </div>
                          )}
                          <FormField
                            control={form.control}
                            name="total_paid"
                            render={({ field }) => (
                              <FormItem>
                                <div className="flex justify-between items-center">
                                  <FormLabel className="text-base font-semibold">Total Paid</FormLabel>
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
                                      className="text-xl font-bold h-12 w-40 text-right"
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
                                  <p className="text-base font-semibold">Profit</p>
                                  <p className={`text-2xl font-bold ${realProfit < 0 ? 'text-red-600' : 'text-green-600'}`}>
                                    ${realProfit.toFixed(2)}
                                  </p>
                                </div>
                              ) : (
                                <>
                                  {revenue > 0 && (
                                    <div className="flex justify-between items-center">
                                      <p className="text-base font-semibold">Projected Profit</p>
                                      <p className={`text-lg font-semibold ${projectedProfit < 0 ? 'text-red-600' : 'text-muted-foreground'}`}>
                                        ${projectedProfit.toFixed(2)}
                                      </p>
                                    </div>
                                  )}
                                  {totalPaidAmount > 0 && (
                                    <div className="flex justify-between items-center">
                                      <p className="text-base font-semibold">Real Profit</p>
                                      <p className={`text-2xl font-bold ${realProfit < 0 ? 'text-red-600' : 'text-green-600'}`}>
                                        ${realProfit.toFixed(2)}
                                      </p>
                                    </div>
                                  )}
                                </>
                              )}
                            </>
                          )}
                        </div>
                  </div>
                </div>
              )}
            </div>
          </form>
        </Form>
        
        <DialogFooter className="bg-background px-4 sm:px-6 py-3 rounded-b-lg border-t flex flex-col sm:flex-row gap-3">
          {currentStep > 1 && (
            <Button
              type="button"
              variant="outline"
              onClick={goToPreviousStep}
              disabled={loading}
              className="w-full sm:w-auto"
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>
          )}
          <div className="flex gap-3 flex-1 sm:flex-initial sm:ml-auto">
            {currentStep < 5 ? (
              <Button 
                type="button"
                onClick={(e) => {
                  e.preventDefault()
                  goToNextStep()
                }}
                disabled={loading || dataLoading || !validateStep(currentStep)}
                className="w-full sm:w-auto"
              >
                Next
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button 
                type="button"
                onClick={form.handleSubmit(onSubmit)}
                disabled={loading || dataLoading}
                className="w-full sm:w-auto"
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
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
