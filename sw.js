const CACHE = 'stibem-v3';
const ASSETS = [
    './',
    './index.html',
    './style.css',
    './game.js',
    './manifest.json',
    './Stibem.PNG',
    './Pollito lico.PNG',
    './Fondo.jpg',
    './Stibem come.m4a',
    './Stibem muere.m4a',
    './Stibem que que.m4a',
    './Niggersong.mp4'
];

self.addEventListener('install', e => {
    e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
    self.skipWaiting();
});

self.addEventListener('activate', e => {
    e.waitUntil(caches.keys().then(keys =>
        Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ));
    self.clients.claim();
});

self.addEventListener('fetch', e => {
    if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
    e.respondWith(
        caches.match(e.request).then(r => r || fetch(e.request))
    );
});
