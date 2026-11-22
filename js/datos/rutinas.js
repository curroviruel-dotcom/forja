import * as db from '../db.js';
import { plantillas } from './semilla.js';

export async function activa() {
  return (await db.porIndice('rutinas', 'activa', 1))[0] ?? null;
}

export async function listar() {
  return (await db.todos('rutinas')).sort((a, b) => b.activa - a.activa || a.nombre.localeCompare(b.nombre));
}

// Solo una rutina activa: se cambia en una transacción.
export async function activar(id) {
  const todas = await db.todos('rutinas');
  await db.transaccion(['rutinas'], ({ rutinas }) => {
    for (const r of todas) if (r.activa !== (r.id === id ? 1 : 0)) rutinas.put(db.sellar({ ...r, activa: r.id === id ? 1 : 0 }));
  });
}

export const obtener = (id) => db.obtener('rutinas', id);

// Da ids a días y ejercicios de una rutina en bruto (plantilla o generada).
export function conIds(r) {
  return {
    ...r,
    dias: r.dias.map((d) => ({
      id: d.id ?? crypto.randomUUID(), nombre: d.nombre,
      ejercicios: d.ejercicios.map((e) => ({ id: e.id ?? crypto.randomUUID(), superserie: null, notas: '', descansoS: 120, ...e })),
    })),
  };
}

// Devuelve [] si es válida, o una lista de {campo, texto} (campo = id del input en S06).
export function validar(r) {
  const errores = [];
  if (!r.nombre?.trim()) errores.push({ campo: 'r-nombre', texto: 'Ponle un nombre a la rutina' });
  if (!r.dias.length) errores.push({ campo: 'b-dia', texto: 'Añade al menos un día' });
  for (const d of r.dias) {
    if (!d.nombre?.trim()) errores.push({ campo: `d-${d.id}`, texto: 'Cada día necesita un nombre' });
    for (const e of d.ejercicios) {
      if (!(e.series >= 1 && e.series <= 10)) errores.push({ campo: `s-${e.id}`, texto: 'Entre 1 y 10 series' });
      if (!(e.repMin >= 1 && e.repMax >= e.repMin && e.repMax <= 300)) errores.push({ campo: `rmin-${e.id}`, texto: 'El mínimo de reps no puede ser mayor que el máximo' });
    }
  }
  return errores;
}

export async function guardar(r, { activar: act = false } = {}) {
  const errores = validar(r);
  if (errores.length) throw Object.assign(new Error(errores[0].texto), { errores });
  const hayActiva = !!(await activa());
  const reg = await db.guardar('rutinas', { ...r, nombre: r.nombre.trim(), activa: r.activa ?? 0 });
  if (act || !hayActiva) await activar(reg.id);
  return reg;
}

export async function duplicar(id) {
  const r = await obtener(id);
  const copia = conIds({ ...r, id: undefined, creado: undefined, nombre: `${r.nombre} (copia)`, activa: 0, dias: r.dias.map((d) => ({ ...d, id: undefined, ejercicios: d.ejercicios.map((e) => ({ ...e, id: undefined })) })) });
  delete copia.id; delete copia.creado;
  return db.guardar('rutinas', copia);
}

// Borrar una rutina no borra sus entrenos: guardan su propio nombre.
export const borrar = (id) => db.borrar('rutinas', id);

export async function desdePlantilla(plantillaId) {
  const p = (await plantillas()).find((x) => x.id === plantillaId);
  if (!p) throw new Error('No existe esa plantilla');
  const rutina = await db.guardar('rutinas', {
    nombre: p.nombre, origen: 'plantilla', activa: 0,
    dias: p.dias.map((d) => ({
      id: crypto.randomUUID(), nombre: d.nombre,
      ejercicios: d.ejercicios.map((e) => ({ id: crypto.randomUUID(), superserie: null, notas: '', ...e })),
    })),
  });
  await activar(rutina.id);
  return rutina;
}

// Rotación: toca el día siguiente al último día terminado de la rutina activa.
export async function diaDeHoy() {
  const rutina = await activa();
  if (!rutina?.dias.length) return null;
  const hechas = (await db.porIndice('sesiones', 'estado', 'terminada'))
    .filter((s) => s.rutinaId === rutina.id)
    .sort((a, b) => (b.fin ?? '').localeCompare(a.fin ?? ''));
  const ultimo = hechas[0];
  const i = ultimo ? rutina.dias.findIndex((d) => d.id === ultimo.diaId) : -1;
  const indice = (i + 1) % rutina.dias.length;
  return { rutina, dia: rutina.dias[indice], indice, ultimo };
}
