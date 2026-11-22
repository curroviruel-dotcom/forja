// Fotos de progreso: se guardan como Blob JPEG comprimido en IndexedDB (nunca salen del dispositivo,
// salvo en la copia de seguridad si el usuario la exporta con fotos).
import * as db from '../db.js';

export const ANGULOS = [['frente', 'Frente'], ['lado', 'Lado'], ['espalda', 'Espalda']];
const LADO_MAX = 1600;
const CALIDAD = 0.8;

// Redimensiona a 1600 px como máximo y la pasa a JPEG. Respeta la orientación EXIF (createImageBitmap la aplica).
export async function comprimir(file) {
  if (!file?.type?.startsWith('image/')) throw new Error('Ese archivo no es una imagen.');
  let fuente;
  try { fuente = await createImageBitmap(file, { imageOrientation: 'from-image' }); }
  catch {
    // Safari antiguo: vía <img>
    fuente = await new Promise((ok, mal) => {
      const img = new Image(); const url = URL.createObjectURL(file);
      img.onload = () => { URL.revokeObjectURL(url); ok(img); };
      img.onerror = () => { URL.revokeObjectURL(url); mal(new Error('No se pudo leer la imagen.')); };
      img.src = url;
    });
  }
  const w0 = fuente.width, h0 = fuente.height;
  const k = Math.min(1, LADO_MAX / Math.max(w0, h0));
  const w = Math.round(w0 * k), h = Math.round(h0 * k);
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  c.getContext('2d').drawImage(fuente, 0, 0, w, h);
  fuente.close?.();
  const blob = await new Promise((ok) => c.toBlob(ok, 'image/jpeg', CALIDAD));
  if (!blob) throw new Error('No se pudo comprimir la foto.');
  return { blob, ancho: w, alto: h };
}

export async function guardar({ fecha, angulo, file }) {
  const { blob, ancho, alto } = await comprimir(file);
  return db.guardar('fotos', { fecha, angulo, blob, ancho, alto, bytes: blob.size });
}

export async function listar() {
  return (await db.todos('fotos')).sort((a, b) => b.fecha.localeCompare(a.fecha) || b.creado.localeCompare(a.creado));
}
export const obtener = (id) => db.obtener('fotos', id);
export const borrar = (id) => db.borrar('fotos', id);
export const restaurar = (f) => db.guardar('fotos', f);

// URLs de objeto: hay que liberarlas al salir de la pantalla
export function urls() {
  const creadas = [];
  return {
    de: (foto) => { const u = URL.createObjectURL(foto.blob); creadas.push(u); return u; },
    liberar: () => { creadas.forEach((u) => URL.revokeObjectURL(u)); creadas.length = 0; },
  };
}
