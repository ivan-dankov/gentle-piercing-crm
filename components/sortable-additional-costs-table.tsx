'use client'

import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { SortableTableHeader, SortDirection } from '@/components/sortable-table-header'
import { AdditionalCostForm } from '@/components/additional-cost-form'
import { DeleteAdditionalCostButton } from '@/components/delete-additional-cost-button'
import type { AdditionalCost } from '@/lib/types'

const categoryLabels: Record<string, string> = {
  rent: 'Rent',
  ads: 'Ads',
  print: 'Print',
  consumables: 'Consumables',
  other: 'Other',
}

interface SortableAdditionalCostsTableProps {
  costs: AdditionalCost[]
}

export function SortableAdditionalCostsTable({ costs }: SortableAdditionalCostsTableProps) {
  const [sortKey, setSortKey] = useState<string | null>('date')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDirection('asc')
    }
  }

  const sortedCosts = useMemo(() => {
    if (!sortKey) return costs

    return [...costs].sort((a, b) => {
      let aValue: any = a[sortKey as keyof AdditionalCost]
      let bValue: any = b[sortKey as keyof AdditionalCost]

      if (aValue === null || aValue === undefined) return 1
      if (bValue === null || bValue === undefined) return -1

      // Handle dates
      if (sortKey === 'date') {
        aValue = new Date(aValue).getTime()
        bValue = new Date(bValue).getTime()
      }

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
  }, [costs, sortKey, sortDirection])

  return (
    <>
      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {sortedCosts.map((cost) => (
          <Card key={cost.id}>
            <CardContent className="pt-4">
              <div className="space-y-3">
                <div>
                  <h3 className="font-semibold text-lg">{categoryLabels[cost.type] || cost.type}</h3>
                  {cost.description && (
                    <p className="text-sm text-muted-foreground">{cost.description}</p>
                  )}
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Amount:</span>
                    <span className="font-semibold">${cost.amount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Date:</span>
                    <span>{new Date(cost.date).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <AdditionalCostForm cost={cost}>
                    <Button variant="outline" size="sm" className="flex-1">Edit</Button>
                  </AdditionalCostForm>
                  <DeleteAdditionalCostButton cost={cost} />
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
                sortKey="type"
                currentSortKey={sortKey}
                sortDirection={sortDirection}
                onSort={handleSort}
              >
                Category
              </SortableTableHeader>
              <SortableTableHeader
                sortKey="amount"
                currentSortKey={sortKey}
                sortDirection={sortDirection}
                onSort={handleSort}
              >
                Amount
              </SortableTableHeader>
              <SortableTableHeader
                sortKey="date"
                currentSortKey={sortKey}
                sortDirection={sortDirection}
                onSort={handleSort}
              >
                Date
              </SortableTableHeader>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedCosts.map((cost) => (
              <TableRow key={cost.id}>
                <TableCell className="font-medium">
                  <Badge variant="outline">{categoryLabels[cost.type] || cost.type}</Badge>
                </TableCell>
                <TableCell className="font-semibold">${cost.amount.toFixed(2)}</TableCell>
                <TableCell>
                  {new Date(cost.date).toLocaleDateString()}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {cost.description || '-'}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <AdditionalCostForm cost={cost}>
                      <Button variant="ghost" size="sm">Edit</Button>
                    </AdditionalCostForm>
                    <DeleteAdditionalCostButton cost={cost} />
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

