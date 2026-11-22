// Generador de rutinas: función pura. Recibe el perfil del cuestionario y el catálogo de ejercicios
// y devuelve una rutina normal (editable después en S06). Sin aleatoriedad salvo la "semilla" de regenerar.

export const LUGARES = {
  gimnasio: ['barra', 'mancuerna', 'maquina', 'polea', 'multipower', 'banco', 'barra_dominadas', 'kettlebell', 'banda', 'sin_material'],
  casa_mancuernas: ['mancuerna', 'banda', 'sin_material'], // el banco no se da por hecho
  sin_material: ['sin_material'],
};

export function materialDisponible(perfil) {
  const m = new Set(LUGARES[perfil.lugar] ?? LUGARES.gimnasio);
  if (perfil.barraDominadas) m.add('barra_dominadas');
  return m;
}

const COMPUESTOS = new Set(['empuje_h', 'empuje_v', 'empuje_v_alt', 'tiron_v', 'tiron_h', 'sentadilla', 'bisagra', 'zancada']);

// Cada hueco es una lista de patrones: se usa el primero que tenga algún ejercicio posible.
// "v" elige la 2ª opción del patrón si existe (para que A y B no sean idénticos).
const H = (...patrones) => ({ patrones, v: 0 });
const H2 = (...patrones) => ({ patrones, v: 1 });

const DIAS = {
  fbA: ['Cuerpo completo A', [H('sentadilla'), H('empuje_h'), H('tiron_h'), H('bisagra'), H('empuje_v'), H('core')]],
  fbB: ['Cuerpo completo B', [H('bisagra'), H('tiron_v', 'tiron_h'), H2('empuje_h'), H2('sentadilla', 'zancada'), H('hombro_lat', 'hombro_post'), H('biceps')]],
  fbC: ['Cuerpo completo C', [H('zancada', 'sentadilla'), H2('empuje_v', 'empuje_h'), H2('tiron_h'), H('gluteo', 'bisagra'), H('triceps'), H('core')]],
  torsoA: ['Torso A', [H('empuje_h'), H('tiron_h'), H('empuje_v'), H('tiron_v', 'tiron_h'), H('biceps'), H('triceps')]],
  piernaA: ['Pierna A', [H('sentadilla'), H('bisagra'), H('cuad_aisl', 'zancada'), H('isq_aisl', 'gluteo'), H('gemelo'), H('core')]],
  torsoB: ['Torso B', [H2('empuje_h'), H('tiron_v', 'tiron_h'), H2('tiron_h'), H('hombro_lat'), H('pecho_aisl', 'empuje_v_alt'), H2('biceps')]],
  piernaB: ['Pierna B', [H2('sentadilla'), H('gluteo', 'bisagra'), H('zancada', 'sentadilla'), H('isq_aisl', 'bisagra'), H('gemelo'), H2('core')]],
  empuje: ['Empuje', [H('empuje_h'), H('empuje_v'), H2('empuje_h'), H('hombro_lat'), H('triceps'), H('pecho_aisl', 'empuje_v_alt')]],
  tiron: ['Tirón', [H('tiron_v', 'tiron_h'), H('tiron_h'), H2('tiron_h'), H('hombro_post'), H('biceps'), H2('biceps')]],
  pierna: ['Pierna', [H('sentadilla'), H('bisagra'), H('zancada', 'sentadilla'), H('cuad_aisl'), H('isq_aisl', 'gluteo'), H('gemelo')]],
};

const PLAN = {
  2: ['fbA', 'fbB'],
  3: ['fbA', 'fbB', 'fbC'],
  4: ['torsoA', 'piernaA', 'torsoB', 'piernaB'],
  5: ['empuje', 'tiron', 'pierna', 'torsoA', 'piernaB'],
  6: ['empuje', 'tiron', 'pierna', 'empuje', 'tiron', 'pierna'],
};

// Sin material casi no hay ejercicios de tirón: un día "Tirón" quedaría vacío. Se usa cuerpo completo.
const PLAN_SIN_MATERIAL = { 5: ['fbA', 'fbB', 'fbC', 'fbA', 'fbB'], 6: ['fbA', 'fbB', 'fbC', 'fbA', 'fbB', 'fbC'] };
// Si un día se queda corto (por falta de material), se rellena con estos patrones.
const RELLENO = ['core', 'empuje_v_alt', 'triceps', 'gemelo', 'bisagra', 'sentadilla', 'empuje_v', 'tiron_h', 'empuje_h'];
const MINIMO_POR_DIA = 4;

export const NOMBRE_PLAN = { 2: 'Cuerpo completo', 3: 'Cuerpo completo', 4: 'Torso / Pierna', 5: 'Empuje / Tirón / Pierna + Torso / Pierna', 6: 'Empuje / Tirón / Pierna' };

function seriesYReps(ej, patron, perfil) {
  const comp = COMPUESTOS.has(patron);
  const novato = perfil.experiencia === 'novato';
  let series = 3, repMin, repMax, descansoS;
  if (ej.tipo === 'tiempo') { repMin = 30; repMax = 60; descansoS = 60; }
  else if (ej.tipo === 'reps') { repMin = comp ? 6 : 10; repMax = comp ? 12 : 20; descansoS = comp ? 120 : 75; }
  else if (perfil.objetivo === 'fuerza' && comp) { series = 4; repMin = 4; repMax = 6; descansoS = 180; }
  else if (comp) { repMin = 8; repMax = 12; descansoS = 150; }
  else { repMin = 10; repMax = 15; descansoS = 90; }
  if (novato) series = Math.max(2, series - 1);
  return { series, repMin, repMax, descansoS };
}

const puede = (ej, disponible) => ej.material.every((m) => disponible.has(m));

/**
 * @param {{diasSemana:number, lugar:string, barraDominadas?:boolean, objetivo:string, experiencia:string}} perfil
 * @param {object[]} catalogo  ejercicios con {id, patron, material, tipo, nombre}
 * @param {number} [semilla]   0 = la opción preferida; otro número = baraja dentro de cada patrón
 */
export function generarRutina(perfil, catalogo, semilla = 0) {
  const dias = Math.min(6, Math.max(2, perfil.diasSemana | 0));
  const disponible = materialDisponible(perfil);
  const porPatron = new Map();
  const ordenado = catalogo.map((e, i) => ({ e, o: e.orden ?? i })).sort((a, b) => a.o - b.o).map((x) => x.e);
  for (const e of ordenado) {
    if (!e.patron || e.propio || !puede(e, disponible)) continue;
    if (!porPatron.has(e.patron)) porPatron.set(e.patron, []);
    porPatron.get(e.patron).push(e);
  }

  const sinMaterial = perfil.lugar === 'sin_material';
  const claves = (sinMaterial && PLAN_SIN_MATERIAL[dias]) || PLAN[dias];

  const plan = claves.map((clave) => {
    const [nombre, huecos] = DIAS[clave];
    const usadosDia = new Set();
    const ejercicios = [];
    const poner = (p, v) => {
      const ops = (porPatron.get(p) ?? []).filter((e) => !usadosDia.has(e.id));
      if (!ops.length) return false;
      const ej = ops[(v + semilla) % ops.length];
      usadosDia.add(ej.id);
      ejercicios.push({ ejercicioId: ej.id, ...seriesYReps(ej, p, perfil) });
      return true;
    };
    for (const h of huecos) h.patrones.some((p) => poner(p, h.v));
    for (const p of RELLENO) { if (ejercicios.length >= MINIMO_POR_DIA) break; poner(p, 0); }
    return { nombre, ejercicios };
  });

  // Días repetidos en el plan (PPL x2): numerarlos para distinguirlos
  const cuenta = {};
  for (const d of plan) cuenta[d.nombre] = (cuenta[d.nombre] ?? 0) + 1;
  const visto = {};
  for (const d of plan) if (cuenta[d.nombre] > 1) d.nombre = `${d.nombre} ${(visto[d.nombre] = (visto[d.nombre] ?? 0) + 1)}`;

  const nombrePlan = sinMaterial && PLAN_SIN_MATERIAL[dias] ? NOMBRE_PLAN[2] : NOMBRE_PLAN[dias];
  return { nombre: `${nombrePlan} (${dias} días)`, origen: 'generada', dias: plan };
}

// Objetivos de comida (Mifflin-St Jeor). Se usará en el módulo de comida; aquí porque sale del mismo perfil.
export function objetivosComida({ sexo, pesoKg, alturaCm, edad, diasSemana, objetivo }) {
  if (!pesoKg || !alturaCm || !edad) return null;
  const tmb = 10 * pesoKg + 6.25 * alturaCm - 5 * edad + (sexo === 'mujer' ? -161 : 5);
  const factor = diasSemana >= 5 ? 1.6 : diasSemana >= 3 ? 1.5 : 1.4;
  const ajuste = objetivo === 'perder_grasa' ? 0.8 : objetivo === 'musculo' ? 1.1 : 1;
  const kcal = Math.round((tmb * factor * ajuste) / 10) * 10;
  const prot = Math.round(pesoKg * (objetivo === 'perder_grasa' ? 2.2 : 1.8));
  const grasa = Math.round(pesoKg * 0.9);
  const carb = Math.max(0, Math.round((kcal - prot * 4 - grasa * 9) / 4));
  return { kcal, prot, carb, grasa };
}
