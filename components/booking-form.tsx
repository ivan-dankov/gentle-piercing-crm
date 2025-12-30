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
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { createClient } from '@/lib/supabase/client'
import type { Booking, BookingWithRelations, Client, Product, Service } from '@/lib/types'
import { CalendarIcon, Plus, Clock, Scissors, CreditCard, Check, ChevronsUpDown, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { Loader } from '@/components/ui/loader'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { ProductForm } from './product-form'

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

interface ProductItem {
  id: string
  product_id: string
  qty: number
  price?: number | null
}

interface BrokenProductItem {
  id: string
  product_id: string
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
  product_items: z.array(z.object({
    id: z.string().optional(),
    product_id: z.union([z.string().uuid(), z.literal('')]),
    qty: z.number().int().min(1),
    price: z.number().min(0).nullable().optional(),
  })).superRefine((items, ctx) => {
    const validItems = items.filter(item => item.product_id && item.product_id.trim() !== '')
    if (validItems.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'At least one product is required',
        path: [],
      })
    }
    // Validate each non-empty item has a valid UUID
    items.forEach((item, index) => {
      if (item.product_id && item.product_id.trim() !== '') {
        const uuidResult = z.string().uuid().safeParse(item.product_id)
        if (!uuidResult.success) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Invalid product ID',
            path: [index, 'product_id'],
          })
        }
      }
    })
  }),
  service_items: z.array(z.object({
    id: z.string().optional(),
    service_id: z.union([z.string().uuid(), z.literal('')]),
    price: z.number().min(0).nullable().optional(),
  })).superRefine((items, ctx) => {
    const validItems = items.filter(item => item.service_id && item.service_id.trim() !== '')
    if (validItems.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'At least one service is required',
        path: [],
      })
    }
    // Validate each non-empty item has a valid UUID
    items.forEach((item, index) => {
      if (item.service_id && item.service_id.trim() !== '') {
        const uuidResult = z.string().uuid().safeParse(item.service_id)
        if (!uuidResult.success) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Invalid service ID',
            path: [index, 'service_id'],
          })
        }
      }
    })
  }),
  is_model: z.boolean(),
  earring_cost: z.number().min(0).nullable().optional(),
  earring_revenue: z.number().min(0).nullable().optional(),
  location: z.string().optional(),
  broken_product_enabled: z.boolean(),
  broken_product_loss: z.number().min(0).nullable().optional(),
  broken_product_items: z.array(z.object({
    id: z.string().optional(),
    product_id: z.string().uuid(),
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
  booksy_fee_base: z.number().min(0).nullable().optional(),
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
  const [products, setProducts] = useState<Product[]>([])
  const [mostUsedProducts, setMostUsedProducts] = useState<Product[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [currentStep, setCurrentStep] = useState(1)
  const [clientDetailsExpanded, setClientDetailsExpanded] = useState(false)
  const [productSearchOpen, setProductSearchOpen] = useState(false)
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

  // Focus search input when product search drawer opens
  useEffect(() => {
    if (productSearchOpen) {
      // Small delay to ensure drawer is fully rendered
      const timer = setTimeout(() => {
        const input = document.querySelector('[data-product-search-input]') as HTMLInputElement
        input?.focus()
      }, 150)
      return () => clearTimeout(timer)
    }
  }, [productSearchOpen])

  const loadData = async () => {
    setDataLoading(true)
    try {
      const [clientsRes, productsRes, servicesRes] = await Promise.all([
        supabase.from('clients').select('*').order('name'),
        supabase.from('products').select('*').eq('active', true).order('sold_qty', { ascending: false }),
        supabase.from('services').select('*').eq('active', true).order('name'),
      ])
      if (clientsRes.data) setClients(clientsRes.data)
      if (productsRes.data) {
        setProducts(productsRes.data)
        // Get top 10 most used products
        setMostUsedProducts(productsRes.data.slice(0, 10))
      }
      if (servicesRes.data) {
        setServices(servicesRes.data)
      }
    } finally {
      setDataLoading(false)
    }
  }

  // Initialize product items from junction table or legacy field
  const initialProductItems: ProductItem[] = booking?.booking_products && booking.booking_products.length > 0
    ? booking.booking_products.map((be: { id: string; product_id: string; qty: number; price?: number | null }) => ({
        id: be.id,
        product_id: be.product_id,
        qty: be.qty || 1,
        price: be.price ?? null,
      }))
    : booking?.earring_id
      ? [{
          id: Math.random().toString(),
          product_id: booking.earring_id,
          qty: booking.earring_qty || 1,
          price: null,
        }]
      : []

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
      : []

  // Initialize broken product items from junction table or empty array
  const initialBrokenProductItems: BrokenProductItem[] = booking?.booking_broken_products && booking.booking_broken_products.length > 0
    ? booking.booking_broken_products.map((be) => ({
        id: be.id,
        product_id: be.product_id,
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
    product_items: initialProductItems,
    service_items: initialServiceItems,
    is_model: booking?.is_model || false,
    earring_cost: booking?.earring_cost ?? null,
    earring_revenue: booking?.earring_revenue ?? null,
    location: booking?.location || '',
    broken_product_enabled: booking?.broken_earring_loss ? booking.broken_earring_loss > 0 : false,
    broken_product_loss: booking?.broken_earring_loss ?? null,
    broken_product_items: initialBrokenProductItems,
    calculated_total: null,
    total_paid: booking?.total_paid ?? null,
    payment_method: (booking?.payment_method || 'cash') as 'cash' | 'blik' | 'card',
    tax_enabled: booking?.tax_enabled ?? false,
    tax_rate: 8.5, // Always 8.5%
    tax_amount: booking?.tax_amount ?? null,
    booksy_fee_enabled: booking?.client?.source === 'booksy' ? (booking.booksy_fee ? booking.booksy_fee > 0 : true) : (booking?.booksy_fee ? booking.booksy_fee > 0 : false),
    booksy_fee_base: null, // Will be auto-set from first service price, can be customized
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
        // At least one product required
        const productItems = form.getValues('product_items') || []
        return productItems.some(item => item.product_id)
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
  const productItems = useWatch({ control: form.control, name: 'product_items' }) || []
  const serviceItems = useWatch({ control: form.control, name: 'service_items' }) || []
  const isModel = useWatch({ control: form.control, name: 'is_model' })
  const totalPaid = useWatch({ control: form.control, name: 'total_paid' })
  const taxEnabled = useWatch({ control: form.control, name: 'tax_enabled' })
  const taxRate = useWatch({ control: form.control, name: 'tax_rate' })
  const brokenProductEnabled = useWatch({ control: form.control, name: 'broken_product_enabled' })
  const brokenProductLoss = useWatch({ control: form.control, name: 'broken_product_loss' })
  const brokenProductItems = useWatch({ control: form.control, name: 'broken_product_items' }) || []
  const booksyFeeEnabled = useWatch({ control: form.control, name: 'booksy_fee_enabled' })
  const booksyFeeBase = useWatch({ control: form.control, name: 'booksy_fee_base' })
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


  // Calculate product totals from all product items
  useEffect(() => {
    if (productItems.length > 0 && productItems.some(item => item.product_id)) {
      let totalCost = 0
      let totalRevenue = 0
      
      productItems.forEach(item => {
        if (item.product_id) {
          const product = products.find(e => e.id === item.product_id)
          if (product) {
            const cost = (product.cost || 0) * item.qty
            // Use override price if available, otherwise use sale_price
            const unitPrice = item.price !== null && item.price !== undefined ? item.price : product.sale_price
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
  }, [productItems, products, form])

  // Auto-add broken product item when enabled
  useEffect(() => {
    if (brokenProductEnabled && products.length > 0 && brokenProductItems.length === 0) {
      const firstProduct = products[0]
      form.setValue('broken_product_items', [{
        id: Math.random().toString(),
        product_id: firstProduct.id,
        qty: 1,
        cost: firstProduct.cost || 0,
      }])
    }
  }, [brokenProductEnabled, products, brokenProductItems.length, form])

  // Calculate broken product loss from broken product items
  useEffect(() => {
    if (brokenProductItems.length > 0 && brokenProductItems.some(item => item.product_id)) {
      let totalLoss = 0
      
      brokenProductItems.forEach(item => {
        if (item.product_id) {
          const product = products.find(e => e.id === item.product_id)
          if (product) {
            // Use override cost if available, otherwise use base cost
            const unitCost = item.cost !== null && item.cost !== undefined ? item.cost : (product.cost || 0)
            totalLoss += unitCost * item.qty
          }
        }
      })
      
      form.setValue('broken_product_loss', totalLoss)
    } else {
      form.setValue('broken_product_loss', null)
    }
  }, [brokenProductItems, products, form])

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
  const productRevenue = form.watch('earring_revenue') || 0 // Keep field name for DB compatibility
  const totalServicePrice = serviceItems.reduce((sum, item) => sum + (Number(item.price) || 0), 0)

  // Auto-calculate total (service_price + product_revenue)
  useEffect(() => {
    const sp = Number(totalServicePrice) || 0
    const er = Number(productRevenue) || 0
    const calculated = sp + er
    if (calculated > 0) {
      form.setValue('calculated_total', calculated)
    } else {
      form.setValue('calculated_total', null)
    }
  }, [totalServicePrice, productRevenue])

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

  // Auto-set booksy fee base from first service price
  useEffect(() => {
    if (serviceItems.length > 0 && serviceItems[0].service_id && serviceItems[0].price !== null && serviceItems[0].price !== undefined) {
      const firstServicePrice = serviceItems[0].price || 0
      // Only set base if it's not already set or if it's null
      if (booksyFeeBase === null || booksyFeeBase === undefined) {
        form.setValue('booksy_fee_base', firstServicePrice)
      }
    }
  }, [serviceItems, form])

  // Auto-calculate booksy fee (43.05% of base amount)
  useEffect(() => {
    if (booksyFeeEnabled && booksyFeeBase !== null && booksyFeeBase !== undefined) {
      const calculatedFee = booksyFeeBase * 0.4305
      form.setValue('booksy_fee', calculatedFee)
    } else if (!booksyFeeEnabled) {
      form.setValue('booksy_fee', null)
    }
  }, [booksyFeeEnabled, booksyFeeBase, form])

  // Calculate profit (revenue - costs)
  // Revenue includes: Service Revenue + Product Revenue
  // Costs include: Product Cost + Booksy Fee + Broken Product Loss + Tax
  const productCost = Number(useWatch({ control: form.control, name: 'earring_cost' }) || 0) // Keep field name for DB compatibility
  const taxAmount = Number(useWatch({ control: form.control, name: 'tax_amount'}) || 0)
  const bFee = booksyFeeEnabled ? (Number(booksyFee) || 0) : 0
  const bLoss = brokenProductEnabled ? (Number(brokenProductLoss) || 0) : 0
  // Calculate revenue on-the-fly for display (don't rely on calculatedTotal which might be null)
  // Revenue = Service Revenue + Product Revenue
  const revenue = (Number(totalServicePrice) || 0) + (Number(productRevenue) || 0)
  const totalPaidAmount = Number(totalPaid) || 0
  const totalCosts = productCost + bFee + bLoss + taxAmount
  const projectedProfit = revenue - totalCosts
  const realProfit = totalPaidAmount - totalCosts
  const profitsAreEqual = Math.abs(projectedProfit - realProfit) < 0.01 // Account for floating point precision

  const addProductItem = () => {
    const currentItems = form.getValues('product_items') || []
    form.setValue('product_items', [
      ...currentItems,
      { id: Math.random().toString(), product_id: '', qty: 1, price: null }
    ])
  }

  const addProductByChip = (productId: string) => {
    const product = products.find(e => e.id === productId)
    if (!product) return
    
    const currentItems = form.getValues('product_items') || []
    // Check if product already added, if so increment qty
    const existingIndex = currentItems.findIndex(item => item.product_id === productId)
    if (existingIndex >= 0) {
      const updatedItems = [...currentItems]
      updatedItems[existingIndex] = {
        ...updatedItems[existingIndex],
        qty: (updatedItems[existingIndex].qty || 1) + 1
      }
      form.setValue('product_items', updatedItems)
    } else {
      form.setValue('product_items', [
        ...currentItems,
        { 
          id: Math.random().toString(), 
          product_id: productId, 
          qty: 1, 
          price: product.sale_price 
        }
      ])
    }
  }

  const removeProductItem = (id: string | undefined) => {
    const currentItems = form.getValues('product_items') || []
    if (id) {
      form.setValue('product_items', currentItems.filter(item => item.id !== id))
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

  const handleProductCreated = async () => {
    // Reload products to get the new one
    const { data } = await supabase
      .from('products')
      .select('*')
      .eq('active', true)
      .order('sold_qty', { ascending: false })
    if (data) {
      setProducts(data)
      setMostUsedProducts(data.slice(0, 10))
    }
  }

  const addBrokenProductItem = () => {
    const currentItems = form.getValues('broken_product_items') || []
    const firstProduct = products.length > 0 ? products[0] : null
    form.setValue('broken_product_items', [
      ...currentItems,
      { 
        id: Math.random().toString(), 
        product_id: firstProduct ? firstProduct.id : '', 
        qty: 1, 
        cost: firstProduct ? (firstProduct.cost || 0) : null 
      }
    ])
  }

  const removeBrokenProductItem = (id: string | undefined) => {
    const currentItems = form.getValues('broken_product_items') || []
    if (id) {
      form.setValue('broken_product_items', currentItems.filter(item => item.id !== id))
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
    console.log('onSubmit called with values:', values)
    setLoading(true)
    try {
      console.log('Step 1: Getting current user...')
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError) {
        console.error('Error getting user:', userError)
        throw userError
      }
      if (!user) {
        throw new Error('You must be logged in to create a booking')
      }
      console.log('Step 2: User authenticated:', user.id)

      // Calculate aggregated totals
      console.log('Step 3: Calculating totals...')
      const totalServicePrice = values.service_items.reduce((sum, item) => sum + (Number(item.price) || 0), 0)
      console.log('Total service price:', totalServicePrice)
      
      // Handle client creation if "new" is selected
      let finalClientId: string | null = null
      if (values.client_id === 'new') {
        console.log('Step 4: Creating new client...')
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
          
          if (clientError) {
            console.error('Error creating client:', clientError)
            throw clientError
          }
          // @ts-expect-error - Supabase types issue
          finalClientId = newClient.id
          console.log('Client created with ID:', finalClientId)
        }
      } else {
        finalClientId = values.client_id || null
        console.log('Using existing client ID:', finalClientId)
      }
      
      // Convert empty/null values to 0 for number fields
      console.log('Step 5: Preparing booking data...')
      const bookingData = {
        client_id: finalClientId,
        // Keep legacy fields for backward compatibility (will be null/0)
        earring_id: null, // Keep legacy field name for database compatibility
        earring_qty: 0,
        service_id: null,
        service_price: totalServicePrice,
        is_model: values.is_model || false,
        earring_cost: values.earring_cost ?? 0,
        earring_revenue: values.earring_revenue ?? 0,
        travel_fee: 0,
        location: values.location || null,
        booksy_fee: values.booksy_fee_enabled ? (values.booksy_fee ?? 0) : 0,
        broken_earring_loss: values.broken_product_enabled ? (values.broken_product_loss ?? 0) : 0,
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
        // Costs = Product Cost + Booksy Fee + Broken Product Loss + Tax
        profit: (values.total_paid ?? 0) - ((values.earring_cost ?? 0) + (values.booksy_fee_enabled ? (values.booksy_fee ?? 0) : 0) + (values.broken_product_enabled ? (values.broken_product_loss ?? 0) : 0) + (values.tax_amount ?? 0)),
      }
      console.log('Booking data prepared:', bookingData)

      let bookingId: string

      if (booking) {
        console.log('Step 6: Updating existing booking...')
        const { data: updatedBooking, error } = await supabase
          .from('bookings')
          // @ts-expect-error - Supabase types issue
          .update(bookingData)
          .eq('id', booking.id)
          .select()
          .single()
        if (error) {
          console.error('Error updating booking:', error)
          throw error
        }
        // @ts-expect-error - Supabase types issue
        bookingId = updatedBooking.id
        console.log('Booking updated with ID:', bookingId)

        // Delete existing junction table entries
        console.log('Step 7: Deleting existing junction table entries...')
        await supabase.from('booking_products').delete().eq('booking_id', bookingId)
        await supabase.from('booking_services').delete().eq('booking_id', bookingId)
        await supabase.from('booking_broken_products').delete().eq('booking_id', bookingId)
      } else {
        console.log('Step 6: Creating new booking...')
        const { data: newBooking, error } = await supabase
          .from('bookings')
          // @ts-expect-error - Supabase types issue
          .insert([{ ...bookingData, user_id: user.id }])
          .select()
          .single()
        if (error) {
          console.error('Error creating booking:', error)
          throw error
        }
        // @ts-expect-error - Supabase types issue
        bookingId = newBooking.id
        console.log('Booking created with ID:', bookingId)
      }

      // Insert product items (filter out any with empty IDs)
      console.log('Step 7: Inserting product items...')
      const validProductItems = values.product_items.filter(item => item.product_id && item.product_id.trim() !== '')
      console.log('Valid product items:', validProductItems.length)
      if (validProductItems.length > 0) {
        const productItems = validProductItems
          .map(item => ({
            booking_id: bookingId,
            product_id: item.product_id,
            qty: item.qty || 1,
            price: item.price ?? null,
            user_id: user.id,
          }))
        
        if (productItems.length > 0) {
          const { error: productError } = await supabase
            .from('booking_products')
            // @ts-expect-error - Supabase types issue
            .insert(productItems)
          if (productError) {
            console.error('Error inserting product items:', productError)
            throw productError
          }
          console.log('Product items inserted successfully')
        }
      }

      // Insert service items (filter out any with empty IDs)
      console.log('Step 8: Inserting service items...')
      const validServiceItems = values.service_items.filter(item => item.service_id && item.service_id.trim() !== '')
      console.log('Valid service items:', validServiceItems.length)
      if (validServiceItems.length > 0) {
        const serviceItems = validServiceItems
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
          if (serviceError) {
            console.error('Error inserting service items:', serviceError)
            throw serviceError
          }
          console.log('Service items inserted successfully')
        }
      }

      // Insert broken product items (only if feature is enabled)
      if (values.broken_product_enabled && values.broken_product_items && values.broken_product_items.length > 0) {
        console.log('Step 9: Inserting broken product items...')
        const brokenProductItems = values.broken_product_items
          .filter(item => item.product_id)
          .map(item => ({
            booking_id: bookingId,
            product_id: item.product_id,
            qty: item.qty || 1,
            cost: item.cost ?? null,
            user_id: user.id,
          }))
        
        if (brokenProductItems.length > 0) {
          const { error: brokenProductError } = await supabase
            .from('booking_broken_products')
            // @ts-expect-error - Supabase types issue
            .insert(brokenProductItems)
          if (brokenProductError) {
            console.error('Error inserting broken product items:', brokenProductError)
            throw brokenProductError
          }
        }
      }
      console.log('Step 10: Booking saved successfully!')
      setOpen(false)
      form.reset(getDefaultValues())
      router.refresh()
    } catch (error) {
      console.error('Error saving booking:', error)
      console.error('Error type:', typeof error)
      console.error('Error details:', JSON.stringify(error, null, 2))
      
      let errorMessage = 'Failed to save booking'
      
      if (error instanceof Error) {
        errorMessage = error.message || 'An unknown error occurred'
      } else if (typeof error === 'object' && error !== null) {
        const err = error as any
        // Handle Supabase errors - they have a specific structure
        if (err.message) {
          errorMessage = err.message
        } else if (err.error) {
          errorMessage = typeof err.error === 'string' ? err.error : err.error?.message || 'Unknown error'
        } else if (err.code) {
          errorMessage = `Error ${err.code}: ${err.message || err.details || 'Unknown error'}`
        } else if (err.details) {
          errorMessage = err.details
        } else if (err.hint) {
          errorMessage = err.hint
        } else {
          // Try to stringify the error object to see what's in it
          try {
            const errorStr = JSON.stringify(error)
            if (errorStr !== '{}') {
              errorMessage = `Error: ${errorStr}`
            } else {
              errorMessage = 'An unknown error occurred. Please check the console for details.'
            }
          } catch {
            errorMessage = 'An unknown error occurred. Please check the console for details.'
          }
        }
      }
      
      console.error('Final error message:', errorMessage)
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
              e.preventDefault()
              // Prevent form submission when clicking on Google Places suggestions
              const target = e.target as HTMLElement
              if (target.closest('.pac-container')) {
                e.stopPropagation()
                return false
              }
              if (currentStep === 5) {
                console.log('Form submitted on step 5, calling handleSubmit')
                const handleSubmitResult = form.handleSubmit(
                  (data) => {
                    console.log('Validation passed, calling onSubmit')
                    onSubmit(data)
                  },
                  (errors) => {
                    console.error('Form validation errors:', errors)
                    // Find first error field and scroll to it
                    const firstErrorField = Object.keys(errors)[0]
                    if (firstErrorField) {
                      const errorElement = document.querySelector(`[name="${firstErrorField}"]`) || 
                                          document.querySelector(`[id="${firstErrorField}"]`)
                      if (errorElement) {
                        errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
                        ;(errorElement as HTMLElement).focus()
                      }
                    }
                  }
                )
                handleSubmitResult(e)
              } else {
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
                                    className="w-[var(--radix-popover-trigger-width)] p-0 max-h-[70vh] sm:max-h-[400px] overflow-y-auto" 
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
                                            onFocus={(e) => e.target.select()}
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

              {/* Step 3: Products */}
              {currentStep === 3 && (
                <div className="space-y-4">
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <Scissors className="h-5 w-5" />
                    Products
                  </h2>
                  <div className="space-y-4">
                        {/* Most Used Products Chips */}
                        {mostUsedProducts.length > 0 && (
                          <div>
                            <div className="flex items-center justify-between mb-3">
                              <FormLabel className="text-base">Most Used</FormLabel>
                              <ProductForm onSuccess={handleProductCreated}>
                                <Button type="button" variant="outline" size="sm" className="h-9">
                                  <Plus className="h-4 w-4 mr-2" />
                                  Create Product
                                </Button>
                              </ProductForm>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {mostUsedProducts.map((product) => {
                                const selectedItem = productItems.find(item => item.product_id === product.id)
                                return (
                                  <Badge
                                    key={product.id}
                                    variant={selectedItem ? "default" : "outline"}
                                    className="h-11 px-4 text-base cursor-pointer hover:bg-primary/90 transition-colors max-w-[462px]"
                                    onClick={() => addProductByChip(product.id)}
                                  >
                                    <div className="flex items-center gap-2 w-full min-w-0">
                                      <span className="truncate flex-1 min-w-0">{product.name}</span>
                                      {product.sku && (
                                        <span className="text-xs opacity-60">({product.sku})</span>
                                      )}
                                      <span className="text-xs opacity-75">${product.sale_price.toFixed(2)}</span>
                                      {selectedItem && (
                                        <span className="text-xs opacity-75">x{selectedItem.qty}</span>
                                      )}
                                    </div>
                                  </Badge>
                                )
                              })}
                            </div>
                          </div>
                        )}

                        {/* All Products Search */}
                        <div className="pt-4 border-t">
                          <FormLabel className="text-base mb-3 block">Search All Products</FormLabel>
                          <Drawer open={productSearchOpen} onOpenChange={setProductSearchOpen}>
                            <DrawerTrigger asChild>
                              <Button
                                variant="outline"
                                className="w-full h-12 justify-between text-base"
                                type="button"
                              >
                                <span>Search or add product...</span>
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </DrawerTrigger>
                            <DrawerContent className="max-h-[90vh]">
                              <DrawerHeader className="pb-2">
                                <DrawerTitle>Search Products</DrawerTitle>
                                <DrawerDescription>Browse by name or SKU</DrawerDescription>
                              </DrawerHeader>
                              <div className="p-4 pt-0 flex-1 overflow-y-auto min-h-0">
                                <div className="rounded-md border bg-background h-full">
                                  <Command className="h-full">
                                    <CommandInput 
                                      placeholder="Search products by name or SKU..." 
                                      autoFocus
                                      data-product-search-input
                                    />
                                    <CommandList className="max-h-[60vh]">
                                      <CommandEmpty>No product found.</CommandEmpty>
                                      <CommandGroup>
                                        {products.map((product) => (
                                          <CommandItem
                                            key={product.id}
                                            value={`${product.name}${product.sku ? ` ${product.sku}` : ''}`}
                                            keywords={[product.id, product.name, product.sku || ''].filter(Boolean)}
                                            onSelect={() => {
                                              addProductByChip(product.id)
                                              setProductSearchOpen(false)
                                            }}
                                          >
                                            <div className="flex items-center justify-between w-full">
                                              <div>
                                                <span>{product.name}</span>
                                                {product.sku && (
                                                  <span className="ml-2 text-xs text-muted-foreground">SKU: {product.sku}</span>
                                                )}
                                              </div>
                                              <span className="ml-auto text-sm text-muted-foreground">${product.sale_price.toFixed(2)}</span>
                                            </div>
                                          </CommandItem>
                                        ))}
                                      </CommandGroup>
                                    </CommandList>
                                  </Command>
                                </div>
                              </div>
                            </DrawerContent>
                          </Drawer>
                        </div>

                        {/* Selected Products */}
                        {productItems.filter(item => item.product_id).length > 0 && (
                          <div className="space-y-3 pt-4 border-t">
                            <FormLabel className="text-base">Selected Products</FormLabel>
                            {productItems.filter(item => item.product_id).map((item, index) => {
                              const actualIndex = productItems.findIndex(ei => ei.id === item.id)
                              const selectedProduct = products.find(e => e.id === item.product_id)
                              return (
                                <div key={item.id || index} className="p-3 border rounded-lg space-y-3">
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <p className="font-medium">{selectedProduct?.name}</p>
                                      {selectedProduct && (
                                        <>
                                          {selectedProduct.sku && (
                                            <p className="text-xs text-muted-foreground">SKU: {selectedProduct.sku}</p>
                                          )}
                                          <p className="text-sm text-muted-foreground">
                                            ${selectedProduct.sale_price.toFixed(2)} each
                                          </p>
                                        </>
                                      )}
                                    </div>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => removeProductItem(item.id)}
                                      className="h-9 w-9"
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </div>
                                  <div className="grid grid-cols-2 gap-3">
                                    <FormField
                                      control={form.control}
                                      name={`product_items.${actualIndex}.qty`}
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
                                              onFocus={(e) => e.target.select()}
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
                                      name={`product_items.${actualIndex}.price`}
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
                                              onFocus={(e) => e.target.select()}
                                              className="h-10"
                                              placeholder={selectedProduct ? selectedProduct.sale_price.toFixed(2) : "0.00"}
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
                            <FormItem className="space-y-3">
                              <div className="flex flex-row items-center justify-between rounded-lg border p-4">
                                <div className="space-y-0.5">
                                  <FormLabel className="text-base">Booksy Fee</FormLabel>
                                  <p className="text-sm text-muted-foreground">43.05% of base amount</p>
                                </div>
                                <FormControl>
                                  <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                              </div>
                              {field.value && (
                                <FormField
                                  control={form.control}
                                  name="booksy_fee_base"
                                  render={({ field: baseField }) => (
                                    <FormItem>
                                      <FormLabel className="text-sm">Base Amount</FormLabel>
                                      <FormControl>
                                        <Input
                                          type="number"
                                          step="0.01"
                                          value={baseField.value === null || baseField.value === undefined ? '' : baseField.value}
                                          onChange={(e) => {
                                            const value = e.target.value
                                            baseField.onChange(value === '' ? null : (value === '' ? '' : value))
                                          }}
                                          onBlur={(e) => {
                                            const value = e.target.value
                                            baseField.onBlur()
                                            if (value === '') {
                                              baseField.onChange(null)
                                            } else {
                                              const numValue = parseFloat(value)
                                              baseField.onChange(isNaN(numValue) ? null : numValue)
                                            }
                                          }}
                                          onFocus={(e) => e.target.select()}
                                          className="h-10"
                                          placeholder="0.00"
                                          name={baseField.name}
                                          ref={baseField.ref}
                                        />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              )}
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
                            {productRevenue > 0 && (
                              <div className="flex justify-between">
                                <p className="text-sm text-muted-foreground">Product Revenue</p>
                                <p className="text-sm font-medium">${Number(productRevenue).toFixed(2)}</p>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Costs Breakdown */}
                        <div className="border-t pt-3 mt-3">
                          <p className="text-base font-semibold mb-3">Costs</p>
                          <div className="space-y-2 pl-2">
                            {productCost > 0 && (
                              <div className="flex justify-between">
                                <p className="text-sm text-muted-foreground">Product Cost</p>
                                <p className="text-sm font-medium">${productCost.toFixed(2)}</p>
                              </div>
                            )}
                            {booksyFeeEnabled && booksyFee && Number(booksyFee) > 0 && (
                              <div className="flex justify-between">
                                <p className="text-sm text-muted-foreground">Booksy Fee</p>
                                <p className="text-sm font-medium">${Number(booksyFee).toFixed(2)}</p>
                              </div>
                            )}
                            {brokenProductEnabled && (
                              <div className="flex justify-between">
                                <p className="text-sm text-muted-foreground">Broken Product Loss</p>
                                <p className="text-sm font-medium">${Number(brokenProductLoss || 0).toFixed(2)}</p>
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
                                      onFocus={(e) => e.target.select()}
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
                type="submit"
                disabled={loading || dataLoading}
                onClick={async (e) => {
                  e.preventDefault()
                  console.log('Create/Update button clicked')
                  const values = form.getValues()
                  console.log('Form values:', values)
                  console.log('Form state:', {
                    currentStep,
                    serviceItems: values.service_items,
                    productItems: values.product_items,
                    errors: form.formState.errors,
                    isValid: form.formState.isValid
                  })
                  
                  // Trigger validation manually
                  const isValid = await form.trigger()
                  console.log('Validation result:', isValid)
                  console.log('Validation errors:', form.formState.errors)
                  
                  if (isValid) {
                    console.log('Form is valid, submitting...')
                    form.handleSubmit(onSubmit)()
                  } else {
                    console.log('Form validation failed, showing errors')
                    // Find first error field (handle nested paths like "product_items.0.product_id")
                    const findFirstError = (errors: any, path = ''): string | null => {
                      for (const key in errors) {
                        const currentPath = path ? `${path}.${key}` : key
                        if (errors[key]?.message) {
                          return currentPath
                        }
                        if (typeof errors[key] === 'object' && errors[key] !== null) {
                          const nested = findFirstError(errors[key], currentPath)
                          if (nested) return nested
                        }
                      }
                      return null
                    }
                    
                    const firstErrorPath = findFirstError(form.formState.errors)
                    if (firstErrorPath) {
                      console.log('First error path:', firstErrorPath)
                      // Try to find element by name (convert path to name format)
                      const nameSelector = firstErrorPath.replace(/\./g, '\\.').replace(/\[(\d+)\]/g, '.$1')
                      const errorElement = document.querySelector(`[name="${firstErrorPath}"]`) || 
                                          document.querySelector(`[name="${nameSelector}"]`) ||
                                          document.querySelector(`[id="${firstErrorPath}"]`)
                      if (errorElement) {
                        errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
                        ;(errorElement as HTMLElement).focus()
                      } else {
                        // Scroll to the step with the error
                        if (firstErrorPath.startsWith('product_items')) {
                          setCurrentStep(3)
                        } else if (firstErrorPath.startsWith('service_items')) {
                          setCurrentStep(2)
                        } else if (firstErrorPath.startsWith('client')) {
                          setCurrentStep(1)
                        }
                      }
                    }
                  }
                }}
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
