import * as db from './db.js';
import { $, $$, toast } from './ui.js';
import { cargarSemilla } from './datos/semilla.js';
import { estado } from './datos/estado.js';

// Rutas: patrón -> [módulo de vista, pestaña activa]
const RUTAS = [
  [/^$/, 'hoy', 'hoy'],
  [/^entreno\/([\w-]+)$/, 'entreno', null],
  [/^resumen\/([\w-]+)$/, 'resumen', null],
  [/^historial$/, 'historial', 'historial'],
  [/^actividad$/, 'actividad', 'hoy'],
  [/^perfil$/, 'perfil', 'perfil'],
  [/^bienvenida$/, 'bienvenida', null],
  [/^cuestionario(?:\/(\d))?$/, 'cuestionario', null],
  [/^propuesta$/, 'propuesta', null],
  [/^rutinas$/, 'rutinas', null],
  [/^rutina\/([\w-]+)$/, 'rutina', null],
  [/^ejercicios$/, 'ejercicios', null],
  [/^ejercicio\/([\w-]+)$/, 'ejercicio', null],
  [/^ejercicio-nuevo$/, 'ejercicio-form', null],
  [/^ejercicio-editar\/([\w-]+)$/, 'ejercicio-form', null],
  [/^sesion\/([\w-]+)$/, 'sesion', 'historial'],
  [/^progreso$/, 'progreso', 'progreso'],
  [/^comida(?:\/(\d{4}-\d{2}-\d{2}))?$/, 'comida', 'comida'],
  [/^comida-anadir\/(\w+)\/(\d{4}-\d{2}-\d{2})$/, 'comida-anadir', 'comida'],
  [/^comida-objetivos$/, 'comida-objetivos', 'comida'],
  [/^medidas$/, 'medidas', 'perfil'],
  [/^medida-nueva$/, 'medida-form', 'perfil'],
  [/^medida\/([\w-]+)$/, 'medida-form', 'perfil'],
  [/^fotos$/, 'fotos', 'perfil'],
];
// Pantallas a pantalla completa (sin barra de pestañas)
const SIN_TABBAR = new Set(['entreno', 'bienvenida', 'cuestionario', 'propuesta']);

let limpiarVista = null;

async function render() {
  const ruta = location.hash.replace(/^#\/?/, '');
  const [patron, modulo, tab] = RUTAS.find(([p]) => p.test(ruta)) ?? RUTAS[0];
  const params = ruta.match(patron)?.slice(1) ?? [];

  if (limpiarVista) { try { limpiarVista(); } catch {} limpiarVista = null; }
  const pestana = tab ?? ({ comida: 'comida', progreso: 'progreso' }[ruta.split('/')[0]] ?? null);
  $$('#tabbar a').forEach((a) => {
    if (a.dataset.tab === pestana) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
  document.body.classList.toggle('sin-tabbar', SIN_TABBAR.has(modulo) || (modulo === 'ejercicios' && !!estado.eleccion));
  if (modulo !== 'ejercicios' && modulo !== 'ejercicio-form') {
    // Si se sale del selector por otro camino (pestañas), se olvida la elección pendiente.
    if (estado.eleccion && !location.hash.startsWith(estado.eleccion.volver)) estado.eleccion = null;
  }

  const vista = $('#vista');
  try {
    const m = await import(`./vistas/${modulo}.js`);
    limpiarVista = (await m.default(vista, ...params)) ?? null;
  } catch (e) {
    console.error(e);
    vista.innerHTML = `<div class="card vacio"><h2>Algo ha fallado</h2><p>${String(e.message).replace(/[<>&]/g, '')}</p><a class="btn" href="#/">Volver a Hoy</a></div>`;
  }
  if (!location.hash.includes('entreno')) window.scrollTo(0, 0);
}
addEventListener('hashchange', render);

// ---------- Instalación, persistencia y actualizaciones ----------
const instalada = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const esIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const esLocal = ['localhost', '127.0.0.1'].includes(location.hostname);

function avisoInstalar() {
  let visto = false;
  try { visto = !!localStorage.getItem('aviso-instalar-visto'); } catch {}
  if (!esIOS || instalada || visto) return;
  const a = document.createElement('div');
  a.className = 'aviso';
  a.innerHTML = `<strong>Instala Forja en tu iPhone</strong>
    <p>Toca Compartir y luego "Añadir a pantalla de inicio". Así funciona sin internet y tus datos no se borran.
    Ojo: lo que guardes aquí en Safari no pasa a la app instalada.</p>
    <button class="btn">Entendido</button>`;
  document.body.append(a);
  a.querySelector('button').onclick = () => { a.remove(); try { localStorage.setItem('aviso-instalar-visto', '1'); } catch {} };
}

async function registrarSW() {
  // En el PC (localhost) no se registra: así cada cambio se ve al recargar.
  if (!('serviceWorker' in navigator) || esLocal) return;
  const reg = await navigator.serviceWorker.register('./sw.js');
  const mostrar = (w) => {
    const a = document.createElement('div');
    a.className = 'aviso';
    a.innerHTML = '<strong>Hay una versión nueva</strong><p>Tus datos se quedan como están.</p><button class="btn">Actualizar</button>';
    document.body.append(a);
    a.querySelector('button').onclick = () => w.postMessage('saltar-espera');
  };
  if (reg.waiting && navigator.serviceWorker.controller) mostrar(reg.waiting);
  reg.addEventListener('updatefound', () => {
    const w = reg.installing;
    w.addEventListener('statechange', () => { if (w.state === 'installed' && navigator.serviceWorker.controller) mostrar(w); });
  });
  let recargando = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (!recargando) { recargando = true; location.reload(); } });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) reg.update(); });
}

(async () => {
  try { await cargarSemilla(); } catch (e) { console.error(e); toast('No se pudo cargar la biblioteca de ejercicios', { error: true }); }
  db.pedirPersistencia();
  registrarSW();
  avisoInstalar();
  render();
})();
