'use client'

import { useEffect, useRef, useState } from 'react'
import { Input } from '@/components/ui/input'
import type { UseFormSetValue } from 'react-hook-form'

declare global {
  interface Window {
    google: any
    initGooglePlaces: () => void
  }
}

interface GooglePlacesAutocompleteProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export function GooglePlacesAutocomplete({ 
  value, 
  onChange, 
  placeholder = "Enter location...",
  className 
}: GooglePlacesAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const autocompleteRef = useRef<any>(null)
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    // Check if Google Maps is already loaded
    if (window.google && window.google.maps && window.google.maps.places) {
      setIsLoaded(true)
      initializeAutocomplete()
      return
    }

    // Load Google Maps script if not already loaded
    if (!document.querySelector('script[src*="maps.googleapis.com"]')) {
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''
      if (!apiKey) {
        console.warn('Google Maps API key not found. Please set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in your .env.local file')
        return
      }
      const script = document.createElement('script')
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`
      script.async = true
      script.defer = true
      script.onload = () => {
        setIsLoaded(true)
        initializeAutocomplete()
      }
      document.head.appendChild(script)
    } else {
      // Script exists but might not be loaded yet
      const checkGoogle = setInterval(() => {
        if (window.google && window.google.maps && window.google.maps.places) {
          setIsLoaded(true)
          initializeAutocomplete()
          clearInterval(checkGoogle)
        }
      }, 100)

      return () => clearInterval(checkGoogle)
    }
  }, [isLoaded])

  const initializeAutocomplete = () => {
    if (!inputRef.current || !window.google?.maps?.places) return

    // Create autocomplete instance
    autocompleteRef.current = new window.google.maps.places.Autocomplete(
      inputRef.current,
      {
        types: ['establishment', 'geocode'],
        componentRestrictions: { country: ['pl', 'us'] },
      }
    )

    // Add CSS to ensure dropdown is above dialog overlay and interactive
    if (!document.getElementById('google-places-autocomplete-styles')) {
      const style = document.createElement('style')
      style.id = 'google-places-autocomplete-styles'
      style.textContent = `
        .pac-container {
          z-index: 10000 !important;
          pointer-events: auto !important;
          position: absolute !important;
        }
        .pac-item {
          pointer-events: auto !important;
          cursor: pointer !important;
        }
        .pac-item:hover {
          background-color: #f3f4f6 !important;
        }
      `
      document.head.appendChild(style)
    }

    // Setup to ensure dropdown is interactive
    const setupPacHandler = () => {
      const pacContainer = document.querySelector('.pac-container') as HTMLElement
      if (!pacContainer || (pacContainer as any)._hasHandler) return
      
      ;(pacContainer as any)._hasHandler = true
      
      // Ensure pointer events are enabled
      pacContainer.style.pointerEvents = 'auto'
      pacContainer.style.zIndex = '10000'
      
      // Ensure all items are clickable
      const items = pacContainer.querySelectorAll('.pac-item')
      items.forEach((item) => {
        (item as HTMLElement).style.pointerEvents = 'auto'
        ;(item as HTMLElement).style.cursor = 'pointer'
      })

      const handleMouseDown = (e: MouseEvent) => {
        // Allow Google selection but prevent the dialog from interpreting the click
        e.stopPropagation()
      }

      const handleClick = (e: MouseEvent) => {
        e.stopPropagation()
      }

      pacContainer.addEventListener('mousedown', handleMouseDown, true)
      pacContainer.addEventListener('click', handleClick, true)
      ;(pacContainer as any)._mouseDownHandler = handleMouseDown
      ;(pacContainer as any)._clickHandler = handleClick
    }

    // Watch for container creation
    const observer = new MutationObserver(() => {
      setupPacHandler()
    })
    observer.observe(document.body, { childList: true, subtree: true })
    ;(autocompleteRef.current as any)._observer = observer
    
    // Initial check
    setTimeout(setupPacHandler, 100)

    // Add place changed listener
    autocompleteRef.current.addListener('place_changed', () => {
      const place = autocompleteRef.current.getPlace()
      if (place && place.formatted_address) {
        onChange(place.formatted_address)
      }
    })
  }

  // Cleanup
  useEffect(() => {
    return () => {
      if (autocompleteRef.current) {
        window.google?.maps?.event?.clearInstanceListeners(autocompleteRef.current)
        
        // Clean up observer
        const observer = (autocompleteRef.current as any)?._observer
        if (observer) {
          observer.disconnect()
        }
        
        // Clean up pac-container handlers
        const pacContainer = document.querySelector('.pac-container')
        if (pacContainer && (pacContainer as any)._hasHandler) {
          if ((pacContainer as any)._mouseDownHandler) {
            pacContainer.removeEventListener('mousedown', (pacContainer as any)._mouseDownHandler, true)
          }
          if ((pacContainer as any)._clickHandler) {
            pacContainer.removeEventListener('click', (pacContainer as any)._clickHandler, true)
          }
          delete (pacContainer as any)._mouseDownHandler
          delete (pacContainer as any)._clickHandler
          delete (pacContainer as any)._hasHandler
        }
      }
    }
  }, [])

  return (
    <Input
      ref={inputRef}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={className}
      autoComplete="off"
    />
  )
}

