// S06 Editor de rutina. Trabaja sobre un borrador en memoria; nada se guarda hasta pulsar Guardar.
import { $, $$, esc, ico, cabecera, hoja, toast, miniatura, verTecnica, MUSCULO } from '../ui.js';
import * as rutinas from '../datos/rutinas.js';
import { mapaEjercicios } from '../datos/semilla.js';
import { estado } from '../datos/estado.js';
import { grupoDe } from '../datos/ejercicios.js';

const DESCANSOS = [45, 60, 75, 90, 120, 150, 180, 240];
const fmtDesc = (s) => (s < 60 ? `${s} s` : s % 60 ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')} min` : `${s / 60} min`);

export default async function editor(el, id) {
  // Al volver de la biblioteca se mantiene el borrador; si no, se carga de nuevo.
  if (!estado.borrador || estado.borrador._ruta !== id) {
    if (id === 'nueva') {
      estado.borrador = { _ruta: id, nombre: '', origen: 'propia', activa: 0, dias: [{ id: crypto.randomUUID(), nombre: 'Día 1', ejercicios: [] }], _cambios: false };
    } else {
      const r = await rutinas.obtener(id);
      if (!r) { cabecera({ titulo: 'Rutina', volver: '#/rutinas' }); el.innerHTML = '<div class="card vacio"><h2>Esta rutina ya no existe</h2><a class="btn" href="#/rutinas">Mis rutinas</a></div>'; return; }
      estado.borrador = { ...structuredClone(r), _ruta: id, _cambios: false };
    }
  }
  const b = estado.borrador;
  const ejercicios = await mapaEjercicios();
  const marcar = () => { b._cambios = true; };

  cabecera({ titulo: id === 'nueva' ? 'Nueva rutina' : 'Editar rutina', accion: '<button class="btn btn--ghost" id="b-guardar">Guardar</button>' });
  const cab = $('#cabecera');
  cab.insertAdjacentHTML('afterbegin', `<button class="btn btn--icon" id="b-volver" aria-label="Volver">${ico('back')}</button>`);
  cab.querySelector('.hueco')?.remove();

  function filaEjercicio(d, e, i) {
    const x = ejercicios.get(e.ejercicioId);
    const tiempo = x?.tipo === 'tiempo';
    return `
      <li class="re" data-dia="${d.id}" data-ej="${e.id}">
        <div class="re__cab">
          <span class="re__n">${i + 1}</span>
          <button type="button" class="miniatura-btn" data-tecnica="${e.ejercicioId}" aria-label="Ver cómo se hace ${esc(x?.nombre ?? '')}">${miniatura(x)}</button>
          <span style="flex:1;min-width:0"><b>${esc(x?.nombre ?? e.ejercicioId)}</b><br><span class="muted" style="font:var(--t-sm)">${esc(MUSCULO[x?.musculo] ?? '')}</span></span>
          <button type="button" class="btn btn--icon" data-acc="ej" aria-label="Opciones de ${esc(x?.nombre ?? '')}">${ico('more')}</button>
        </div>
        <div class="re__campos">
          <div class="stepper" role="group" aria-label="Series">
            <button type="button" class="btn btn--sec" data-acc="menos" aria-label="Una serie menos">−</button>
            <input class="num" id="s-${e.id}" data-campo="series" inputmode="numeric" value="${e.series}" aria-label="Series">
            <button type="button" class="btn btn--sec" data-acc="mas" aria-label="Una serie más">+</button>
            <span class="muted re__ud" aria-hidden="true">×</span>
          </div>
          <div class="re__reps">
            <input class="num" id="rmin-${e.id}" data-campo="repMin" inputmode="numeric" value="${e.repMin}" aria-label="${tiempo ? 'Segundos mínimos' : 'Repeticiones mínimas'}">
            <span class="muted">–</span>
            <input class="num" id="rmax-${e.id}" data-campo="repMax" inputmode="numeric" value="${e.repMax}" aria-label="${tiempo ? 'Segundos máximos' : 'Repeticiones máximas'}">
            <span class="muted re__ud">${tiempo ? 's' : 'reps'}</span>
          </div>
          <label class="re__desc"><span class="muted re__ud">Descanso</span>
            <select class="num" data-campo="descansoS" aria-label="Descanso">
              ${[...new Set([...DESCANSOS, e.descansoS ?? 120])].sort((p, q) => p - q).map((s) => `<option value="${s}" ${s === (e.descansoS ?? 120) ? 'selected' : ''}>${fmtDesc(s)}</option>`).join('')}
            </select></label>
        </div>
      </li>`;
  }

  function pintar() {
    el.innerHTML = `
      <div class="campo"><label for="r-nombre">Nombre de la rutina</label>
        <input class="input" id="r-nombre" maxlength="60" autocomplete="off" value="${esc(b.nombre)}" placeholder="Por ejemplo: Mi torso-pierna"></div>
      <div id="errores" class="error" role="alert" hidden></div>
      ${b.dias.map((d, di) => `
        <section class="card dia" aria-labelledby="d-${d.id}">
          <div class="fila-flex" style="flex-wrap:nowrap">
            <span class="etiqueta">Día ${di + 1}</span>
            <input class="input input--titulo" id="d-${d.id}" data-dia-nombre="${d.id}" maxlength="40" value="${esc(d.nombre)}" aria-label="Nombre del día ${di + 1}">
            <button type="button" class="btn btn--icon" data-acc="dia" data-dia="${d.id}" aria-label="Opciones del día ${di + 1}">${ico('more')}</button>
          </div>
          ${d.ejercicios.length ? `<ol class="lista-re">${d.ejercicios.map((e, i) => filaEjercicio(d, e, i)).join('')}</ol>`
            : '<p class="muted" style="margin:var(--s-3) 0">Este día aún no tiene ejercicios.</p>'}
          <button type="button" class="btn btn--ghost btn--block" data-acc="anadir" data-dia="${d.id}">${ico('plus')}Añadir ejercicios</button>
        </section>`).join('')}
      <button type="button" class="btn btn--sec btn--block" id="b-dia">${ico('plus')}Añadir día</button>
      ${id !== 'nueva' && !b.activa ? '<button type="button" class="btn btn--block" id="b-activar">Guardar y usar esta rutina</button>' : ''}`;
  }

  const buscar = (li) => {
    const d = b.dias.find((x) => x.id === li.dataset.dia);
    return { d, i: d.ejercicios.findIndex((x) => x.id === li.dataset.ej) };
  };
  const mover = (arr, i, delta) => { const j = i + delta; if (j < 0 || j >= arr.length) return; [arr[i], arr[j]] = [arr[j], arr[i]]; };
  const redibujar = (enfocar) => { const y = scrollY; pintar(); scrollTo(0, y); if (enfocar) $(enfocar, el)?.focus(); };

  async function onClick(ev) {
    const t = ev.target.closest('button');
    if (!t) return;
    if (t.dataset.tecnica) { verTecnica(ejercicios.get(t.dataset.tecnica)); return; }
    const li = t.closest('.re');
    const acc = t.dataset.acc;
    if (acc === 'menos' || acc === 'mas') {
      const { d, i } = buscar(li);
      const e = d.ejercicios[i];
      e.series = Math.min(10, Math.max(1, (Number(e.series) || 1) + (acc === 'mas' ? 1 : -1)));
      $(`#s-${e.id}`, el).value = e.series; marcar();
    } else if (acc === 'ej') {
      const { d, i } = buscar(li);
      const nombre = ejercicios.get(d.ejercicios[i].ejercicioId)?.nombre ?? '';
      const op = await hoja({ titulo: nombre, opciones: [
        { valor: 'sube', texto: 'Subir', estilo: 'sec', deshabilitado: i === 0 },
        { valor: 'baja', texto: 'Bajar', estilo: 'sec', deshabilitado: i === d.ejercicios.length - 1 },
        { valor: 'cambiar', texto: 'Cambiar por otro', estilo: 'sec' },
        { valor: 'quitar', texto: 'Quitar del día', estilo: 'danger' },
      ] });
      if (op === 'sube') mover(d.ejercicios, i, -1);
      else if (op === 'baja') mover(d.ejercicios, i, 1);
      else if (op === 'quitar') d.ejercicios.splice(i, 1);
      else if (op === 'cambiar') {
        estado.eleccion = { modo: 'rutina-cambiar', diaId: d.id, reId: d.ejercicios[i].id, grupo: grupoDe(ejercicios.get(d.ejercicios[i].ejercicioId)?.musculo), volver: `#/rutina/${id}` };
        location.hash = '#/ejercicios'; return;
      } else return;
      marcar(); redibujar();
    } else if (acc === 'anadir') {
      estado.eleccion = { modo: 'rutina', diaId: t.dataset.dia, volver: `#/rutina/${id}` };
      location.hash = '#/ejercicios';
    } else if (acc === 'dia') {
      const di = b.dias.findIndex((x) => x.id === t.dataset.dia);
      const op = await hoja({ titulo: b.dias[di].nombre || `Día ${di + 1}`, opciones: [
        { valor: 'sube', texto: 'Mover antes', estilo: 'sec', deshabilitado: di === 0 },
        { valor: 'baja', texto: 'Mover después', estilo: 'sec', deshabilitado: di === b.dias.length - 1 },
        { valor: 'duplicar', texto: 'Duplicar día', estilo: 'sec' },
        { valor: 'borrar', texto: 'Borrar día', estilo: 'danger' },
      ] });
      if (op === 'sube') mover(b.dias, di, -1);
      else if (op === 'baja') mover(b.dias, di, 1);
      else if (op === 'duplicar') b.dias.splice(di + 1, 0, { id: crypto.randomUUID(), nombre: `${b.dias[di].nombre} (copia)`, ejercicios: b.dias[di].ejercicios.map((e) => ({ ...e, id: crypto.randomUUID() })) });
      else if (op === 'borrar') {
        if (b.dias[di].ejercicios.length) {
          const ok = await hoja({ titulo: '¿Borrar este día?', texto: `Tiene ${b.dias[di].ejercicios.length} ejercicios.`, opciones: [{ valor: 'si', texto: 'Borrar día', estilo: 'danger' }] });
          if (!ok) return;
        }
        b.dias.splice(di, 1);
      } else return;
      marcar(); redibujar();
    } else if (t.id === 'b-dia') {
      const nuevo = { id: crypto.randomUUID(), nombre: `Día ${b.dias.length + 1}`, ejercicios: [] };
      b.dias.push(nuevo); marcar(); redibujar(`#d-${nuevo.id}`);
    } else if (t.id === 'b-activar') {
      guardar(true);
    }
  }

  function onInput(ev) {
    const t = ev.target;
    if (t.id === 'r-nombre') { b.nombre = t.value; marcar(); return; }
    if (t.dataset.diaNombre) { b.dias.find((d) => d.id === t.dataset.diaNombre).nombre = t.value; marcar(); return; }
    const li = t.closest('.re');
    if (li && t.dataset.campo) {
      const { d, i } = buscar(li);
      const v = Number(String(t.value).replace(',', '.'));
      d.ejercicios[i][t.dataset.campo] = Number.isFinite(v) ? Math.round(v) : t.value;
      t.removeAttribute('aria-invalid');
      marcar();
    }
  }

  async function guardar(activar = false) {
    $$('[aria-invalid]', el).forEach((x) => x.removeAttribute('aria-invalid'));
    const limpio = { ...b }; delete limpio._ruta; delete limpio._cambios;
    if (id === 'nueva') delete limpio.id;
    const errores = rutinas.validar(limpio);
    if (errores.length) {
      for (const er of errores) $(`#${er.campo}`, el)?.setAttribute('aria-invalid', 'true');
      if (errores.some((x) => x.campo.startsWith('rmin-'))) for (const er of errores) $(`#${er.campo.replace('rmin-', 'rmax-')}`, el)?.setAttribute('aria-invalid', 'true');
      const box = $('#errores', el);
      box.textContent = [...new Set(errores.map((x) => x.texto))].join('. ') + '.';
      box.hidden = false;
      $(`#${errores[0].campo}`, el)?.focus();
      return;
    }
    const r = await rutinas.guardar(limpio, { activar });
    estado.borrador = null;
    toast(activar ? 'Rutina guardada y en uso' : 'Rutina guardada');
    location.hash = id === 'nueva' ? '#/rutinas' : `#/rutinas`;
    return r;
  }

  async function volver() {
    if (b._cambios) {
      const op = await hoja({ titulo: '¿Salir sin guardar?', texto: 'Perderás los cambios de esta rutina.', opciones: [{ valor: 'guardar', texto: 'Guardar cambios' }, { valor: 'salir', texto: 'Salir sin guardar', estilo: 'danger' }], cancelar: 'Seguir editando' });
      if (op === 'guardar') { guardar(); return; }
      if (op !== 'salir') return;
    }
    estado.borrador = null;
    location.hash = '#/rutinas';
  }

  pintar();
  el.addEventListener('click', onClick);
  el.addEventListener('input', onInput);
  el.addEventListener('change', onInput);
  $('#b-guardar').onclick = () => guardar();
  $('#b-volver').onclick = volver;
  return () => { el.removeEventListener('click', onClick); el.removeEventListener('input', onInput); el.removeEventListener('change', onInput); };
}
