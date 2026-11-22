// Sobrecarga progresiva: doble progresión. Función pura, sin DOM ni base de datos.
// Regla (replica/architecture.md):
//   sin datos                          -> sin_datos
//   todas las series al tope del rango -> subir_peso (+incremento, vuelve al mínimo de reps)
//   todas dentro del rango             -> subir_reps (+1 rep por serie, sin pasar del tope)
//   alguna por debajo del mínimo       -> mantener
//   por debajo del mínimo 2 sesiones   -> bajar (-10 %, redondeado al incremento)
//   RPE 10 en todas las series          bloquea subir_peso (pasa a mantener en el tope)

export const INCREMENTOS = { barra: 2.5, mancuerna: 2, maquina: 5, polea: 2.5, kettlebell: 4, defecto: 2.5 };

export function incrementoPara(material = [], tabla = INCREMENTOS) {
  for (const m of ['barra', 'mancuerna', 'kettlebell', 'polea', 'maquina']) if (material.includes(m)) return tabla[m];
  return tabla.defecto;
}

export function redondear(kg, inc) {
  return Math.max(0, Math.round(kg / inc) * inc);
}

const trabajo = (series) => (series ?? []).filter((s) => !s.calentamiento && s.reps > 0);

/**
 * @param {object} p
 * @param {{kg:number|null, reps:number, rpe?:number}[]} p.ultima     series de la última sesión con el ejercicio
 * @param {{kg:number|null, reps:number}[]} [p.penultima]          series de la sesión anterior a esa
 * @param {number} p.repMin
 * @param {number} p.repMax
 * @param {number} p.nSeries                                         series previstas hoy
 * @param {number} [p.incremento]
 * @param {'peso_reps'|'reps'|'tiempo'|'asistido'|'distancia'} [p.tipo]
 * @returns {{motivo:string, texto:string, series:{kg:number|null, reps:number|null}[]}}
 */
export function sugerir({ ultima, penultima = [], repMin, repMax, nSeries, incremento = 2.5, tipo = 'peso_reps' }) {
  const u = trabajo(ultima);
  const lista = (f) => Array.from({ length: nSeries }, (_, i) => f(i));

  if (tipo === 'distancia') return { motivo: 'sin_datos', texto: '', series: lista(() => ({ kg: null, reps: null })) };
  if (!u.length) {
    const texto = tipo === 'peso_reps' ? 'Primera vez: elige un peso cómodo' : tipo === 'tiempo' ? 'Primera vez: aguanta lo que puedas' : 'Primera vez: apunta las que hagas';
    return { motivo: 'sin_datos', texto, series: lista(() => ({ kg: null, reps: repMax })) };
  }

  const conPeso = tipo === 'peso_reps' || tipo === 'asistido';
  const kg = conPeso ? Math.max(...u.map((s) => s.kg ?? 0)) : null;
  const repsDe = (i) => (u[i] ?? u[u.length - 1]).reps;
  const debajo = (s) => s.reps < repMin;
  const completas = u.length >= nSeries;
  const todasTope = completas && u.every((s) => s.reps >= repMax);
  const agotado = u.every((s) => s.rpe === 10);

  if (todasTope && agotado) {
    return { motivo: 'mantener', texto: 'Mantén: llegaste al tope pero al límite', series: lista(() => ({ kg, reps: repMax })) };
  }
  if (todasTope) {
    if (!conPeso) return { motivo: 'subir_reps', texto: `Sube a ${repMax + 1}: dominas el rango`, series: lista(() => ({ kg, reps: repMax + 1 })) };
    // asistido: menos asistencia = progreso
    const nuevo = tipo === 'asistido' ? redondear(kg - incremento, incremento) : redondear(kg + incremento, incremento);
    return {
      motivo: 'subir_peso',
      texto: tipo === 'asistido' ? `Baja la ayuda a ${fmtKg(nuevo)} kg` : `Sube a ${fmtKg(nuevo)} kg: hiciste ${repMax} en todas`,
      series: lista(() => ({ kg: nuevo, reps: repMin })),
    };
  }
  if (u.some(debajo)) {
    const p = trabajo(penultima);
    if (conPeso && kg > 0 && p.length && p.some(debajo)) {
      const nuevo = tipo === 'asistido' ? redondear(kg * 1.1, incremento) : redondear(kg * 0.9, incremento);
      return { motivo: 'bajar', texto: `Baja a ${fmtKg(nuevo)} kg y vuelve a subir`, series: lista(() => ({ kg: nuevo, reps: repMin })) };
    }
    return { motivo: 'mantener', texto: conPeso ? `Mantén ${fmtKg(kg)} kg hasta llegar a ${repMin}` : `Intenta llegar a ${repMin}`, series: lista(() => ({ kg, reps: repMin })) };
  }
  return {
    motivo: 'subir_reps',
    texto: 'Una repetición más que la última vez',
    series: lista((i) => ({ kg, reps: Math.min(repsDe(i) + 1, repMax) })),
  };
}

export function fmtKg(kg) {
  if (kg == null) return '';
  return Number.isInteger(kg) ? String(kg) : kg.toFixed(2).replace(/0+$/, '').replace('.', ',');
}

export function leerNumero(texto) {
  if (texto == null || String(texto).trim() === '') return null;
  const n = Number(String(texto).replace(',', '.'));
  return Number.isFinite(n) ? n : NaN;
}
