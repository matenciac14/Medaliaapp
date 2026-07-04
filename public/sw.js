// Medaliq Service Worker
// Estrategia: Cache-first para assets estáticos, Network-first para páginas

const CACHE_VERSION = 'medaliq-v1'
const STATIC_CACHE = `${CACHE_VERSION}-static`
const PAGES_CACHE = `${CACHE_VERSION}-pages`

// Assets que cacheamos agresivamente (raramente cambian)
const STATIC_ASSETS = [
  '/manifest.json',
]

// Rutas de API — NUNCA cachear
const API_PATTERNS = [
  /^\/api\//,
  /\/_next\/data\//,
]

// Rutas de páginas que vale la pena cachear para offline
const CACHEABLE_PAGES = [
  '/dashboard',
  '/plan',
  '/gym',
  '/nutrition',
  '/checkin',
  '/progress',
  '/log',
]

// ─── Install ───────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(STATIC_ASSETS)
    })
  )
  // Activar inmediatamente sin esperar a que las pestañas cierren
  self.skipWaiting()
})

// ─── Activate ─────────────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key.startsWith('medaliq-') && key !== STATIC_CACHE && key !== PAGES_CACHE)
          .map((key) => caches.delete(key))
      )
    )
  )
  // Tomar control de todos los clientes inmediatamente
  self.clients.claim()
})

// ─── Fetch ────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Solo interceptar same-origin
  if (url.origin !== self.location.origin) return

  // Nunca cachear API routes
  if (API_PATTERNS.some((p) => p.test(url.pathname))) return

  // Assets _next/static → cache-first (tienen hash en el nombre, son inmutables)
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(cacheFirst(request, STATIC_CACHE))
    return
  }

  // Páginas de navegación → network-first con fallback a cache
  if (request.mode === 'navigate') {
    event.respondWith(networkFirstWithFallback(request))
    return
  }
})

// ─── Estrategias ──────────────────────────────────────────────────────────────

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request)
  if (cached) return cached

  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(cacheName)
      cache.put(request, response.clone())
    }
    return response
  } catch {
    return new Response('Sin conexión', { status: 503 })
  }
}

async function networkFirstWithFallback(request) {
  const cache = await caches.open(PAGES_CACHE)

  try {
    const response = await fetch(request)
    // Solo cachear páginas autenticadas que retornen 200
    if (response.ok && CACHEABLE_PAGES.some((p) => request.url.includes(p))) {
      cache.put(request, response.clone())
    }
    return response
  } catch {
    // Sin red — intentar desde cache
    const cached = await cache.match(request)
    if (cached) return cached

    // Fallback offline page
    return new Response(
      `<!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
        <title>Medaliq — Sin conexión</title>
        <style>
          body { font-family: -apple-system, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #f8fafc; color: #1e3a5f; text-align: center; padding: 1rem; }
          .logo { width: 64px; height: 64px; border-radius: 16px; background: #ea580c; display: flex; align-items: center; justify-content: center; font-size: 2rem; font-weight: 900; color: white; margin: 0 auto 1.5rem; }
          h1 { font-size: 1.5rem; font-weight: 700; margin: 0 0 0.5rem; }
          p { color: #64748b; font-size: 0.9rem; margin: 0 0 2rem; }
          button { background: #1e3a5f; color: white; border: none; padding: 0.875rem 2rem; border-radius: 0.75rem; font-size: 0.95rem; font-weight: 600; cursor: pointer; }
        </style>
      </head>
      <body>
        <div class="logo">M</div>
        <h1>Sin conexión</h1>
        <p>Revisa tu conexión a internet<br>y vuelve a intentarlo.</p>
        <button onclick="window.location.reload()">Reintentar</button>
      </body>
      </html>`,
      { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    )
  }
}
