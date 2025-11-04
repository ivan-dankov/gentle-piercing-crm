'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
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
import { Checkbox } from '@/components/ui/checkbox'
import { createClient } from '@/lib/supabase/client'
import type { Service } from '@/lib/types'

const serviceSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  duration_minutes: z.preprocess(
    (val) => val === '' || val === null || val === undefined ? undefined : Number(val),
    z.number().min(1, 'Duration must be at least 1 minute')
  ),
  base_price: z.preprocess(
    (val) => val === '' || val === null || val === undefined ? undefined : Number(val),
    z.number().min(0, 'Price must be non-negative')
  ),
  active: z.boolean(),
})

type ServiceFormValues = z.infer<typeof serviceSchema>

interface ServiceFormProps {
  service?: Service
  children: React.ReactNode
}

export function ServiceForm({ service, children }: ServiceFormProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  // Cast service to any to handle Supabase's dynamic typing
  const serviceData = service as any

  const form = useForm<ServiceFormValues>({
    // @ts-expect-error - react-hook-form type inference issue with zod
    resolver: zodResolver(serviceSchema),
    defaultValues: {
      name: serviceData?.name || '',
      duration_minutes: serviceData?.duration_minutes || 30,
      base_price: serviceData?.base_price || 0,
      active: serviceData?.active ?? true,
    },
  })

  const onSubmit = async (values: ServiceFormValues) => {
    setLoading(true)
    try {
      if (serviceData) {
        const { error } = await supabase
          .from('services')
          // @ts-expect-error - Supabase types issue
          .update(values)
          .eq('id', serviceData.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('services')
          // @ts-expect-error - Supabase types issue
          .insert([values])
        if (error) throw error
      }
      setOpen(false)
      form.reset()
      router.refresh()
    } catch (error) {
      console.error('Error saving service:', error)
      alert('Failed to save service')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{serviceData ? 'Edit Service' : 'Add New Service'}</DialogTitle>
          <DialogDescription>
            {serviceData ? 'Update service information' : 'Add a new service to the system'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          {/* @ts-ignore - react-hook-form type inference issue */}
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* @ts-ignore - react-hook-form type inference issue */}
            <FormField
              // @ts-ignore
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="e.g., Two ears (child)" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {/* @ts-ignore - react-hook-form type inference issue */}
            <FormField
              // @ts-ignore
              control={form.control}
              name="duration_minutes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Duration (minutes)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
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
                          field.onChange(isNaN(numValue) ? undefined : numValue)
                        }
                      }}
                      name={field.name}
                      ref={field.ref}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {/* @ts-ignore - react-hook-form type inference issue */}
            <FormField
              // @ts-ignore
              control={form.control}
              name="base_price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Base Price</FormLabel>
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
                          field.onChange(undefined)
                        } else {
                          const numValue = parseFloat(value)
                          field.onChange(isNaN(numValue) ? undefined : numValue)
                        }
                      }}
                      name={field.name}
                      ref={field.ref}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {/* @ts-ignore - react-hook-form type inference issue */}
            <FormField
              // @ts-ignore
              control={form.control}
              name="active"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Active</FormLabel>
                  </div>
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Saving...' : serviceData ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

