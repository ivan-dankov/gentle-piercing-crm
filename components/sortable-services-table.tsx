'use client'

import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { SortableTableHeader, SortDirection } from '@/components/sortable-table-header'
import { ServiceForm } from '@/components/service-form'
import { DeleteServiceButton } from '@/components/delete-service-button'

interface Service {
  id: string
  name: string
  duration_minutes: number
  base_price: number
  active: boolean
}

interface SortableServicesTableProps {
  services: Service[]
}

export function SortableServicesTable({ services }: SortableServicesTableProps) {
  const [sortKey, setSortKey] = useState<string | null>('created_at')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDirection('asc')
    }
  }

  const sortedServices = useMemo(() => {
    if (!sortKey || sortKey === 'created_at') {
      return [...services].reverse()
    }

    return [...services].sort((a, b) => {
      let aValue: any = a[sortKey as keyof Service]
      let bValue: any = b[sortKey as keyof Service]

      if (aValue === null || aValue === undefined) return 1
      if (bValue === null || bValue === undefined) return -1

      if (typeof aValue === 'number') {
        if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
        if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
        return 0
      }

      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase()
        bValue = bValue.toLowerCase()
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
      return 0
    })
  }, [services, sortKey, sortDirection])

  return (
    <>
      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {sortedServices.map((service) => (
          <Card key={service.id}>
            <CardContent className="pt-4">
              <div className="space-y-3">
                <div>
                  <h3 className="font-semibold text-lg">{service.name}</h3>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Duration:</span>
                    <span>{service.duration_minutes} min</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Base Price:</span>
                    <span>${service.base_price.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status:</span>
                    <Badge variant={service.active ? 'default' : 'secondary'}>
                      {service.active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <ServiceForm service={service}>
                    <Button variant="outline" size="sm" className="flex-1">Edit</Button>
                  </ServiceForm>
                  <DeleteServiceButton service={service} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      {/* Desktop Table View */}
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <SortableTableHeader
                sortKey="name"
                currentSortKey={sortKey}
                sortDirection={sortDirection}
                onSort={handleSort}
              >
                Name
              </SortableTableHeader>
              <SortableTableHeader
                sortKey="duration_minutes"
                currentSortKey={sortKey}
                sortDirection={sortDirection}
                onSort={handleSort}
              >
                Duration
              </SortableTableHeader>
              <SortableTableHeader
                sortKey="base_price"
                currentSortKey={sortKey}
                sortDirection={sortDirection}
                onSort={handleSort}
              >
                Base Price
              </SortableTableHeader>
              <SortableTableHeader
                sortKey="active"
                currentSortKey={sortKey}
                sortDirection={sortDirection}
                onSort={handleSort}
              >
                Status
              </SortableTableHeader>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedServices.map((service) => (
              <TableRow key={service.id}>
                <TableCell className="font-medium">{service.name}</TableCell>
                <TableCell>{service.duration_minutes} min</TableCell>
                <TableCell>${service.base_price.toFixed(2)}</TableCell>
                <TableCell>
                  <Badge variant={service.active ? 'default' : 'secondary'}>
                    {service.active ? 'Active' : 'Inactive'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <ServiceForm service={service}>
                      <Button variant="ghost" size="sm">Edit</Button>
                    </ServiceForm>
                    <DeleteServiceButton service={service} />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  )
}

