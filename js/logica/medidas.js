// Peso y medidas (S17). Funciones puras.
import { diffDias, sumarDias } from './fechas.js';

export const CAMPOS = [
  ['pesoKg', 'Peso', 'kg', 30, 250],
  ['cintura', 'Cintura', 'cm', 40, 200],
  ['pecho', 'Pecho', 'cm', 50, 200],
  ['brazo', 'Brazo', 'cm', 15, 70],
  ['muslo', 'Muslo', 'cm', 25, 100],
  ['cadera', 'Cadera', 'cm', 50, 200],
];
export const campo = (id) => CAMPOS.find(([c]) => c === id);

const r1 = (n) => Math.round(n * 10) / 10;

// Puntos {fecha, valor} de un campo, en orden de fecha, desde una fecha (opcional)
export function serie(medidas, id, desde = '') {
  return medidas.filter((m) => m[id] != null && m.fecha >= desde).sort((a, b) => a.fecha.localeCompare(b.fecha)).map((m) => ({ fecha: m.fecha, valor: m[id] }));
}

export function ultimo(medidas, id) {
  const s = serie(medidas, id);
  return s.length ? s[s.length - 1] : null;
}

// Cambio del último valor respecto al primero que hay desde `desde` (o el primero de todos)
export function cambio(medidas, id, desde = '') {
  const s = serie(medidas, id, desde);
  if (s.length < 2) return null;
  return { valor: r1(s[s.length - 1].valor - s[0].valor), desde: s[0].fecha, dias: diffDias(s[0].fecha, s[s.length - 1].fecha) };
}

/**
 * Tendencia del peso en kg por semana: media de los últimos 7 días contra la de los 7 anteriores.
 * Así un día de más o de menos (agua, sal) no engaña. null si faltan datos en alguna de las dos semanas.
 */
export function tendenciaSemanal(medidas, hoy) {
  const s = serie(medidas, 'pesoKg');
  const media = (a, b) => { const v = s.filter((p) => p.fecha > a && p.fecha <= b).map((p) => p.valor); return v.length ? v.reduce((x, y) => x + y, 0) / v.length : null; };
  const ahora = media(sumarDias(hoy, -7), hoy);
  const antes = media(sumarDias(hoy, -14), sumarDias(hoy, -7));
  return ahora == null || antes == null ? null : r1(ahora - antes);
}

// Validación de un registro: devuelve {campo: mensaje}
export function validar(m) {
  const err = {};
  for (const [id, nombre, ud, min, max] of CAMPOS) {
    const v = m[id];
    if (v != null && (Number.isNaN(v) || v < min || v > max)) err[id] = `${nombre}: entre ${min} y ${max} ${ud}`;
  }
  if (!CAMPOS.some(([id]) => m[id] != null && !Number.isNaN(m[id]))) err._ = 'Apunta al menos un dato';
  return err;
}
