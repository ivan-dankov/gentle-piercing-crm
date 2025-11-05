'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Loader } from '@/components/ui/loader'

export function NavigationLoading() {
  const pathname = usePathname()
  const [loading, setLoading] = useState(false)
  const [prevPathname, setPrevPathname] = useState(pathname)

  useEffect(() => {
    if (pathname !== prevPathname) {
      setLoading(true)
      setPrevPathname(pathname)
      
      // Hide loader after a short delay to allow page to render
      const timer = setTimeout(() => {
        setLoading(false)
      }, 300)

      return () => clearTimeout(timer)
    }
  }, [pathname, prevPathname])

  if (!loading) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-50">
      <div className="h-1 bg-primary/20">
        <div className="h-full bg-primary animate-pulse" style={{ width: '100%' }} />
      </div>
    </div>
  )
}

