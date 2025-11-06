'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { SortableTableHeader, SortDirection } from '@/components/sortable-table-header'
import { DeleteClientButton } from '@/components/delete-client-button'

interface Client {
  id: string
  name: string
  phone: string | null
  source: string | null
  created_at: string
}

interface SortableClientsTableProps {
  clients: Client[]
}

export function SortableClientsTable({ clients }: SortableClientsTableProps) {
  const [sortKey, setSortKey] = useState<string | null>('created_at')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  const handleSort = (key: string) => {
    if (sortKey === key) {
      // Toggle direction
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDirection('asc')
    }
  }

  const sortedClients = useMemo(() => {
    if (!sortKey) return clients

    return [...clients].sort((a, b) => {
      let aValue: any = a[sortKey as keyof Client]
      let bValue: any = b[sortKey as keyof Client]

      // Handle null values
      if (aValue === null || aValue === undefined) return 1
      if (bValue === null || bValue === undefined) return -1

      // Handle dates
      if (sortKey === 'created_at') {
        aValue = new Date(aValue).getTime()
        bValue = new Date(bValue).getTime()
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
  }, [clients, sortKey, sortDirection])

  return (
    <>
      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {sortedClients.map((client) => (
          <Card key={client.id}>
            <CardContent className="pt-4">
              <div className="space-y-3">
                <div>
                  <Link href={`/clients/${client.id}`} className="hover:underline">
                    <h3 className="font-semibold text-lg">{client.name}</h3>
                  </Link>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Phone:</span>
                    <span>{client.phone || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Source:</span>
                    <span>{client.source || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Created:</span>
                    <span>{new Date(client.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <Link href={`/clients/${client.id}`} className="flex-1">
                    <Button variant="outline" size="sm" className="w-full">View</Button>
                  </Link>
                  <DeleteClientButton client={client} />
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
                sortKey="phone"
                currentSortKey={sortKey}
                sortDirection={sortDirection}
                onSort={handleSort}
              >
                Phone
              </SortableTableHeader>
              <SortableTableHeader
                sortKey="source"
                currentSortKey={sortKey}
                sortDirection={sortDirection}
                onSort={handleSort}
              >
                Source
              </SortableTableHeader>
              <SortableTableHeader
                sortKey="created_at"
                currentSortKey={sortKey}
                sortDirection={sortDirection}
                onSort={handleSort}
              >
                Created
              </SortableTableHeader>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedClients.map((client) => (
              <TableRow key={client.id}>
                <TableCell className="font-medium">
                  <Link href={`/clients/${client.id}`} className="hover:underline">
                    {client.name}
                  </Link>
                </TableCell>
                <TableCell>{client.phone || '-'}</TableCell>
                <TableCell>{client.source || '-'}</TableCell>
                <TableCell>
                  {new Date(client.created_at).toLocaleDateString()}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Link href={`/clients/${client.id}`}>
                      <Button variant="ghost" size="sm">View</Button>
                    </Link>
                    <DeleteClientButton client={client} />
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

