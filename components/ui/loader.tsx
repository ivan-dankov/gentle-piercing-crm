import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface LoaderProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function Loader({ size = 'md', className }: LoaderProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-8 w-8',
  }

  return (
    <Loader2
      className={cn('animate-spin text-muted-foreground', sizeClasses[size], className)}
      aria-label="Loading"
    />
  )
}

interface FullPageLoaderProps {
  message?: string
}

export function FullPageLoader({ message = 'Loading...' }: FullPageLoaderProps) {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Loader size="lg" />
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  )
}

