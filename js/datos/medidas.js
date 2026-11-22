// Peso y medidas (S17). Un registro por día: si ya hay uno ese día, se completa.
import * as db from '../db.js';
import * as perfil from './perfil.js';

export async function listar() {
  return (await db.todos('medidas')).sort((a, b) => b.fecha.localeCompare(a.fecha));
}

export const obtener = (id) => db.obtener('medidas', id);
export async function delDia(fecha) { return (await db.porIndice('medidas', 'fecha', fecha))[0] ?? null; }

// Guarda y, si es el peso más reciente, lo pasa al perfil (lo usan los objetivos de comida)
export async function guardar(m) {
  const reg = await db.guardar('medidas', m);
  if (reg.pesoKg != null) {
    const todas = await listar();
    const masReciente = todas.find((x) => x.pesoKg != null);
    if (masReciente?.id === reg.id) {
      const p = (await perfil.obtener()) ?? {};
      await perfil.guardar({ ...p, pesoKg: reg.pesoKg });
    }
  }
  return reg;
}

export const borrar = (id) => db.borrar('medidas', id);
export const restaurar = (m) => db.guardar('medidas', m);
