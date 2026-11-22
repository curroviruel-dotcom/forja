// S05 Mis rutinas: lista, activar, duplicar, borrar, crear.
import { esc, ico, cabecera, hoja, toast, vacio } from '../ui.js';
import * as rutinas from '../datos/rutinas.js';
import { plantillas } from '../datos/semilla.js';

export default async function vistaRutinas(el) {
  cabecera({ titulo: 'Mis rutinas', volver: 'javascript:history.back()', accion: '<a class="btn btn--ghost" href="#/rutina/nueva">Nueva</a>' });
  const [lista, ps] = await Promise.all([rutinas.listar(), plantillas()]);

  el.innerHTML = `
    ${lista.length ? lista.map((r) => `
      <article class="card card--fila" aria-labelledby="r-${r.id}">
        <a class="card__enlace" href="#/rutina/${r.id}">
          <span style="flex:1;min-width:0">
            <span class="fila-flex">${r.activa ? '<span class="etiqueta etiqueta--acento">En uso</span>' : ''}</span>
            <h2 class="card__titulo" id="r-${r.id}">${esc(r.nombre)}</h2>
            <span class="card__meta" style="display:block;margin:0">${r.dias.length} ${r.dias.length === 1 ? 'día' : 'días'} · ${r.dias.reduce((a, d) => a + d.ejercicios.length, 0)} ejercicios</span>
          </span>
          <span class="muted">${ico('chevron')}</span>
        </a>
        <button class="btn btn--icon" data-mas="${r.id}" aria-label="Opciones de ${esc(r.nombre)}">${ico('more')}</button>
      </article>`).join('')
    : vacio({ icono: 'lista', titulo: 'No tienes ninguna rutina', texto: 'Crea una con el cuestionario, desde una plantilla o desde cero.' })}

    <section class="pila">
      <h2 class="grupo-titulo">Crear otra</h2>
      <a class="btn btn--block" href="#/cuestionario/1">Con el cuestionario</a>
      <a class="btn btn--sec btn--block" href="#/rutina/nueva">Desde cero</a>
      ${ps.map((p) => `<button class="btn btn--sec btn--block" data-plantilla="${p.id}">Plantilla: ${esc(p.nombre)}</button>`).join('')}
    </section>`;

  el.querySelectorAll('[data-plantilla]').forEach((b) => b.onclick = async () => {
    const hayActiva = !!(await rutinas.activa());
    const r = await rutinas.desdePlantilla(b.dataset.plantilla);
    if (hayActiva) toast('Plantilla añadida y puesta en uso');
    location.hash = `#/rutina/${r.id}`;
  });

  el.querySelectorAll('[data-mas]').forEach((b) => b.onclick = async () => {
    const r = lista.find((x) => x.id === b.dataset.mas);
    const op = await hoja({
      titulo: r.nombre,
      opciones: [
        { valor: 'activar', texto: r.activa ? 'Ya está en uso' : 'Usar esta rutina', deshabilitado: !!r.activa },
        { valor: 'duplicar', texto: 'Duplicar', estilo: 'sec' },
        { valor: 'borrar', texto: 'Borrar rutina', estilo: 'danger' },
      ],
    });
    if (op === 'activar') { await rutinas.activar(r.id); toast(`«${r.nombre}» en uso. Empieza por el día 1.`); }
    else if (op === 'duplicar') { await rutinas.duplicar(r.id); toast('Rutina duplicada'); }
    else if (op === 'borrar') {
      const ok = await hoja({ titulo: `¿Borrar «${r.nombre}»?`, texto: 'Tus entrenos hechos con ella se quedan en el historial.', opciones: [{ valor: 'si', texto: 'Borrar rutina', estilo: 'danger' }] });
      if (!ok) return;
      await rutinas.borrar(r.id);
      toast('Rutina borrada');
    } else return;
    vistaRutinas(el);
  });
}
