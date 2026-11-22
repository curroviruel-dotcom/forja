// S07 Biblioteca de ejercicios. También es el selector: añadir a una rutina, añadir al entreno o reemplazar.
import { $, $$, esc, ico, cabecera, hoja, toast, vacio, miniatura, MUSCULO } from '../ui.js';
import * as ej from '../datos/ejercicios.js';
import * as entreno from '../datos/entreno.js';
import { estado } from '../datos/estado.js';

// Filtros recordados mientras la app está abierta
const filtro = { texto: '', grupo: null, material: [] };

export default async function ejercicios(el) {
  const e = estado.eleccion;
  const multiple = e && (e.modo === 'rutina' || e.modo === 'entreno');
  const elegidos = new Set(e?.preseleccion ?? []);
  if (e?.grupo !== undefined) { filtro.grupo = e.grupo; filtro.texto = ''; e.grupo = undefined; }

  const salir = () => { const v = e?.volver ?? '#/perfil'; estado.eleccion = null; location.hash = v; };
  cabecera({
    titulo: e ? (['reemplazar', 'rutina-cambiar'].includes(e.modo) ? 'Cambiar por…' : 'Añadir ejercicios') : 'Ejercicios',
    volver: e ? null : '#/perfil',
    accion: '<a class="btn btn--ghost" href="#/ejercicio-nuevo">Crear</a>',
  });
  if (e) {
    // En modo selección, "volver" debe limpiar la elección
    const c = $('#cabecera');
    c.insertAdjacentHTML('afterbegin', `<button class="btn btn--ghost" id="b-cancelar">Cancelar</button>`);
    c.querySelector('.hueco')?.remove();
    $('#b-cancelar').onclick = salir;
  }

  el.innerHTML = `
    <label class="buscar"><span class="sr-only">Buscar ejercicio</span>${ico('search')}
      <input type="search" id="q" placeholder="Buscar ejercicio" autocomplete="off" value="${esc(filtro.texto)}"></label>
    <div class="chips" role="group" aria-label="Músculo">
      <button class="chip" data-grupo="" aria-pressed="${!filtro.grupo}">Todos</button>
      ${ej.MUSCULOS_FILTRO.map(([id, nombre]) => `<button class="chip" data-grupo="${id}" aria-pressed="${filtro.grupo === id}">${nombre}</button>`).join('')}
    </div>
    <div class="chips" role="group" aria-label="Material">
      ${ej.MATERIALES.filter(([m]) => m !== 'banco').map(([id, nombre]) => `<button class="chip chip--sec" data-material="${id}" aria-pressed="${filtro.material.includes(id)}">${nombre}</button>`).join('')}
    </div>
    <p class="muted" id="cuenta" aria-live="polite" style="margin:0;font:var(--t-sm)"></p>
    <div id="lista"></div>
    ${multiple ? '<div class="barra-inferior"><button class="btn btn--lg btn--block" id="b-confirmar" disabled>Añadir</button></div>' : ''}`;

  async function pintarLista() {
    const lista = await ej.listar(filtro);
    $('#cuenta', el).textContent = `${lista.length} ${lista.length === 1 ? 'ejercicio' : 'ejercicios'}`;
    const fila = (x) => `
      <li><button class="fila" data-id="${x.id}" ${multiple ? `aria-pressed="${elegidos.has(x.id)}"` : ''}>
        <span class="ej-card">${miniatura(x)}
          <span><b>${esc(x.nombre)}</b><span>${esc(MUSCULO[x.musculo] ?? '')} · ${esc(x.material.filter((m) => m !== 'banco').map(ej.nombreMaterial).join(', '))}</span></span></span>
        ${x.propio ? '<span class="etiqueta">Tuyo</span>' : ''}
        ${multiple ? `<span class="marca" aria-hidden="true">${ico('check')}</span>` : `<span class="muted">${ico('chevron')}</span>`}
      </button></li>`;
    // Sin búsqueda escrita, la lista va agrupada por músculo (más fácil de recorrer con 130 ejercicios)
    const grupos = filtro.texto ? [['', '', lista]] : ej.MUSCULOS_FILTRO
      .map(([id, nombre]) => [id, nombre, lista.filter((x) => ej.grupoDe(x.musculo) === id)])
      .filter(([, , xs]) => xs.length);
    $('#lista', el).innerHTML = lista.length ? grupos.map(([id, nombre, xs]) => `
      <section aria-label="${esc(nombre || 'Resultados')}">
        ${nombre ? `<h2 class="grupo-titulo">${esc(nombre)} · ${xs.length}</h2>` : ''}
        <ul class="grupo">${xs.map(fila).join('')}</ul>
      </section>`).join('')
      : vacio({ icono: 'search', titulo: 'No hay ningún ejercicio así', texto: 'Prueba con otro nombre o quita filtros. También puedes crearlo tú.', boton: '<a class="btn" href="#/ejercicio-nuevo">Crear ejercicio</a>' });
    actualizarBoton();
  }

  function actualizarBoton() {
    const b = $('#b-confirmar');
    if (!b) return;
    b.disabled = !elegidos.size;
    b.textContent = elegidos.size ? `Añadir ${elegidos.size} ${elegidos.size === 1 ? 'ejercicio' : 'ejercicios'}` : 'Elige uno o más';
  }

  async function elegirUno(id) {
    if (e.modo === 'rutina-cambiar') {
      const re = estado.borrador?.dias.find((d) => d.id === e.diaId)?.ejercicios.find((x) => x.id === e.reId);
      if (re) { re.ejercicioId = id; estado.borrador._cambios = true; }
      salir();
      return;
    }
    if (e.modo !== 'reemplazar') return;
    const sesion = await entreno.obtener(e.sesionId);
    let tambien = false;
    if (sesion?.rutinaId) {
      const r = await hoja({
        titulo: '¿Cambiarlo solo hoy?',
        opciones: [{ valor: 'hoy', texto: 'Solo en este entreno' }, { valor: 'rutina', texto: 'También en mi rutina', estilo: 'sec' }],
      });
      if (!r) return;
      tambien = r === 'rutina';
    }
    await entreno.reemplazar(e.sesionId, e.seId, id, { tambienEnRutina: tambien });
    toast('Ejercicio cambiado');
    salir();
  }

  const onInput = (ev) => { if (ev.target.id === 'q') { filtro.texto = ev.target.value; pintarLista(); } };
  const onClick = async (ev) => {
    const b = ev.target.closest('button');
    if (!b) return;
    if (b.dataset.grupo !== undefined) {
      filtro.grupo = b.dataset.grupo || null;
      $$('[data-grupo]', el).forEach((x) => x.setAttribute('aria-pressed', x === b));
      pintarLista();
    } else if (b.dataset.material) {
      const m = b.dataset.material;
      filtro.material = filtro.material.includes(m) ? filtro.material.filter((x) => x !== m) : [...filtro.material, m];
      b.setAttribute('aria-pressed', filtro.material.includes(m));
      pintarLista();
    } else if (b.dataset.id) {
      const id = b.dataset.id;
      if (!e) { location.hash = `#/ejercicio/${id}`; return; }
      if (!multiple) { elegirUno(id); return; }
      if (elegidos.has(id)) elegidos.delete(id); else elegidos.add(id);
      b.setAttribute('aria-pressed', elegidos.has(id));
      actualizarBoton();
    } else if (b.id === 'b-confirmar') {
      const ids = [...elegidos];
      if (e.modo === 'rutina') {
        const dia = estado.borrador?.dias.find((d) => d.id === e.diaId);
        for (const id of ids) dia?.ejercicios.push({ id: crypto.randomUUID(), ejercicioId: id, series: 3, repMin: 8, repMax: 12, descansoS: 120, superserie: null, notas: '' });
        estado.borrador && (estado.borrador._cambios = true);
      } else if (e.modo === 'entreno') {
        await entreno.anadirEjercicios(e.sesionId, ids);
      }
      salir();
    }
  };
  el.addEventListener('input', onInput);
  el.addEventListener('click', onClick);

  await pintarLista();
  if (filtro.texto) $('#q', el).focus();
  return () => { el.removeEventListener('input', onInput); el.removeEventListener('click', onClick); };
}
