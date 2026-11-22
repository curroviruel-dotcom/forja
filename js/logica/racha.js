// Racha: cada día con entreno O actividad suma 1. Se permiten hasta 2 días de descanso seguidos;
// el 3º la rompe. Función pura.
import { diffDias } from './fechas.js';

export const DESCANSOS_PERMITIDOS = 2;

/**
 * @param {string[]} fechas  días 'YYYY-MM-DD' con entreno o actividad (con repetidos, en cualquier orden)
 * @param {string} hoy       'YYYY-MM-DD'
 * @returns {{dias:number, estado:'activa'|'en_riesgo'|'rota'|'nueva', ultimo:string|null}}
 */
export function calcularRacha(fechas, hoy) {
  const dias = [...new Set(fechas)].filter((f) => f <= hoy).sort().reverse();
  if (!dias.length) return { dias: 0, estado: 'nueva', ultimo: null };

  const desdeUltimo = diffDias(dias[0], hoy);
  if (desdeUltimo > DESCANSOS_PERMITIDOS) return { dias: 0, estado: 'rota', ultimo: dias[0] };

  let n = 1;
  for (let i = 1; i < dias.length; i++) {
    if (diffDias(dias[i], dias[i - 1]) - 1 > DESCANSOS_PERMITIDOS) break;
    n++;
  }
  return { dias: n, estado: desdeUltimo === DESCANSOS_PERMITIDOS ? 'en_riesgo' : 'activa', ultimo: dias[0] };
}
