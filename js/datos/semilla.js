// Carga la biblioteca de ejercicios incluida en la app (data/ejercicios.json) la primera vez,
// y la actualiza cuando sube su "version". Los ejercicios propios (propio: true) no se tocan.
import * as db from '../db.js';

let _plantillas;

export async function cargarSemilla() {
  const res = await fetch('./data/ejercicios.json', { cache: 'no-cache' });
  const { version, ejercicios } = await res.json();
  if ((await db.ajuste('semillaVersion', 0)) >= version) return;
  await db.transaccion(['ejercicios'], ({ ejercicios: s }) => {
    // "orden" conserva la preferencia del JSON (IndexedDB devuelve por id, no por orden de inserción)
    ejercicios.forEach((e, orden) => s.put(db.sellar({ ...e, orden, propio: false, semillaVersion: version })));
  });
  await db.fijarAjuste('semillaVersion', version);
}

export async function plantillas() {
  if (!_plantillas) _plantillas = (await (await fetch('./data/plantillas.json')).json()).plantillas;
  return _plantillas;
}

let _ejercicios;
export async function mapaEjercicios(forzar = false) {
  if (!_ejercicios || forzar) _ejercicios = new Map((await db.todos('ejercicios')).map((e) => [e.id, e]));
  return _ejercicios;
}
