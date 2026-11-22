// Capa de datos: todo se guarda en IndexedDB dentro del iPhone.
// Esquema documentado en replica/schema.js. Para cambiarlo: sube DB_VERSION y añade un bloque en MIGRACIONES.

export const DB_NOMBRE = 'forja';
export const DB_VERSION = 1;

const MIGRACIONES = {
  1: (db) => {
    const ej = db.createObjectStore('ejercicios', { keyPath: 'id' });
    ej.createIndex('musculo', 'musculo');
    ej.createIndex('material', 'material', { multiEntry: true });
    ej.createIndex('nombre', 'nombre');
    ej.createIndex('propio', 'propio');

    const ru = db.createObjectStore('rutinas', { keyPath: 'id' });
    ru.createIndex('activa', 'activa');

    const se = db.createObjectStore('sesiones', { keyPath: 'id' });
    se.createIndex('fecha', 'fecha');
    se.createIndex('estado', 'estado');
    se.createIndex('diaId', 'diaId');

    const sr = db.createObjectStore('series', { keyPath: 'id' });
    sr.createIndex('sesionId', 'sesionId');
    sr.createIndex('ejercicio_fecha', ['ejercicioId', 'fecha']);

    db.createObjectStore('records', { keyPath: 'id' });

    db.createObjectStore('medidas', { keyPath: 'id' }).createIndex('fecha', 'fecha');
    db.createObjectStore('fotos', { keyPath: 'id' }).createIndex('fecha', 'fecha');

    db.createObjectStore('actividades', { keyPath: 'id' }).createIndex('fecha', 'fecha');

    const al = db.createObjectStore('alimentos', { keyPath: 'id' });
    al.createIndex('nombre', 'nombre');
    al.createIndex('usadoEn', 'usadoEn');
    db.createObjectStore('comidas', { keyPath: 'id' }).createIndex('fecha', 'fecha');

    db.createObjectStore('ajustes', { keyPath: 'clave' });
  },
};

let _db;
export function abrir() {
  if (_db) return Promise.resolve(_db);
  return new Promise((ok, mal) => {
    const req = indexedDB.open(DB_NOMBRE, DB_VERSION);
    req.onupgradeneeded = (e) => {
      for (let v = e.oldVersion + 1; v <= DB_VERSION; v++) MIGRACIONES[v]?.(req.result, req.transaction);
    };
    req.onsuccess = () => {
      _db = req.result;
      // Otra pestaña con una versión nueva: cerramos para no bloquearla.
      _db.onversionchange = () => { _db.close(); _db = null; location.reload(); };
      ok(_db);
    };
    req.onerror = () => mal(req.error);
  });
}

export function prom(req) {
  return new Promise((ok, mal) => { req.onsuccess = () => ok(req.result); req.onerror = () => mal(req.error); });
}

async function store(nombre, modo = 'readonly') {
  return (await abrir()).transaction(nombre, modo).objectStore(nombre);
}

export async function todos(nombre) { return prom((await store(nombre)).getAll()); }
export async function obtener(nombre, id) { return prom((await store(nombre)).get(id)); }
export async function borrar(nombre, id) { return prom((await store(nombre, 'readwrite')).delete(id)); }
export async function porIndice(nombre, indice, valor) { return prom((await store(nombre)).index(indice).getAll(valor)); }

export function sellar(obj) {
  const ahora = new Date().toISOString();
  return { id: obj.id ?? crypto.randomUUID(), creado: obj.creado ?? ahora, ...obj, actualizado: ahora };
}

export async function guardar(nombre, obj) {
  const reg = sellar(obj);
  await prom((await store(nombre, 'readwrite')).put(reg));
  return reg;
}

export async function rango(nombre, indice, desde, hasta) {
  const s = await store(nombre);
  return prom(s.index(indice).getAll(IDBKeyRange.bound(desde, hasta)));
}

// Varias escrituras en una sola transacción (todo o nada). fn recibe los stores y NO debe hacer await de otras cosas.
export async function transaccion(nombres, fn) {
  const tx = (await abrir()).transaction(nombres, 'readwrite');
  const stores = Object.fromEntries(nombres.map((n) => [n, tx.objectStore(n)]));
  fn(stores);
  await new Promise((ok, mal) => { tx.oncomplete = ok; tx.onerror = () => mal(tx.error); tx.onabort = () => mal(tx.error); });
}

// Ajustes clave/valor
export async function ajuste(clave, defecto = null) { return (await obtener('ajustes', clave))?.valor ?? defecto; }
export async function fijarAjuste(clave, valor) { return prom((await store('ajustes', 'readwrite')).put({ clave, valor })); }

// Pide al navegador que no borre los datos aunque falte espacio.
export async function pedirPersistencia() {
  if (!navigator.storage?.persist) return false;
  return (await navigator.storage.persisted()) || navigator.storage.persist();
}

// ---------- Copia de seguridad ----------
const blobA64 = (b) => new Promise((ok) => { const r = new FileReader(); r.onload = () => ok(r.result); r.readAsDataURL(b); });
const b64ABlob = (s) => fetch(s).then((r) => r.blob());

// Con sinFotos la copia no lleva el store "fotos"; al importarla, las fotos que ya haya en el dispositivo se conservan.
export async function exportar({ sinFotos = false } = {}) {
  const db = await abrir();
  const datos = { app: DB_NOMBRE, version: DB_VERSION, fecha: new Date().toISOString(), stores: {} };
  for (const nombre of db.objectStoreNames) {
    if (sinFotos && nombre === 'fotos') continue;
    const filas = await todos(nombre);
    for (const f of filas) for (const k in f) if (f[k] instanceof Blob) f[k] = { __blob: await blobA64(f[k]) };
    datos.stores[nombre] = filas;
  }
  const archivo = new File([JSON.stringify(datos)], `${DB_NOMBRE}-copia${sinFotos ? '-sin-fotos' : ''}-${datos.fecha.slice(0, 10)}.json`,
    { type: 'application/json' });
  await fijarAjuste('ultimaCopia', datos.fecha);
  // En iPhone, la hoja de Compartir permite "Guardar en Archivos" / iCloud.
  if (navigator.canShare?.({ files: [archivo] })) {
    try { await navigator.share({ files: [archivo], title: 'Copia de seguridad' }); return; } catch (e) { if (e.name === 'AbortError') return; }
  }
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(archivo), download: archivo.name });
  a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export async function importar(file, { reemplazar = true } = {}) {
  const datos = JSON.parse(await file.text());
  if (datos.app !== DB_NOMBRE) throw new Error('Este archivo no es una copia de Forja.');
  if (datos.version > DB_VERSION) throw new Error('La copia es de una versión más nueva de la app. Actualiza primero.');
  const db = await abrir();
  const nombres = Object.keys(datos.stores).filter((n) => db.objectStoreNames.contains(n));
  for (const n of nombres) for (const f of datos.stores[n]) for (const k in f) if (f[k]?.__blob) f[k] = await b64ABlob(f[k].__blob);
  const tx = db.transaction(nombres, 'readwrite');
  for (const n of nombres) {
    const s = tx.objectStore(n);
    if (reemplazar) s.clear();
    for (const f of datos.stores[n]) s.put(f);
  }
  return new Promise((ok, mal) => { tx.oncomplete = ok; tx.onerror = () => mal(tx.error); });
}

export async function borrarTodo() {
  _db?.close(); _db = null;
  await prom(indexedDB.deleteDatabase(DB_NOMBRE));
}
