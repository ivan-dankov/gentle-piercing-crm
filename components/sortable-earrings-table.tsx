'use client'

import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { SortableTableHeader, SortDirection } from '@/components/sortable-table-header'
import { EarringForm } from '@/components/earring-form'
import { DeleteEarringButton } from '@/components/delete-earring-button'
import type { Earring } from '@/lib/types'

interface SortableEarringsTableProps {
  earrings: Earring[]
}

export function SortableEarringsTable({ earrings }: SortableEarringsTableProps) {
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

  const sortedEarrings = useMemo(() => {
    if (!sortKey || sortKey === 'created_at') {
      // Default sort by created_at desc (handled by server)
      return [...earrings].reverse()
    }

    return [...earrings].sort((a, b) => {
      let aValue: any = a[sortKey as keyof Earring]
      let bValue: any = b[sortKey as keyof Earring]

      // Handle null values
      if (aValue === null || aValue === undefined) return 1
      if (bValue === null || bValue === undefined) return -1

      // Handle numbers
      if (typeof aValue === 'number') {
        if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
        if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
        return 0
      }

      // Handle strings
      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase()
        bValue = bValue.toLowerCase()
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
      return 0
    })
  }, [earrings, sortKey, sortDirection])

  return (
    <>
      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {sortedEarrings.map((earring) => {
          const costDisplay = earring.cost ? `$${earring.cost.toFixed(2)}` : '-'
          return (
            <Card key={earring.id}>
              <CardContent className="pt-4">
                <div className="space-y-3">
                  <div>
                    <h3 className="font-semibold text-lg">{earring.name}</h3>
                    {earring.category && (
                      <p className="text-sm text-muted-foreground">{earring.category}</p>
                    )}
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Cost:</span>
                      <span>{costDisplay}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Sale Price:</span>
                      <span>${earring.sale_price.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Sold:</span>
                      <span>{earring.sold_qty}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Status:</span>
                      <Badge variant={earring.active ? 'default' : 'secondary'}>
                        {earring.active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <EarringForm earring={earring}>
                      <Button variant="outline" size="sm" className="flex-1">Edit</Button>
                    </EarringForm>
                    <DeleteEarringButton earring={earring} />
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
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
                sortKey="category"
                currentSortKey={sortKey}
                sortDirection={sortDirection}
                onSort={handleSort}
              >
                Category
              </SortableTableHeader>
              <SortableTableHeader
                sortKey="cost"
                currentSortKey={sortKey}
                sortDirection={sortDirection}
                onSort={handleSort}
              >
                Cost
              </SortableTableHeader>
              <SortableTableHeader
                sortKey="sale_price"
                currentSortKey={sortKey}
                sortDirection={sortDirection}
                onSort={handleSort}
              >
                Sale Price
              </SortableTableHeader>
              <SortableTableHeader
                sortKey="sold_qty"
                currentSortKey={sortKey}
                sortDirection={sortDirection}
                onSort={handleSort}
              >
                Sold
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
            {sortedEarrings.map((earring) => {
              const costDisplay = earring.cost ? `$${earring.cost.toFixed(2)}` : '-'
              return (
                <TableRow key={earring.id}>
                  <TableCell className="font-medium">{earring.name}</TableCell>
                  <TableCell>{earring.category || '-'}</TableCell>
                  <TableCell className="text-sm">{costDisplay}</TableCell>
                  <TableCell>${earring.sale_price.toFixed(2)}</TableCell>
                  <TableCell>{earring.sold_qty}</TableCell>
                  <TableCell>
                    <Badge variant={earring.active ? 'default' : 'secondary'}>
                      {earring.active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <EarringForm earring={earring}>
                        <Button variant="ghost" size="sm">Edit</Button>
                      </EarringForm>
                      <DeleteEarringButton earring={earring} />
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </>
  )
}

