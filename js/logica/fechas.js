// Fechas como día LOCAL 'YYYY-MM-DD' (el día en que empieza un entreno o actividad).

const dos = (n) => String(n).padStart(2, '0');

export function diaLocal(d = new Date()) {
  return `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}`;
}

// Días entre dos fechas 'YYYY-MM-DD' (b - a). Usa UTC para no tropezar con el cambio de hora.
export function diffDias(a, b) {
  const [y1, m1, d1] = a.split('-').map(Number);
  const [y2, m2, d2] = b.split('-').map(Number);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86400000);
}

export function sumarDias(fecha, n) {
  const [y, m, d] = fecha.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return `${t.getUTCFullYear()}-${dos(t.getUTCMonth() + 1)}-${dos(t.getUTCDate())}`;
}

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

export function fechaCorta(fecha, hoy = diaLocal()) {
  const n = diffDias(fecha, hoy);
  if (n === 0) return 'Hoy';
  if (n === 1) return 'Ayer';
  const [y, m, d] = fecha.split('-').map(Number);
  const dia = DIAS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  if (n > 1 && n < 7) return dia[0].toUpperCase() + dia.slice(1);
  return `${d} ${MESES[m - 1]}${y !== Number(hoy.slice(0, 4)) ? ' ' + y : ''}`;
}

export function duracion(seg) {
  seg = Math.max(0, Math.round(seg));
  const h = Math.floor(seg / 3600), m = Math.floor((seg % 3600) / 60), s = seg % 60;
  return h ? `${h} h ${dos(m)} min` : m >= 10 ? `${m} min` : `${m}:${dos(s)}`;
}

export function reloj(seg) {
  seg = Math.max(0, Math.ceil(seg));
  const h = Math.floor(seg / 3600), m = Math.floor((seg % 3600) / 60), s = seg % 60;
  return h ? `${h}:${dos(m)}:${dos(s)}` : `${m}:${dos(s)}`;
}
