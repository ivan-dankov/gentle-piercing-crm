'use client'

import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { TableHead } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export type SortDirection = 'asc' | 'desc' | null

interface SortableTableHeaderProps {
  children: React.ReactNode
  sortKey: string
  currentSortKey: string | null
  sortDirection: SortDirection
  onSort: (key: string) => void
  className?: string
}

export function SortableTableHeader({
  children,
  sortKey,
  currentSortKey,
  sortDirection,
  onSort,
  className,
}: SortableTableHeaderProps) {
  const isActive = currentSortKey === sortKey

  return (
    <TableHead className={className}>
      <Button
        variant="ghost"
        size="sm"
        className="-ml-3 h-8 data-[state=open]:bg-accent"
        onClick={() => onSort(sortKey)}
      >
        {children}
        {isActive ? (
          sortDirection === 'asc' ? (
            <ArrowUp className="ml-2 h-4 w-4" />
          ) : (
            <ArrowDown className="ml-2 h-4 w-4" />
          )
        ) : (
          <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />
        )}
      </Button>
    </TableHead>
  )
}

