// Biblioteca de ejercicios (S07, S08, S16).
import * as db from '../db.js';
import { mapaEjercicios } from './semilla.js';

export const MUSCULOS_FILTRO = [
  ['pecho', 'Pecho', ['pecho']],
  ['espalda', 'Espalda', ['espalda_alta', 'dorsal', 'lumbar', 'trapecio']],
  ['hombros', 'Hombros', ['hombro_ant', 'hombro_lat', 'hombro_post']],
  ['brazos', 'Brazos', ['biceps', 'triceps', 'antebrazo']],
  ['piernas', 'Piernas', ['cuadriceps', 'isquios', 'gluteo', 'aductores', 'abductores', 'gemelo']],
  ['core', 'Core', ['abdomen', 'oblicuos']],
];
export const grupoDe = (musculo) => MUSCULOS_FILTRO.find(([, , ms]) => ms.includes(musculo))?.[0] ?? null;

export const MATERIALES = [
  ['barra', 'Barra'], ['mancuerna', 'Mancuernas'], ['maquina', 'Máquina'], ['polea', 'Polea'], ['multipower', 'Multipower'],
  ['banco', 'Banco'], ['barra_dominadas', 'Barra de dominadas'], ['kettlebell', 'Kettlebell'], ['banda', 'Banda elástica'], ['sin_material', 'Sin material'],
];
export const nombreMaterial = (m) => MATERIALES.find(([id]) => id === m)?.[1] ?? m;

export const TIPOS = [
  ['peso_reps', 'Peso y repeticiones'], ['reps', 'Solo repeticiones'], ['tiempo', 'Tiempo (segundos)'], ['asistido', 'Asistido (menos peso = mejor)'],
];

export const normalizar = (t) => String(t ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

export async function listar({ texto = '', grupo = null, material = [], ocultos = false } = {}) {
  const todos = [...(await mapaEjercicios()).values()];
  const q = normalizar(texto);
  return todos
    .filter((e) => ocultos || !e.oculto)
    .filter((e) => !q || normalizar(e.nombre).includes(q))
    .filter((e) => !grupo || grupoDe(e.musculo) === grupo)
    .filter((e) => !material.length || e.material.some((m) => material.includes(m)))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
}

export async function obtener(id) { return (await mapaEjercicios()).get(id) ?? null; }

export async function existeNombre(nombre, excluirId = null) {
  const n = normalizar(nombre);
  return [...(await mapaEjercicios()).values()].some((e) => e.id !== excluirId && !e.oculto && normalizar(e.nombre) === n);
}

export async function guardarPropio(e) {
  const reg = await db.guardar('ejercicios', { ...e, id: e.id ?? `propio-${crypto.randomUUID()}`, propio: true });
  await mapaEjercicios(true);
  return reg;
}

// Un ejercicio propio que ya se usó (series o rutinas) solo se oculta, para no romper el historial.
export async function borrarPropio(id) {
  const usos = await db.rango('series', 'ejercicio_fecha', [id, ''], [id, '￿']);
  const enRutinas = (await db.todos('rutinas')).some((r) => r.dias.some((d) => d.ejercicios.some((x) => x.ejercicioId === id)));
  if (usos.length || enRutinas) {
    const e = await db.obtener('ejercicios', id);
    await db.guardar('ejercicios', { ...e, oculto: true });
    await mapaEjercicios(true);
    return 'oculto';
  }
  await db.borrar('ejercicios', id);
  await mapaEjercicios(true);
  return 'borrado';
}
