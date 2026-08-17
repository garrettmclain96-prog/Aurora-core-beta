// Aurora Core Service Worker — offline shell + cache
const CACHE = 'aurora-v2'
const SHELL = ['/', '/index.html']

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)))
  self.skipWaiting()
})

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ))
  self.clients.claim()
})

self.addEventListener('fetch', e => {
  // API calls: network only
  if (e.request.url.includes('/api/')) return
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request).then(r => r ?? caches.match('/index.html')))
  )
})

// Push notifications from JARVIS
self.addEventListener('push', e => {
  const data = e.data?.json() ?? { title: 'J.A.R.V.I.S.', body: 'Aurora Core alert.' }
  e.waitUntil(self.registration.showNotification(data.title, {
    body: data.body,
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    tag: 'jarvis-alert',
    renotify: true,
    vibrate: [200, 100, 200],
  }))
})
