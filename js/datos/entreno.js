// Entreno en curso (F02). Cada serie se escribe en cuanto se marca: si Safari cierra la app no se pierde nada.
import * as db from '../db.js';
import { diaLocal } from '../logica/fechas.js';
import { sugerir, incrementoPara, INCREMENTOS } from '../logica/progresion.js';
import { compararRecords } from '../logica/records.js';
import { mapaEjercicios } from './semilla.js';

export async function enCurso() {
  return (await db.porIndice('sesiones', 'estado', 'en_curso'))[0] ?? null;
}

export const obtener = (id) => db.obtener('sesiones', id);
export const seriesDe = (sesionId) => db.porIndice('series', 'sesionId', sesionId);

// Sesiones anteriores con ese ejercicio, de la más reciente a la más antigua: [{sesionId, fecha, series[]}]
export async function historialEjercicio(ejercicioId, excluirSesionId = null) {
  const filas = await db.rango('series', 'ejercicio_fecha', [ejercicioId, ''], [ejercicioId, '￿']);
  const porSesion = new Map();
  for (const s of filas) {
    if (s.sesionId === excluirSesionId) continue;
    if (!porSesion.has(s.sesionId)) porSesion.set(s.sesionId, { sesionId: s.sesionId, fecha: s.fecha, fin: s.actualizado, series: [] });
    const g = porSesion.get(s.sesionId);
    g.series.push(s);
    if (s.actualizado > g.fin) g.fin = s.actualizado;
  }
  const lista = [...porSesion.values()];
  for (const g of lista) g.series.sort((a, b) => a.orden - b.orden);
  return lista.sort((a, b) => b.fecha.localeCompare(a.fecha) || b.fin.localeCompare(a.fin));
}

export async function empezar({ rutina = null, dia = null } = {}) {
  if (await enCurso()) throw new Error('Ya tienes un entreno en curso');
  const ejercicios = await mapaEjercicios();
  const incrementos = await db.ajuste('incrementos', INCREMENTOS);
  const plan = dia?.ejercicios ?? [];
  const lista = [];
  for (const re of plan) {
    const ej = ejercicios.get(re.ejercicioId);
    const hist = await historialEjercicio(re.ejercicioId);
    const sug = sugerir({
      ultima: hist[0]?.series ?? [], penultima: hist[1]?.series ?? [],
      repMin: re.repMin, repMax: re.repMax, nSeries: re.series,
      incremento: incrementoPara(ej?.material, incrementos), tipo: ej?.tipo,
    });
    lista.push({
      id: crypto.randomUUID(), ejercicioId: re.ejercicioId, nSeries: re.series,
      repMin: re.repMin, repMax: re.repMax, descansoS: re.descansoS ?? 120,
      superserie: re.superserie ?? null, notas: '', saltado: false,
      sugerencia: sug, anterior: hist[0]?.series.filter((s) => !s.calentamiento).map((s) => ({ kg: s.kg, reps: s.reps })) ?? [],
    });
  }
  return db.guardar('sesiones', {
    rutinaId: rutina?.id ?? null, diaId: dia?.id ?? null, nombre: dia?.nombre ?? 'Entreno libre',
    fecha: diaLocal(), inicio: new Date().toISOString(), fin: null, estado: 'en_curso', notas: '', fotoId: null,
    ejercicios: lista, resumen: null,
  });
}

export const actualizar = (sesion) => db.guardar('sesiones', sesion);

// Prepara un ejercicio para la sesión: sugerencia y "anterior" a partir de su historial.
async function prepararEjercicio(ejercicioId, { series = 3, repMin = 8, repMax = 12, descansoS = 120 } = {}) {
  const ej = (await mapaEjercicios()).get(ejercicioId);
  const incrementos = await db.ajuste('incrementos', INCREMENTOS);
  const hist = await historialEjercicio(ejercicioId);
  if (ej?.tipo === 'tiempo' && repMax <= 20) { repMin = 30; repMax = 60; }
  return {
    ejercicioId, nSeries: series, repMin, repMax, descansoS,
    sugerencia: sugerir({
      ultima: hist[0]?.series ?? [], penultima: hist[1]?.series ?? [], repMin, repMax, nSeries: series,
      incremento: incrementoPara(ej?.material, incrementos), tipo: ej?.tipo,
    }),
    anterior: hist[0]?.series.filter((s) => !s.calentamiento).map((s) => ({ kg: s.kg, reps: s.reps })) ?? [],
  };
}

// F03: cambiar un ejercicio en mitad del entreno. Si ya tenía series marcadas, se borran.
export async function reemplazar(sesionId, seId, nuevoId, { tambienEnRutina = false } = {}) {
  const sesion = await obtener(sesionId);
  const i = sesion.ejercicios.findIndex((e) => e.id === seId);
  const viejo = sesion.ejercicios[i];
  const preparado = await prepararEjercicio(nuevoId, { series: viejo.nSeries, repMin: viejo.repMin, repMax: viejo.repMax, descansoS: viejo.descansoS });
  sesion.ejercicios[i] = { ...viejo, ...preparado, id: crypto.randomUUID(), reemplazaA: viejo.ejercicioId, saltado: false };
  const hechas = (await seriesDe(sesionId)).filter((s) => s.sesionEjercicioId === seId);
  await db.transaccion(['sesiones', 'series'], (st) => {
    st.sesiones.put(db.sellar(sesion));
    for (const s of hechas) st.series.delete(s.id);
  });
  if (tambienEnRutina && sesion.rutinaId) {
    const r = await db.obtener('rutinas', sesion.rutinaId);
    const dia = r?.dias.find((d) => d.id === sesion.diaId);
    const re = dia?.ejercicios.find((e) => e.ejercicioId === viejo.ejercicioId);
    if (re) { re.ejercicioId = nuevoId; await db.guardar('rutinas', r); }
  }
  return obtener(sesionId);
}

export async function anadirEjercicios(sesionId, ids) {
  const sesion = await obtener(sesionId);
  for (const id of ids) sesion.ejercicios.push({ id: crypto.randomUUID(), superserie: null, notas: '', saltado: false, ...(await prepararEjercicio(id)) });
  return actualizar(sesion);
}

export async function marcarSerie(sesion, sesionEjercicio, { id, orden, kg, reps, rpe = null, calentamiento = false }) {
  return db.guardar('series', {
    id, sesionId: sesion.id, sesionEjercicioId: sesionEjercicio.id, ejercicioId: sesionEjercicio.ejercicioId,
    fecha: sesion.fecha, orden, kg, reps, rpe, calentamiento, fallo: false, hecha: true,
    sugerida: sesionEjercicio.sugerencia?.series?.[orden] ?? null,
  });
}

export const desmarcarSerie = (id) => db.borrar('series', id);

export async function terminar(sesionId) {
  const sesion = await obtener(sesionId);
  const series = await seriesDe(sesionId);
  const ejercicios = await mapaEjercicios();
  const fin = new Date();
  const records = [];
  const nuevosRecords = [];
  for (const se of sesion.ejercicios) {
    const suyas = series.filter((s) => s.sesionEjercicioId === se.id);
    if (!suyas.length) continue;
    const previo = await db.obtener('records', se.ejercicioId);
    const { nuevo, batidos } = compararRecords(previo ?? null, suyas);
    nuevosRecords.push({ ...(previo ?? {}), ...nuevo, id: se.ejercicioId });
    for (const b of batidos) records.push({ ejercicioId: se.ejercicioId, nombre: ejercicios.get(se.ejercicioId)?.nombre ?? '', ...b });
  }
  const trabajo = series.filter((s) => !s.calentamiento);
  const resumen = {
    duracionS: Math.round((fin - new Date(sesion.inicio)) / 1000),
    volumenKg: Math.round(trabajo.reduce((a, s) => a + (s.kg ?? 0) * (s.reps ?? 0), 0)),
    series: trabajo.length,
    ejercicios: new Set(series.map((s) => s.sesionEjercicioId)).size,
    records,
  };
  const cerrada = db.sellar({ ...sesion, estado: 'terminada', fin: fin.toISOString(), resumen });
  await db.transaccion(['sesiones', 'records'], (st) => {
    st.sesiones.put(cerrada);
    for (const r of nuevosRecords) st.records.put(db.sellar(r));
  });
  return cerrada;
}

export async function descartar(sesionId) {
  const series = await seriesDe(sesionId);
  await db.transaccion(['sesiones', 'series'], (st) => {
    st.sesiones.delete(sesionId);
    for (const s of series) st.series.delete(s.id);
  });
}
