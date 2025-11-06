'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
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
import { Loader } from '@/components/ui/loader'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { CalendarIcon } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const additionalCostSchema = z.object({
  type: z.enum(['rent', 'ads', 'print', 'consumables', 'other']),
  amount: z.number().min(0.01, 'Amount must be greater than 0'),
  date: z.date(),
  description: z.string().optional(),
})

type AdditionalCostFormValues = z.infer<typeof additionalCostSchema>

interface AdditionalCost {
  id: string
  type: 'rent' | 'ads' | 'print' | 'consumables' | 'other'
  amount: number
  date: string
  description: string | null
}

interface AdditionalCostFormProps {
  cost?: AdditionalCost
  children: React.ReactNode
  onSuccess?: () => void | Promise<void>
}

export function AdditionalCostForm({ cost, children, onSuccess }: AdditionalCostFormProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const form = useForm<AdditionalCostFormValues>({
    resolver: zodResolver(additionalCostSchema),
    defaultValues: {
      type: cost?.type || 'rent',
      amount: cost?.amount || 0,
      date: cost?.date ? new Date(cost.date) : new Date(),
      description: cost?.description || '',
    },
  })

  const onSubmit = async (values: AdditionalCostFormValues) => {
    setLoading(true)
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('You must be logged in to create an additional cost')
      }

      const costData = {
        type: values.type,
        amount: values.amount,
        date: format(values.date, 'yyyy-MM-dd'),
        description: values.description || null,
        user_id: user.id,
      }

      if (cost) {
        const { error } = await supabase
          .from('additional_costs')
          // @ts-expect-error - Supabase types issue
          .update(costData)
          .eq('id', cost.id)
        if (error) throw error
        setOpen(false)
        form.reset()
        router.refresh()
        onSuccess?.()
      } else {
        const { error } = await supabase
          .from('additional_costs')
          // @ts-expect-error - Supabase types issue
          .insert([costData])
        if (error) throw error
        setOpen(false)
        form.reset({
          type: 'rent',
          amount: 0,
          date: new Date(),
          description: '',
        })
        router.refresh()
        onSuccess?.()
      }
    } catch (error) {
      console.error('Error saving additional cost:', error)
      alert(error instanceof Error ? error.message : 'Failed to save additional cost')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{cost ? 'Edit Additional Cost' : 'Add Additional Cost'}</DialogTitle>
          <DialogDescription>
            {cost ? 'Update the additional cost information.' : 'Add a new business cost (rent, ads, print, consumables, etc.).'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="rent">Rent</SelectItem>
                      <SelectItem value="ads">Ads</SelectItem>
                      <SelectItem value="print">Print</SelectItem>
                      <SelectItem value="consumables">Consumables</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      min="0.01"
                      placeholder="0.00"
                      value={field.value === 0 ? '' : field.value}
                      onChange={(e) => {
                        const value = e.target.value
                        field.onChange(value === '' ? 0 : parseFloat(value))
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className="w-full pl-3 text-left font-normal"
                        >
                          {field.value ? (
                            format(field.value, 'PPP')
                          ) : (
                            <span>Pick a date</span>
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
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Add any notes about this cost..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
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
                ) : cost ? (
                  'Update Cost'
                ) : (
                  'Add Cost'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

