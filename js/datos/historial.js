// Historial (S11, S12): listar, ver, corregir y borrar entrenos pasados. Los récords se recalculan.
import * as db from '../db.js';
import { compararRecords } from '../logica/records.js';

export async function sesionesTerminadas() {
  return (await db.porIndice('sesiones', 'estado', 'terminada'))
    .sort((a, b) => b.fecha.localeCompare(a.fecha) || (b.fin ?? '').localeCompare(a.fin ?? ''));
}

export async function detalle(id) {
  const sesion = await db.obtener('sesiones', id);
  const series = (await db.porIndice('series', 'sesionId', id)).sort((a, b) => a.orden - b.orden);
  return { sesion, series };
}

// Récords de un ejercicio reconstruidos desde cero recorriendo su historial en orden.
export async function recalcularRecords(ejercicioIds) {
  for (const id of new Set(ejercicioIds)) {
    const filas = await db.rango('series', 'ejercicio_fecha', [id, ''], [id, '￿']);
    const porSesion = new Map();
    for (const s of filas) { if (!porSesion.has(s.sesionId)) porSesion.set(s.sesionId, []); porSesion.get(s.sesionId).push(s); }
    const orden = [...porSesion.values()].sort((a, b) => a[0].fecha.localeCompare(b[0].fecha) || a[0].creado.localeCompare(b[0].creado));
    let rec = null;
    for (const ss of orden) rec = compararRecords(rec, ss).nuevo;
    if (rec) await db.guardar('records', { ...rec, id }); else await db.borrar('records', id);
  }
}

async function actualizarResumen(sesionId) {
  const { sesion, series } = await detalle(sesionId);
  if (!sesion?.resumen) return;
  const t = series.filter((s) => !s.calentamiento);
  sesion.resumen = {
    ...sesion.resumen,
    volumenKg: Math.round(t.reduce((a, s) => a + (s.kg ?? 0) * (s.reps ?? 0), 0)),
    series: t.length,
    ejercicios: new Set(series.map((s) => s.sesionEjercicioId)).size,
  };
  await db.guardar('sesiones', sesion);
}

export async function editarSerie(serie) {
  await db.guardar('series', serie);
  await actualizarResumen(serie.sesionId);
  await recalcularRecords([serie.ejercicioId]);
}

export async function borrarSerie(serie) {
  await db.borrar('series', serie.id);
  await actualizarResumen(serie.sesionId);
  await recalcularRecords([serie.ejercicioId]);
}

export async function editarSesion(sesion) { return db.guardar('sesiones', sesion); }

export async function borrarSesion(id) {
  const series = await db.porIndice('series', 'sesionId', id);
  await db.transaccion(['sesiones', 'series'], (st) => {
    st.sesiones.delete(id);
    for (const s of series) st.series.delete(s.id);
  });
  await recalcularRecords(series.map((s) => s.ejercicioId));
  return series;
}
