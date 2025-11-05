'use client'

import { useState, useEffect } from 'react'
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
import { Loader } from '@/components/ui/loader'
import { createClient } from '@/lib/supabase/client'
import type { Earring } from '@/lib/types'

const earringSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  category: z.string().optional(),
  cost: z.preprocess(
    (val) => val === '' || val === null || val === undefined ? null : Number(val),
    z.number().min(0).optional().nullable()
  ),
  sale_price: z.preprocess(
    (val) => val === '' || val === null || val === undefined ? undefined : Number(val),
    z.number().min(0, 'Sale price is required')
  ),
  stock_qty: z.preprocess(
    (val) => val === '' || val === null || val === undefined ? undefined : Number(val),
    z.number().int().min(0)
  ),
  sold_qty: z.preprocess(
    (val) => val === '' || val === null || val === undefined ? undefined : Number(val),
    z.number().int().min(0)
  ),
  active: z.boolean(),
})

type EarringFormValues = z.infer<typeof earringSchema>

interface EarringFormProps {
  earring?: Earring
  children: React.ReactNode
}

export function EarringForm({ earring, children }: EarringFormProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  // Cast earring to any to handle Supabase's dynamic typing
  const earringData = earring as any

  const getDefaultValues = (): EarringFormValues => ({
    name: earringData?.name || '',
    category: earringData?.category || '',
    cost: earringData?.cost ?? null,
    sale_price: earringData?.sale_price || 0,
    stock_qty: earringData?.stock_qty || 0,
    sold_qty: earringData?.sold_qty || 0,
    active: earringData?.active ?? true,
  })

  const form = useForm<EarringFormValues>({
    // @ts-expect-error - react-hook-form type inference issue with zod
    resolver: zodResolver(earringSchema),
    defaultValues: getDefaultValues(),
  })

  // Reset form when dialog opens or earring changes
  useEffect(() => {
    if (open) {
      form.reset(getDefaultValues())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, earringData?.id])

  const onSubmit = async (values: EarringFormValues) => {
    setLoading(true)
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('You must be logged in to create an earring')
      }

      if (earringData) {
        const { error } = await supabase
          .from('earrings')
          // @ts-expect-error - Supabase types issue
          .update(values)
          .eq('id', earringData.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('earrings')
          // @ts-expect-error - Supabase types issue
          .insert([{ ...values, user_id: user.id }])
        if (error) throw error
      }
      setOpen(false)
      form.reset(getDefaultValues())
      router.refresh()
    } catch (error: any) {
      console.error('Error saving earring:', error)
      const errorMessage = error?.message || 'Failed to save earring'
      alert(`Failed to save earring: ${errorMessage}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{earringData ? 'Edit Earring' : 'Add New Earring'}</DialogTitle>
          <DialogDescription>
            {earringData ? 'Update earring information' : 'Add a new earring to inventory'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          {/* @ts-expect-error - react-hook-form type inference issue */}
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                // @ts-ignore
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                // @ts-ignore
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            {/* @ts-ignore - react-hook-form type inference issue */}
            <FormField
              // @ts-ignore
              control={form.control}
              name="cost"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cost</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      value={field.value === null || field.value === undefined ? '' : field.value}
                      onChange={(e) => {
                        const value = e.target.value
                        field.onChange(value === '' ? null : value)
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
                      name={field.name}
                      ref={field.ref}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                // @ts-ignore
                control={form.control}
                name="sale_price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sale Price</FormLabel>
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
              <FormField
                // @ts-ignore
                control={form.control}
                name="stock_qty"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stock Quantity</FormLabel>
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
            </div>
            {/* @ts-ignore - react-hook-form type inference issue */}
            <FormField
              // @ts-ignore
              control={form.control}
              name="sold_qty"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sold Quantity</FormLabel>
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
                {loading ? (
                  <>
                    <Loader size="sm" className="mr-2" />
                    Saving...
                  </>
                ) : earring ? (
                  'Update'
                ) : (
                  'Create'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

