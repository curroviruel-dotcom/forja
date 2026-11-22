// Récords personales. Funciones puras.

// 1RM estimado (Epley). Solo es fiable con pocas repeticiones.
export function unoRM(kg, reps) {
  if (!kg || !reps || reps > 12) return null;
  return reps === 1 ? kg : kg * (1 + reps / 30);
}

/**
 * Compara las series de una sesión con el récord guardado de un ejercicio.
 * @param {object|null} previo  {maxKg, mejor1RM, maxVolumenSesion, maxReps}
 * @param {{kg:number|null, reps:number, calentamiento?:boolean}[]} series
 * @returns {{nuevo:object, batidos:{tipo:string, valor:number}[]}}
 */
export function compararRecords(previo, series) {
  const p = previo ?? {};
  const t = series.filter((s) => !s.calentamiento && s.reps > 0);
  const nuevo = { maxKg: p.maxKg ?? 0, mejor1RM: p.mejor1RM ?? 0, maxVolumenSesion: p.maxVolumenSesion ?? 0, maxReps: p.maxReps ?? 0 };
  const batidos = [];
  if (!t.length) return { nuevo, batidos };

  const maxKg = Math.max(...t.map((s) => s.kg ?? 0));
  const mejor1RM = Math.max(0, ...t.map((s) => unoRM(s.kg, s.reps) ?? 0));
  const volumen = t.reduce((a, s) => a + (s.kg ?? 0) * s.reps, 0);
  const maxReps = Math.max(...t.map((s) => s.reps));
  const hayPrevio = previo != null;

  // Sin récord previo, la primera sesión fija la marca pero no se celebra como "batido".
  if (maxKg > nuevo.maxKg) { if (hayPrevio && maxKg > 0) batidos.push({ tipo: 'peso', valor: maxKg }); nuevo.maxKg = maxKg; }
  if (mejor1RM > nuevo.mejor1RM + 0.01) { if (hayPrevio) batidos.push({ tipo: '1rm', valor: Math.round(mejor1RM * 10) / 10 }); nuevo.mejor1RM = mejor1RM; }
  if (volumen > nuevo.maxVolumenSesion) { if (hayPrevio && volumen > 0) batidos.push({ tipo: 'volumen', valor: volumen }); nuevo.maxVolumenSesion = volumen; }
  if (maxKg === 0 && maxReps > nuevo.maxReps) { if (hayPrevio) batidos.push({ tipo: 'reps', valor: maxReps }); }
  if (maxReps > nuevo.maxReps) nuevo.maxReps = maxReps;
  return { nuevo, batidos };
}

export const NOMBRE_RECORD = { peso: 'Récord de peso', '1rm': 'Mejor 1RM estimado', volumen: 'Récord de volumen', reps: 'Récord de repeticiones' };
