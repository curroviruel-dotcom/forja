// Comida y macros. Funciones puras.

const r1 = (n) => Math.round(n * 10) / 10;

/**
 * Macros de una cantidad de un alimento.
 * @param {{base:'100g'|'racion', kcal:number, prot:number, carb:number, grasa:number}} a  valores por 100 g o por ración
 * @param {number} cantidad  gramos (base 100g) o número de raciones (base racion)
 */
export function macrosDe(a, cantidad) {
  const f = a.base === 'racion' ? cantidad : cantidad / 100;
  return { kcal: Math.round(a.kcal * f), prot: r1(a.prot * f), carb: r1(a.carb * f), grasa: r1(a.grasa * f) };
}

export function sumar(lista) {
  const t = lista.reduce((acc, x) => ({ kcal: acc.kcal + (x.kcal ?? 0), prot: acc.prot + (x.prot ?? 0), carb: acc.carb + (x.carb ?? 0), grasa: acc.grasa + (x.grasa ?? 0) }), { kcal: 0, prot: 0, carb: 0, grasa: 0 });
  return { kcal: Math.round(t.kcal), prot: r1(t.prot), carb: r1(t.carb), grasa: r1(t.grasa) };
}

// Calorías que salen de los macros (para avisar si los datos de un alimento no cuadran)
export const kcalDeMacros = ({ prot, carb, grasa }) => Math.round(prot * 4 + carb * 4 + grasa * 9);

export function cuadra(a) {
  const k = kcalDeMacros(a);
  return a.kcal === 0 ? k < 10 : Math.abs(k - a.kcal) / a.kcal <= 0.2;
}

/**
 * Convierte un producto de Open Food Facts (API pública) en un alimento de Forja (valores por 100 g).
 * Devuelve null si no trae lo mínimo (nombre y calorías o macros).
 */
export function deOpenFoodFacts(p) {
  if (!p) return null;
  const n = p.nutriments ?? {};
  const num = (v) => (v == null || v === '' || !Number.isFinite(Number(v)) ? null : Number(v));
  const prot = num(n.proteins_100g), carb = num(n.carbohydrates_100g), grasa = num(n.fat_100g);
  let kcal = num(n['energy-kcal_100g']);
  if (kcal == null && num(n.energy_100g) != null) kcal = num(n.energy_100g) / 4.184; // viene en kJ
  if (kcal == null && prot != null && carb != null && grasa != null) kcal = kcalDeMacros({ prot, carb, grasa });
  const nombreBase = (p.product_name_es || p.product_name || '').trim();
  if (!nombreBase || kcal == null) return null;
  const marca = (p.brands || '').split(',')[0].trim();
  const racion = num(p.serving_quantity);
  return {
    nombre: marca && !nombreBase.toLowerCase().includes(marca.toLowerCase()) ? `${nombreBase} (${marca})` : nombreBase,
    base: '100g',
    kcal: Math.round(kcal), prot: r1(prot ?? 0), carb: r1(carb ?? 0), grasa: r1(grasa ?? 0),
    gramosRacion: racion && racion > 0 && racion < 2000 ? r1(racion) : null,
    fuente: 'openfoodfacts', codigo: p.code ?? null,
  };
}

export const esCodigoBarras = (t) => /^\d{8,14}$/.test(String(t).replace(/\s/g, ''));

export const MOMENTOS =[['desayuno', 'Desayuno'], ['comida', 'Comida'], ['cena', 'Cena'], ['snack', 'Snacks']];
