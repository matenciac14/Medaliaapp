'use client'

import { useEffect, useRef, useState } from 'react'

interface LazyGifProps {
  src: string
  alt: string
  className?: string
  containerClassName?: string
}

/**
 * Carga el GIF solo cuando entra al viewport (IntersectionObserver).
 * Evita que todos los GIFs del grid se soliciten simultáneamente al proxy,
 * lo que agota el pool de 6 conexiones HTTP/1.1 del browser.
 */
export function LazyGif({ src, alt, className, containerClassName }: LazyGifProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [shouldLoad, setShouldLoad] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState(false)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldLoad(true)
          observer.disconnect()
        }
      },
      { rootMargin: '150px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={containerRef} className={`relative ${containerClassName ?? ''}`}>
      {shouldLoad && !error && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
          className={`${className ?? ''} transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
        />
      )}
      {/* Spinner: solo mientras carga, no si hay error */}
      {shouldLoad && !loaded && !error && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-gray-200 border-t-orange-400 rounded-full animate-spin" />
        </div>
      )}
      {/* Placeholder: si no se inició la carga o hubo error */}
      {(!shouldLoad || error) && (
        <div className="absolute inset-0 flex items-center justify-center text-gray-200">
          <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" />
          </svg>
        </div>
      )}
    </div>
  )
}
