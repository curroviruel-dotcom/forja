// Estadísticas de progreso (S13). Funciones puras.
import { diffDias, sumarDias } from './fechas.js';

// Grupos que se enseñan en "series por músculo" (más finos que los filtros de la biblioteca)
export const GRUPOS_SERIES = [
  ['pecho', 'Pecho', ['pecho']],
  ['espalda', 'Espalda', ['espalda_alta', 'dorsal', 'trapecio', 'lumbar']],
  ['hombros', 'Hombros', ['hombro_ant', 'hombro_lat', 'hombro_post']],
  ['biceps', 'Bíceps', ['biceps']],
  ['triceps', 'Tríceps', ['triceps']],
  ['cuadriceps', 'Cuádriceps', ['cuadriceps']],
  ['isquios', 'Isquios', ['isquios']],
  ['gluteo', 'Glúteo', ['gluteo', 'aductores', 'abductores']],
  ['gemelo', 'Gemelo', ['gemelo']],
  ['core', 'Core', ['abdomen', 'oblicuos']],
];
const grupoSerie = (m) => GRUPOS_SERIES.find(([, , ms]) => ms.includes(m))?.[0] ?? null;

// Lunes de la semana de una fecha 'YYYY-MM-DD'
export function lunes(fecha) {
  const [y, m, d] = fecha.split('-').map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0 = domingo
  return sumarDias(fecha, -((dow + 6) % 7));
}

/**
 * Series efectivas por grupo, de media por semana en el periodo.
 * Principal cuenta 1, cada secundario 0,5. Los calentamientos no cuentan.
 * @returns {{id, nombre, series:number}[]}
 */
export function seriesPorGrupo(series, ejercicios, desde, hasta) {
  const semanas = Math.max(1, Math.round((diffDias(desde, hasta) + 1) / 7));
  const total = Object.fromEntries(GRUPOS_SERIES.map(([id]) => [id, 0]));
  for (const s of series) {
    if (s.calentamiento || s.fecha < desde || s.fecha > hasta) continue;
    const e = ejercicios.get(s.ejercicioId);
    if (!e) continue;
    const g = grupoSerie(e.musculo);
    if (g) total[g] += 1;
    const vistos = new Set([g]);
    for (const m of e.secundarios ?? []) {
      const gs = grupoSerie(m);
      if (gs && !vistos.has(gs)) { total[gs] += 0.5; vistos.add(gs); }
    }
  }
  return GRUPOS_SERIES.map(([id, nombre]) => ({ id, nombre, series: Math.round((total[id] / semanas) * 10) / 10 }));
}

// Volumen (kg × reps) por grupo, solo músculo principal
export function volumenPorGrupo(series, ejercicios, desde, hasta) {
  const total = Object.fromEntries(GRUPOS_SERIES.map(([id]) => [id, 0]));
  for (const s of series) {
    if (s.calentamiento || s.fecha < desde || s.fecha > hasta) continue;
    const e = ejercicios.get(s.ejercicioId);
    const g = e && grupoSerie(e.musculo);
    if (g) total[g] += (s.kg ?? 0) * (s.reps ?? 0);
  }
  return GRUPOS_SERIES.map(([id, nombre]) => ({ id, nombre, kg: Math.round(total[id]) }));
}

// Días con entreno o actividad en cada una de las últimas n semanas (la última es la actual)
export function diasPorSemana(fechas, hoy, n = 8) {
  const set = new Set(fechas);
  const actual = lunes(hoy);
  return Array.from({ length: n }, (_, i) => {
    const ini = sumarDias(actual, -7 * (n - 1 - i));
    let dias = 0;
    for (let d = 0; d < 7; d++) if (set.has(sumarDias(ini, d))) dias++;
    return { semana: ini, dias };
  });
}

// Ejercicios más hechos (por número de sesiones distintas)
export function masHechos(series, n = 5) {
  const ses = new Map();
  for (const s of series) {
    if (!ses.has(s.ejercicioId)) ses.set(s.ejercicioId, new Set());
    ses.get(s.ejercicioId).add(s.sesionId);
  }
  return [...ses].map(([id, set]) => ({ id, sesiones: set.size })).sort((a, b) => b.sesiones - a.sesiones).slice(0, n);
}

// Valoración de las series semanales de un músculo (guía general: 10–20 series duras por semana)
export function zona(series) {
  if (series === 0) return 'nada';
  if (series < 10) return 'bajo';
  if (series <= 20) return 'bien';
  return 'alto';
}
