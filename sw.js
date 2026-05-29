const CACHE = 'caremed-v1'
const ASSETS = ['/', '/index.html', '/manifest.json', '/css/app.css', '/js/db.js', '/js/app.js', '/js/scheduler.js', '/js/build-tracker.js', '/js/qc-form.js', '/js/forms/assembly.js', '/js/records.js', '/icons/icon-192.png', '/icons/icon-512.png']
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())) })
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())) })
self.addEventListener('fetch', e => { e.respondWith(caches.match(e.request).then(cached => { if (cached) return cached; return fetch(e.request).then(r => { if (r && r.status === 200 && r.type === 'basic') { const clone = r.clone(); caches.open(CACHE).then(c => c.put(e.request, clone)) } return r }).catch(() => caches.match('/index.html')) })) })
