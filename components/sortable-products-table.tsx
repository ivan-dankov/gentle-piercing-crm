'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Checkbox } from '@/components/ui/checkbox'
import { SortableTableHeader, SortDirection } from '@/components/sortable-table-header'
import { ProductForm } from '@/components/product-form'
import { DeleteProductButton } from '@/components/delete-product-button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { createClient } from '@/lib/supabase/client'
import type { Product } from '@/lib/types'
import { Trash2, ToggleLeft, ToggleRight, Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'

interface SortableProductsTableProps {
  products: Product[]
}

export function SortableProductsTable({ products }: SortableProductsTableProps) {
  const [sortKey, setSortKey] = useState<string | null>('created_at')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
  const [bulkActionLoading, setBulkActionLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('active')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const router = useRouter()
  const supabase = createClient()

  // Get unique categories
  const categories = useMemo(() => {
    const cats = new Set<string>()
    products.forEach(p => {
      if (p.category) cats.add(p.category)
    })
    return Array.from(cats).sort()
  }, [products])

  // Filter products
  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      // Search filter (name or SKU)
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase()
        const matchesName = product.name.toLowerCase().includes(query)
        const matchesSku = product.sku?.toLowerCase().includes(query) || false
        if (!matchesName && !matchesSku) return false
      }

      // Status filter
      if (statusFilter === 'active' && !product.active) return false
      if (statusFilter === 'inactive' && product.active) return false

      // Category filter
      if (categoryFilter !== 'all') {
        if (product.category !== categoryFilter) return false
      }

      return true
    })
  }, [products, searchQuery, statusFilter, categoryFilter])

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDirection('asc')
    }
  }

  const sortedProducts = useMemo(() => {
    if (!sortKey || sortKey === 'created_at') {
      // Default sort by created_at desc (handled by server)
      return [...filteredProducts].reverse()
    }

    return [...filteredProducts].sort((a, b) => {
      let aValue: any = a[sortKey as keyof Product]
      let bValue: any = b[sortKey as keyof Product]

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
  }, [filteredProducts, sortKey, sortDirection])

  const hasActiveFilters = searchQuery.trim() !== '' || statusFilter !== 'active' || categoryFilter !== 'all'

  const clearFilters = () => {
    setSearchQuery('')
    setStatusFilter('active')
    setCategoryFilter('all')
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(sortedProducts.map(p => p.id)))
    } else {
      setSelectedIds(new Set())
    }
  }

  const handleSelectOne = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedIds)
    if (checked) {
      newSelected.add(id)
    } else {
      newSelected.delete(id)
    }
    setSelectedIds(newSelected)
  }

  const allSelected = sortedProducts.length > 0 && selectedIds.size === sortedProducts.length
  const someSelected = selectedIds.size > 0 && selectedIds.size < sortedProducts.length

  const handleBulkDelete = async () => {
    setBulkActionLoading(true)
    try {
      const idsArray = Array.from(selectedIds)
      const { error } = await supabase
        .from('products')
        .delete()
        .in('id', idsArray)
      
      if (error) throw error
      
      setBulkDeleteOpen(false)
      setSelectedIds(new Set())
      router.refresh()
    } catch (error) {
      console.error('Error deleting products:', error)
      alert('Failed to delete products')
    } finally {
      setBulkActionLoading(false)
    }
  }

  const handleBulkToggleActive = async () => {
    setBulkActionLoading(true)
    try {
      const idsArray = Array.from(selectedIds)
      // Get current active status of first selected product
      const firstProduct = products.find(p => selectedIds.has(p.id))
      if (!firstProduct) return
      
      const newActiveStatus = !firstProduct.active
      
      const { error } = await supabase
        .from('products')
        // @ts-expect-error - Supabase types issue
        .update({ active: newActiveStatus })
        .in('id', idsArray)
      
      if (error) throw error
      
      setSelectedIds(new Set())
      router.refresh()
    } catch (error) {
      console.error('Error toggling products:', error)
      alert('Failed to update products')
    } finally {
      setBulkActionLoading(false)
    }
  }

  return (
    <>
      {/* Filters */}
      <div className="mb-4 space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <Label htmlFor="search" className="sr-only">Search</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="search"
                placeholder="Search by name or SKU..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7"
                  onClick={() => setSearchQuery('')}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Status Filter */}
          <div className="w-full sm:w-48">
            <Label htmlFor="status-filter" className="sr-only">Status</Label>
            <Select value={statusFilter} onValueChange={(value: 'all' | 'active' | 'inactive') => setStatusFilter(value)}>
              <SelectTrigger id="status-filter">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Category Filter */}
          <div className="w-full sm:w-48">
            <Label htmlFor="category-filter" className="sr-only">Category</Label>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger id="category-filter">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <Button
              variant="outline"
              size="sm"
              onClick={clearFilters}
              className="w-full sm:w-auto"
            >
              <X className="h-4 w-4 mr-2" />
              Clear Filters
            </Button>
          )}
        </div>

        {/* Results count */}
        {hasActiveFilters && (
          <div className="text-sm text-muted-foreground">
            Showing {sortedProducts.length} of {products.length} products
          </div>
        )}
      </div>

      {/* Bulk Action Toolbar */}
      {selectedIds.size > 0 && (
        <div className="mb-4 flex items-center justify-between rounded-lg border bg-muted/50 p-3">
          <span className="text-sm font-medium">
            {selectedIds.size} product{selectedIds.size !== 1 ? 's' : ''} selected
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleBulkToggleActive}
              disabled={bulkActionLoading}
            >
              {products.find(p => selectedIds.has(p.id))?.active ? (
                <>
                  <ToggleLeft className="h-4 w-4 mr-2" />
                  Deactivate
                </>
              ) : (
                <>
                  <ToggleRight className="h-4 w-4 mr-2" />
                  Activate
                </>
              )}
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setBulkDeleteOpen(true)}
              disabled={bulkActionLoading}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </div>
        </div>
      )}

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {sortedProducts.map((product) => {
          const costDisplay = product.cost ? `$${product.cost.toFixed(2)}` : '-'
          const isSelected = selectedIds.has(product.id)
          return (
            <Card key={product.id}>
              <CardContent className="pt-4">
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{product.name}</h3>
                      {product.sku && (
                        <p className="text-sm text-muted-foreground">SKU: {product.sku}</p>
                      )}
                      {product.category && (
                        <p className="text-sm text-muted-foreground">{product.category}</p>
                      )}
                    </div>
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={(checked) => handleSelectOne(product.id, checked as boolean)}
                    />
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Cost:</span>
                      <span>{costDisplay}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Sale Price:</span>
                      <span>${product.sale_price.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Sold:</span>
                      <span>{product.sold_qty}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Status:</span>
                      <Badge variant={product.active ? 'default' : 'secondary'}>
                        {product.active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <ProductForm product={product}>
                      <Button variant="outline" size="sm" className="flex-1">Edit</Button>
                    </ProductForm>
                    <DeleteProductButton product={product} />
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
              <TableHead className="w-12">
                <Checkbox
                  checked={allSelected || someSelected}
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
              <SortableTableHeader
                sortKey="sku"
                currentSortKey={sortKey}
                sortDirection={sortDirection}
                onSort={handleSort}
              >
                SKU
              </SortableTableHeader>
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
            {sortedProducts.map((product) => {
              const costDisplay = product.cost ? `$${product.cost.toFixed(2)}` : '-'
              const isSelected = selectedIds.has(product.id)
              return (
                <TableRow key={product.id}>
                  <TableCell>
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={(checked) => handleSelectOne(product.id, checked as boolean)}
                    />
                  </TableCell>
                  <TableCell>{product.sku || '-'}</TableCell>
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell>{product.category || '-'}</TableCell>
                  <TableCell className="text-sm">{costDisplay}</TableCell>
                  <TableCell>${product.sale_price.toFixed(2)}</TableCell>
                  <TableCell>{product.sold_qty}</TableCell>
                  <TableCell>
                    <Badge variant={product.active ? 'default' : 'secondary'}>
                      {product.active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <ProductForm product={product}>
                        <Button variant="ghost" size="sm">Edit</Button>
                      </ProductForm>
                      <DeleteProductButton product={product} />
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      {/* Bulk Delete Confirmation Dialog */}
      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Products</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedIds.size} product{selectedIds.size !== 1 ? 's' : ''}? This action cannot be undone and may affect existing bookings.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkActionLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              disabled={bulkActionLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {bulkActionLoading ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
