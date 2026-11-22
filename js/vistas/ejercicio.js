// S08 Ficha de ejercicio: técnica, músculos, récords, gráfica e historial.
import * as db from '../db.js';
import { $, esc, ico, cabecera, hoja, toast, fotoEjercicio, MUSCULO } from '../ui.js';
import * as ej from '../datos/ejercicios.js';
import { historialEjercicio } from '../datos/entreno.js';
import { fechaCorta } from '../logica/fechas.js';
import { fmtKg } from '../logica/progresion.js';
import { unoRM } from '../logica/records.js';
import { graficaLinea } from '../grafica.js';

export default async function ejercicio(el, id) {
  const e = await ej.obtener(id);
  cabecera({ titulo: e?.nombre ?? 'Ejercicio', volver: 'javascript:history.back()' });
  if (!e) { el.innerHTML = '<div class="card vacio"><h2>No encontramos este ejercicio</h2><a class="btn" href="#/ejercicios">Ir a la biblioteca</a></div>'; return; }

  const [hist, rec] = await Promise.all([historialEjercicio(id), db.obtener('records', id)]);
  const conPeso = ['peso_reps', 'asistido'].includes(e.tipo);
  const unidad = e.tipo === 'tiempo' ? 's' : 'reps';
  const trabajo = (ss) => ss.filter((s) => !s.calentamiento);

  // Gráfica: 1RM estimado por sesión (con peso) o mejor serie (sin peso), en orden cronológico
  const puntos = [...hist].reverse().map((h) => {
    const t = trabajo(h.series);
    const y = conPeso ? Math.max(0, ...t.map((s) => unoRM(s.kg, s.reps) ?? s.kg ?? 0)) : Math.max(0, ...t.map((s) => s.reps));
    return { x: fechaCorta(h.fecha), y };
  }).filter((p) => p.y > 0).slice(-20);

  const serieTxt = (s) => (conPeso && s.kg != null ? `${fmtKg(s.kg)} × ${s.reps}` : `${s.reps} ${unidad}`);

  el.innerHTML = `
    ${fotoEjercicio(e)}
    <div class="fila-flex">
      <span class="etiqueta">${esc(MUSCULO[e.musculo] ?? e.musculo)}</span>
      ${e.secundarios.map((m) => `<span class="etiqueta">${esc(MUSCULO[m] ?? m)}</span>`).join('')}
      ${e.material.map((m) => `<span class="etiqueta">${esc(ej.nombreMaterial(m))}</span>`).join('')}
      ${e.propio ? '<span class="etiqueta">Tuyo</span>' : ''}
    </div>

    ${e.claves?.length ? `
    <section class="card" aria-labelledby="t-tec">
      <h2 class="card__titulo" id="t-tec">Claves de técnica</h2>
      <ol class="claves">${e.claves.map((c) => `<li>${esc(c)}</li>`).join('')}</ol>
    </section>` : ''}

    <section class="card" aria-labelledby="t-rec">
      <h2 class="card__titulo" id="t-rec">Tus récords</h2>
      ${rec ? `<div class="datos">
        ${conPeso ? `<div class="dato"><b>${fmtKg(rec.maxKg)}</b><span>kg máximo</span></div>
        <div class="dato"><b>${fmtKg(Math.round(rec.mejor1RM * 10) / 10)}</b><span>1RM estimado</span></div>
        <div class="dato"><b>${Math.round(rec.maxVolumenSesion).toLocaleString('es')}</b><span>kg en un día</span></div>`
        : `<div class="dato"><b>${rec.maxReps}</b><span>mejor serie (${unidad})</span></div>`}
      </div>` : '<p class="card__meta" style="margin:0">Aún no lo has hecho. Tus récords saldrán aquí.</p>'}
    </section>

    <section class="card" aria-labelledby="t-prog">
      <h2 class="card__titulo" id="t-prog">Progreso</h2>
      ${puntos.length >= 2
        ? graficaLinea(puntos, { titulo: conPeso ? '1RM estimado' : 'Mejor serie', unidad: conPeso ? 'kg' : unidad })
        : `<p class="card__meta" style="margin:0">Haz este ejercicio en dos entrenos para ver tu curva.</p>`}
    </section>

    <section aria-labelledby="t-hist">
      <h2 class="titulo-seccion" id="t-hist">Historial</h2>
      ${hist.length ? `<ul class="grupo" style="margin-top:var(--s-2)">${hist.slice(0, 15).map((h) => `
        <li class="fila"><span>${esc(fechaCorta(h.fecha))}</span>
          <span class="fila__valor" style="text-align:right">${trabajo(h.series).map(serieTxt).map(esc).join(' · ')}</span></li>`).join('')}</ul>`
        : '<p class="muted" style="margin:var(--s-2) 0 0">Todavía no hay series de este ejercicio.</p>'}
    </section>

    ${e.propio ? `<div class="pila">
      <a class="btn btn--sec btn--block" href="#/ejercicio-editar/${e.id}">Editar ejercicio</a>
      <button class="btn btn--ghost btn--block" id="b-borrar" style="color:var(--c-danger)">Borrar ejercicio</button></div>` : ''}`;

  $('#b-borrar', el)?.addEventListener('click', async () => {
    const r = await hoja({ titulo: `¿Borrar «${e.nombre}»?`, texto: 'Si ya lo usaste, se ocultará de la biblioteca pero tu historial se queda.', opciones: [{ valor: 'si', texto: 'Borrar ejercicio', estilo: 'danger' }] });
    if (!r) return;
    const res = await ej.borrarPropio(e.id);
    toast(res === 'oculto' ? 'Ejercicio ocultado (tu historial se mantiene)' : 'Ejercicio borrado');
    location.hash = '#/ejercicios';
  });
}
