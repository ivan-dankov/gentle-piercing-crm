'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import { Separator } from '@/components/ui/separator'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { BookingForm } from './booking-form'
import { DeleteBookingButton } from './delete-booking-button'
import { Edit } from 'lucide-react'
import type { BookingWithRelations } from '@/lib/types'
import { Clock, User, Scissors, CreditCard } from 'lucide-react'

interface BookingDetailsDrawerProps {
  booking: BookingWithRelations
  open: boolean
  onOpenChange: (open: boolean) => void
  onBookingUpdate?: (updatedBooking: BookingWithRelations) => void
}

export function BookingDetailsDrawer({ booking, open, onOpenChange, onBookingUpdate }: BookingDetailsDrawerProps) {
  const [currentBooking, setCurrentBooking] = useState(booking)

  useEffect(() => {
    setCurrentBooking(booking)
  }, [booking])

  const handleBookingUpdate = (updatedBooking: BookingWithRelations) => {
    setCurrentBooking(updatedBooking)
    onBookingUpdate?.(updatedBooking)
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction="right">
      <DrawerContent className="h-screen w-full sm:max-w-2xl flex flex-col">
        <DrawerHeader className="border-b flex-shrink-0">
          <div className="flex items-center justify-between">
            <DrawerTitle>Booking Details</DrawerTitle>
            <div className="flex gap-2">
              <BookingForm booking={currentBooking}>
                <Button variant="outline" size="icon">
                  <Edit className="h-4 w-4" />
                </Button>
              </BookingForm>
              <DeleteBookingButton 
                bookingId={currentBooking.id} 
                onDelete={() => onOpenChange(false)}
              />
            </div>
          </div>
        </DrawerHeader>
        <div className="p-6 space-y-4 overflow-y-auto flex-1 min-h-0">
            {/* Date & Time */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Clock className="h-4 w-4" />
                  Date & Time
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div>
                  <p className="text-sm text-muted-foreground">Start Time</p>
                  <p className="font-medium">{format(new Date(currentBooking.start_time), 'PPP HH:mm')}</p>
                </div>
                {currentBooking.end_time && (
                  <div>
                    <p className="text-sm text-muted-foreground">End Time</p>
                    <p className="font-medium">{format(new Date(currentBooking.end_time), 'HH:mm')}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Client */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <User className="h-4 w-4" />
                  Client
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div>
                  <p className="text-sm text-muted-foreground">Name</p>
                  <p className="font-medium">{currentBooking.client?.name || 'No Client'}</p>
                </div>
                {currentBooking.client?.phone && (
                  <div>
                    <p className="text-sm text-muted-foreground">Phone</p>
                    <p className="font-medium">{currentBooking.client.phone}</p>
                  </div>
                )}
                {currentBooking.client?.source && (
                  <div>
                    <p className="text-sm text-muted-foreground">Source</p>
                    <p className="font-medium capitalize">{currentBooking.client.source}</p>
                  </div>
                )}
                {currentBooking.client?.notes && (
                  <div>
                    <p className="text-sm text-muted-foreground">Notes</p>
                    <p className="font-medium whitespace-pre-wrap">{currentBooking.client.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Services */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Scissors className="h-4 w-4" />
                  Services
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {currentBooking.booking_services && currentBooking.booking_services.length > 0 ? (
                  currentBooking.booking_services.map((bs, idx) => (
                    <div key={bs.id || idx} className="p-3 border rounded-lg bg-muted/30">
                      <div className="space-y-2">
                        <div>
                          <p className="text-xs text-muted-foreground">Service Name</p>
                          <p className="font-medium text-sm">{bs.service?.name || 'Unknown Service'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Price</p>
                          <p className="font-semibold text-base">${bs.price.toFixed(2)}</p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : currentBooking.service ? (
                  <div className="p-3 border rounded-lg bg-muted/30">
                    <div className="space-y-2">
                      <div>
                        <p className="text-xs text-muted-foreground">Service Name</p>
                        <p className="font-medium text-sm">{currentBooking.service.name}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Price</p>
                        <p className="font-semibold text-base">${currentBooking.service_price.toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No services</p>
                )}
                <Separator className="my-3" />
                <div>
                  <p className="text-sm text-muted-foreground">Model Session</p>
                  <p className="font-medium">{currentBooking.is_model ? 'Yes' : 'No'}</p>
                </div>
                {currentBooking.travel_fee > 0 && (
                  <>
                    <Separator className="my-3" />
                    <div>
                      <p className="text-sm text-muted-foreground">Travel Fee</p>
                      <p className="font-medium">${currentBooking.travel_fee.toFixed(2)}</p>
                    </div>
                    {currentBooking.location && (
                      <div>
                        <p className="text-sm text-muted-foreground">Location</p>
                        <p className="font-medium">{currentBooking.location}</p>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            {/* Products */}
            {(currentBooking.booking_products && currentBooking.booking_products.length > 0) || currentBooking.product ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Products</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {currentBooking.booking_products && currentBooking.booking_products.length > 0 ? (
                    currentBooking.booking_products.map((be, idx) => {
                      const product = be.product
                      if (!product) return null
                      const cost = (product.cost || 0) * be.qty
                      // Use price override if available, otherwise use sale_price
                      const unitPrice = be.price !== null && be.price !== undefined ? be.price : product.sale_price
                      const totalPrice = unitPrice * be.qty
                      return (
                        <div key={be.id || idx} className="p-3 border rounded-lg bg-muted/30">
                          <div className="space-y-2">
                            <div>
                              <p className="text-xs text-muted-foreground">Product Name</p>
                              <p className="font-medium text-sm">{product.name}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <p className="text-xs text-muted-foreground">Quantity</p>
                                <p className="font-medium text-sm">{be.qty}</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Unit Price</p>
                                <p className="font-medium text-sm">
                                  ${unitPrice.toFixed(2)} {be.price !== null && be.price !== undefined && be.price !== product.sale_price && (
                                    <span className="text-xs text-muted-foreground">(override)</span>
                                  )}
                                </p>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2 pt-2 border-t">
                              <div>
                                <p className="text-xs text-muted-foreground">Total Price</p>
                                <p className="font-semibold text-base">${totalPrice.toFixed(2)}</p>
                              </div>
                              {cost > 0 && (
                                <div>
                                  <p className="text-xs text-muted-foreground">Cost</p>
                                  <p className="font-semibold text-base">${cost.toFixed(2)}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })
                  ) : currentBooking.product ? (
                    <div className="p-3 border rounded-lg bg-muted/30">
                      <div className="space-y-2">
                        <div>
                          <p className="text-xs text-muted-foreground">Product Name</p>
                          <p className="font-medium text-sm">{currentBooking.product?.name}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Quantity</p>
                          <p className="font-medium text-sm">{currentBooking.earring_qty || 0}</p>
                        </div>
                        {currentBooking.earring_cost && currentBooking.earring_cost > 0 && (
                          <div>
                            <p className="text-xs text-muted-foreground">Cost</p>
                            <p className="font-semibold text-base">${currentBooking.earring_cost.toFixed(2)}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            ) : null}

            {/* Broken Earrings */}
            {(currentBooking.booking_broken_products && currentBooking.booking_broken_products.length > 0) || currentBooking.broken_earring_loss > 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Broken Products</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {currentBooking.booking_broken_products && currentBooking.booking_broken_products.length > 0 ? (
                    currentBooking.booking_broken_products.map((be, idx) => {
                      const product = be.product
                      if (!product) {
                        // If product relation is not loaded, try to show what we can
                        return (
                          <div key={be.id || idx} className="p-3 border rounded-lg bg-muted/30">
                            <div className="space-y-2">
                              <div>
                                <p className="text-xs text-muted-foreground">Product ID</p>
                                <p className="font-medium text-sm">{be.product_id}</p>
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <p className="text-xs text-muted-foreground">Quantity</p>
                                  <p className="font-medium text-sm">{be.qty}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground">Unit Cost</p>
                                  <p className="font-medium text-sm">${(be.cost || 0).toFixed(2)}</p>
                                </div>
                              </div>
                              <div className="pt-2 border-t">
                                <p className="text-xs text-muted-foreground">Total Cost</p>
                                <p className="font-semibold text-base">${((be.cost || 0) * be.qty).toFixed(2)}</p>
                              </div>
                            </div>
                          </div>
                        )
                      }
                      // Use cost override if available, otherwise use product.cost
                      const unitCost = be.cost !== null && be.cost !== undefined ? be.cost : (product.cost || 0)
                      const totalCost = unitCost * be.qty
                      return (
                        <div key={be.id || idx} className="p-3 border rounded-lg bg-muted/30">
                          <div className="space-y-2">
                            <div>
                              <p className="text-xs text-muted-foreground">Product Name</p>
                              <p className="font-medium text-sm">{product.name}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <p className="text-xs text-muted-foreground">Quantity</p>
                                <p className="font-medium text-sm">{be.qty}</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Unit Cost</p>
                                <p className="font-medium text-sm">
                                  ${unitCost.toFixed(2)} {be.cost !== null && be.cost !== undefined && be.cost !== (product.cost || 0) && (
                                    <span className="text-xs text-muted-foreground">(override)</span>
                                  )}
                                </p>
                              </div>
                            </div>
                            <div className="pt-2 border-t">
                              <p className="text-xs text-muted-foreground">Total Cost</p>
                              <p className="font-semibold text-base text-red-600">${totalCost.toFixed(2)}</p>
                            </div>
                          </div>
                        </div>
                      )
                    })
                  ) : currentBooking.broken_earring_loss > 0 ? (
                    <div className="p-3 border rounded-lg bg-muted/30">
                      <div>
                        <p className="text-xs text-muted-foreground">Total Loss</p>
                        <p className="font-semibold text-base text-red-600">${currentBooking.broken_earring_loss.toFixed(2)}</p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No broken earrings</p>
                  )}
                </CardContent>
              </Card>
            ) : null}

            {/* Payment & Financial */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <CreditCard className="h-4 w-4" />
                  Payment & Financial
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div>
                  <p className="text-sm text-muted-foreground">Payment Method</p>
                  <p className="font-medium capitalize">{currentBooking.payment_method || 'N/A'}</p>
                </div>
                
                {/* Revenue Breakdown */}
                <div className="border-t pt-3 mt-3">
                  <p className="text-sm font-semibold mb-2">Revenue</p>
                  <div className="space-y-1 pl-2">
                    {/* Calculate total service revenue from all services */}
                    {(() => {
                      const totalServiceRevenue = currentBooking.booking_services?.reduce((sum, bs) => sum + (bs.price || 0), 0) || currentBooking.service_price || 0
                      return totalServiceRevenue > 0 ? (
                        <div className="flex justify-between">
                          <p className="text-sm text-muted-foreground">Service Revenue</p>
                          <p className="font-medium">${totalServiceRevenue.toFixed(2)}</p>
                        </div>
                      ) : null
                    })()}
                    {/* Calculate total product revenue from all products (using price override if available) */}
                    {(() => {
                      const totalProductRevenue = currentBooking.booking_products?.reduce((sum, be) => {
                        const product = be.product
                        if (!product) return sum
                        // Use price override if available, otherwise use sale_price
                        const unitPrice = be.price !== null && be.price !== undefined ? be.price : product.sale_price
                        return sum + (unitPrice * be.qty)
                      }, 0) || currentBooking.earring_revenue || 0
                      return totalProductRevenue > 0 ? (
                        <div className="flex justify-between">
                          <p className="text-sm text-muted-foreground">Product Revenue</p>
                          <p className="font-medium">${totalProductRevenue.toFixed(2)}</p>
                        </div>
                      ) : null
                    })()}
                    {currentBooking.travel_fee > 0 && (
                      <div className="flex justify-between">
                        <p className="text-sm text-muted-foreground">Travel Fee</p>
                        <p className="font-medium">${currentBooking.travel_fee.toFixed(2)}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Costs Breakdown */}
                <div className="border-t pt-3 mt-3">
                  <p className="text-sm font-semibold mb-2">Costs</p>
                  <div className="space-y-1 pl-2">
                    {/* Calculate total product cost from all products */}
                    {(() => {
                      const totalProductCost = currentBooking.booking_products?.reduce((sum, be) => {
                        const product = be.product
                        if (!product) return sum
                        const cost = (product.cost || 0) * be.qty
                        return sum + cost
                      }, 0) || currentBooking.earring_cost || 0
                      return totalProductCost > 0 ? (
                        <div className="flex justify-between">
                          <p className="text-sm text-muted-foreground">Product Cost</p>
                          <p className="font-medium">${totalProductCost.toFixed(2)}</p>
                        </div>
                      ) : null
                    })()}
                    {currentBooking.booksy_fee > 0 && (
                      <div className="flex justify-between">
                        <p className="text-sm text-muted-foreground">Booksy Fee (43.05%)</p>
                        <p className="font-medium">${currentBooking.booksy_fee.toFixed(2)}</p>
                      </div>
                    )}
                    {/* Calculate broken product loss from junction table or legacy field */}
                    {(() => {
                      const brokenProductLoss = currentBooking.booking_broken_products?.reduce((sum, be) => {
                        const product = be.product
                        if (!product) return sum
                        // Use cost override if available, otherwise use product.cost
                        const unitCost = be.cost !== null && be.cost !== undefined ? be.cost : (product.cost || 0)
                        return sum + (unitCost * be.qty)
                      }, 0) || currentBooking.broken_earring_loss || 0
                      return brokenProductLoss > 0 ? (
                        <div className="flex justify-between">
                          <p className="text-sm text-muted-foreground">Broken Product Loss</p>
                          <p className="font-medium">${brokenProductLoss.toFixed(2)}</p>
                        </div>
                      ) : null
                    })()}
                    {currentBooking.tax_enabled && currentBooking.tax_amount > 0 && (
                      <div className="flex justify-between">
                        <p className="text-sm text-muted-foreground">Tax (8.5%)</p>
                        <p className="font-medium">${currentBooking.tax_amount.toFixed(2)}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Totals */}
                <div className="border-t pt-3 mt-3 space-y-2">
                  {(() => {
                    const totalServiceRevenue = currentBooking.booking_services?.reduce((sum, bs) => sum + (bs.price || 0), 0) || currentBooking.service_price || 0
                    const totalProductRevenue = currentBooking.booking_products?.reduce((sum, be) => {
                      const product = be.product
                      if (!product) return sum
                      // Use price override if available, otherwise use sale_price
                      const unitPrice = be.price !== null && be.price !== undefined ? be.price : product.sale_price
                      return sum + (unitPrice * be.qty)
                    }, 0) || currentBooking.earring_revenue || 0
                    const travelFee = currentBooking.travel_fee || 0
                    const revenue = totalServiceRevenue + totalProductRevenue + travelFee
                    
                    // Calculate costs
                    const totalProductCost = currentBooking.booking_products?.reduce((sum, be) => {
                      const product = be.product
                      if (!product) return sum
                      return sum + ((product.cost || 0) * be.qty)
                    }, 0) || currentBooking.earring_cost || 0
                    const brokenProductLoss = currentBooking.booking_broken_products?.reduce((sum, be) => {
                      const product = be.product
                      if (!product) return sum
                      const unitCost = be.cost !== null && be.cost !== undefined ? be.cost : (product.cost || 0)
                      return sum + (unitCost * be.qty)
                    }, 0) || currentBooking.broken_earring_loss || 0
                    const totalCosts = totalProductCost + (currentBooking.booksy_fee || 0) + brokenProductLoss + (currentBooking.tax_amount || 0)
                    
                    const projectedProfit = revenue - totalCosts
                    const realProfit = (currentBooking.total_paid || 0) - totalCosts
                    const profitsAreEqual = Math.abs(projectedProfit - realProfit) < 0.01
                    
                    return (
                      <>
                        {revenue > 0 && (
                          <div className="flex justify-between items-center">
                            <p className="text-sm font-semibold">To Pay</p>
                            <p className="text-xl font-bold">${revenue.toFixed(2)}</p>
                          </div>
                        )}
                        <div className="flex justify-between items-center">
                          <p className="text-sm font-semibold">Total Paid</p>
                          <p className="text-xl font-bold">${currentBooking.total_paid.toFixed(2)}</p>
                        </div>
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
                            {currentBooking.total_paid > 0 && (
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
                    )
                  })()}
                </div>
              </CardContent>
            </Card>

            {/* Notes */}
            {currentBooking.notes && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm whitespace-pre-wrap">{currentBooking.notes}</p>
                </CardContent>
              </Card>
            )}
        </div>
      </DrawerContent>
    </Drawer>
  )
}

