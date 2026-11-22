// Sube este número cada vez que publiques cambios, o el iPhone seguirá con la versión vieja.
const CACHE_VERSION = 'v7';
const CACHE = `forja-${CACHE_VERSION}`;

// TODOS los archivos que la app necesita para funcionar sin internet.
const ARCHIVOS = [
  './', './index.html', './manifest.webmanifest',
  './css/tokens.css', './css/componentes.css',
  './js/app.js', './js/db.js', './js/ui.js', './js/grafica.js',
  './js/logica/fechas.js', './js/logica/progresion.js', './js/logica/racha.js', './js/logica/records.js', './js/logica/generador.js',
  './js/datos/semilla.js', './js/datos/rutinas.js', './js/datos/entreno.js', './js/datos/historial.js', './js/datos/actividades.js',
  './js/datos/perfil.js', './js/datos/ejercicios.js', './js/datos/estado.js',
  './js/vistas/hoy.js', './js/vistas/entreno.js', './js/vistas/resumen.js', './js/vistas/historial.js',
  './js/vistas/actividad.js', './js/vistas/perfil.js', './js/vistas/pendiente.js',
  './js/vistas/bienvenida.js', './js/vistas/cuestionario.js', './js/vistas/propuesta.js',
  './js/vistas/ejercicios.js', './js/vistas/ejercicio.js', './js/vistas/ejercicio-form.js',
  './js/vistas/rutinas.js', './js/vistas/rutina.js',
  './js/logica/stats.js', './js/logica/nutricion.js', './js/datos/comida.js',
  './js/vistas/sesion.js', './js/vistas/progreso.js',
  './js/vistas/comida.js', './js/vistas/comida-anadir.js', './js/vistas/comida-objetivos.js',
  './js/logica/medidas.js', './js/datos/medidas.js', './js/vistas/medidas.js', './js/vistas/medida-form.js',
  './js/datos/fotos.js', './js/vistas/fotos.js',
  './data/ejercicios.json', './data/plantillas.json',
  './icons/icon-180.png', './icons/icon-192.png', './icons/icon-512.png',
];

// Las fotos de ejercicios (unos 16 MB) también se guardan para usarlas sin conexión.
async function fotosEjercicios() {
  const { ejercicios } = await (await fetch('./data/ejercicios.json', { cache: 'no-cache' })).json();
  return ejercicios.filter((x) => x.foto).flatMap((x) => [`./img/ej/${x.id}-0.jpg`, `./img/ej/${x.id}-1.jpg`]);
}

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    await c.addAll(ARCHIVOS);
    await c.addAll(await fotosEjercicios());
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (e) => {
  if (e.data === 'saltar-espera') self.skipWaiting();
});

// Cache-first: rápido y funciona offline. Lo nuevo llega al cambiar CACHE_VERSION.
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  // Solo los archivos de la app; las búsquedas en internet (Open Food Facts) van directas a la red.
  if (new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then((r) =>
      r || fetch(e.request).then((res) => {
        if (res.ok && new URL(e.request.url).origin === location.origin) {
          const copia = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copia));
        }
        return res;
      }).catch(() => caches.match('./index.html'))
    )
  );
});
