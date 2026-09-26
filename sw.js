const CACHE = 'stibem-v6';
const ASSETS = [
    './',
    './index.html',
    './style.css',
    './game.js',
    './manifest.json',
    './Skins/Stibem.PNG',
    './Skins/Stibem_lowres.PNG',
    './Skins/Stibem_calvo.PNG',
    './Skins/Stibem_dormido.PNG',
    './Skins/Stibem_jabonoso.PNG',
    './Skins/Stibem_bandolero.PNG',
    './Comidita/Pollito lico.PNG',
    './Fondos/KFC.jpg',
    './Sonidos/Stibem come.m4a',
    './Sonidos/Mas pollita stibem.m4a',
    './Sonidos/Stibem muere.m4a',
    './Sonidos/Stibem que que.m4a',
    './Canciones/Niggersong.mp4'
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
