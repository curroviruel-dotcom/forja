// Comida y macros (S20, S21). Añadido por el usuario; no existe en el original.
import * as db from '../db.js';
import { macrosDe, sumar, deOpenFoodFacts } from '../logica/nutricion.js';

// ---------- Open Food Facts (base pública de alimentos; solo se envía lo que buscas) ----------
const OFF_CAMPOS = 'code,product_name,product_name_es,brands,nutriments,serving_quantity';

async function pedir(url) {
  if (!navigator.onLine) throw new Error('Sin conexión: la búsqueda en internet necesita datos o wifi.');
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 12000);
  try {
    const r = await fetch(url, { signal: ctl.signal });
    if (!r.ok) throw new Error(`El servicio respondió ${r.status}. Prueba en un rato.`);
    return await r.json();
  } catch (e) {
    if (e.name === 'AbortError') throw new Error('La búsqueda tarda demasiado. Prueba otra vez.');
    if (e instanceof TypeError) throw new Error('No se pudo conectar con Open Food Facts.');
    throw e;
  } finally { clearTimeout(t); }
}

export async function buscarInternet(texto) {
  const url = `https://es.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(texto)}&search_simple=1&action=process&json=1&page_size=24&fields=${OFF_CAMPOS}`;
  const d = await pedir(url);
  return (d.products ?? []).map(deOpenFoodFacts).filter(Boolean);
}

export async function porCodigo(codigo) {
  const d = await pedir(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(codigo)}.json?fields=${OFF_CAMPOS}`);
  return d.status === 1 ? deOpenFoodFacts(d.product) : null;
}

// Al elegir un resultado se guarda como alimento propio (así funciona sin conexión la próxima vez).
export async function guardarDeInternet(a) {
  const ya = a.codigo && (await db.todos('alimentos')).find((x) => x.codigo === a.codigo);
  return ya ?? db.guardar('alimentos', { ...a, usadoEn: new Date().toISOString() });
}
import { sumarDias } from '../logica/fechas.js';
import { normalizar } from './ejercicios.js';

export const objetivos = () => db.ajuste('objetivosComida', null);
export const fijarObjetivos = (o) => db.fijarAjuste('objetivosComida', o);

export async function alimentos(texto = '') {
  const q = normalizar(texto);
  return (await db.todos('alimentos'))
    .filter((a) => !q || normalizar(a.nombre).includes(q))
    .sort((a, b) => (b.usadoEn ?? '').localeCompare(a.usadoEn ?? '') || a.nombre.localeCompare(b.nombre, 'es'));
}
export const alimento = (id) => db.obtener('alimentos', id);
export const guardarAlimento = (a) => db.guardar('alimentos', a);
export const borrarAlimento = (id) => db.borrar('alimentos', id); // las comidas guardan sus macros: no se rompen

export async function delDia(fecha) {
  return (await db.porIndice('comidas', 'fecha', fecha)).sort((a, b) => a.creado.localeCompare(b.creado));
}

// Guarda una comida copiando sus macros: editar el alimento después no cambia el pasado.
export async function anadir({ fecha, momento, alimento: a, cantidad }) {
  const m = macrosDe(a, cantidad);
  await db.guardar('alimentos', { ...a, usadoEn: new Date().toISOString() });
  return db.guardar('comidas', { fecha, momento, alimentoId: a.id, nombre: a.nombre, base: a.base, cantidad, ...m });
}

// Entrada rápida sin crear alimento
export const anadirRapido = ({ fecha, momento, nombre, kcal, prot, carb, grasa }) =>
  db.guardar('comidas', { fecha, momento, alimentoId: null, nombre: nombre || 'Entrada rápida', base: null, cantidad: null, kcal, prot, carb, grasa });

export async function cambiarCantidad(comida, cantidad) {
  const a = comida.alimentoId && (await alimento(comida.alimentoId));
  // Si el alimento ya no existe, se escala con los macros guardados
  const base = a ?? { base: 'racion', kcal: comida.kcal / comida.cantidad, prot: comida.prot / comida.cantidad, carb: comida.carb / comida.cantidad, grasa: comida.grasa / comida.cantidad };
  const m = a ? macrosDe(a, cantidad) : macrosDe(base, cantidad);
  return db.guardar('comidas', { ...comida, cantidad, ...m });
}

export const borrar = (id) => db.borrar('comidas', id);
export const restaurar = (c) => db.guardar('comidas', c);

// Media de los últimos 7 días con algo apuntado
export async function mediaSemana(hoy) {
  const filas = await db.rango('comidas', 'fecha', sumarDias(hoy, -6), hoy);
  const dias = new Set(filas.map((f) => f.fecha)).size;
  if (!dias) return null;
  const t = sumar(filas);
  return { dias, kcal: Math.round(t.kcal / dias), prot: Math.round(t.prot / dias) };
}
