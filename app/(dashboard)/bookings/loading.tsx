import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <div>
      <Skeleton className="h-9 w-40 mb-6" />
      <Skeleton className="h-[600px] w-full" />
    </div>
  )
}

