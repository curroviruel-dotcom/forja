// S16 Crear o editar un ejercicio propio.
import { $, $$, esc, ico, cabecera, toast, MUSCULO } from '../ui.js';
import * as ej from '../datos/ejercicios.js';
import { estado } from '../datos/estado.js';

export default async function ejercicioForm(el, id = null) {
  const previo = id ? await ej.obtener(id) : null;
  if (id && !previo?.propio) { location.hash = id ? `#/ejercicio/${id}` : '#/ejercicios'; return; }
  const e = previo ?? { nombre: '', musculo: '', secundarios: [], material: [], tipo: 'peso_reps' };
  cabecera({ titulo: id ? 'Editar ejercicio' : 'Nuevo ejercicio', volver: 'javascript:history.back()' });

  const musculos = Object.keys(MUSCULO);
  el.innerHTML = `
    <form id="f-ej" class="pila" novalidate>
      <div class="campo"><label for="nombre">Nombre</label>
        <input class="input" id="nombre" maxlength="60" autocomplete="off" value="${esc(e.nombre)}" placeholder="Por ejemplo: Remo en máquina" aria-describedby="e-nombre">
        <span class="error" id="e-nombre" hidden></span></div>

      <div class="campo"><label for="musculo">Músculo principal</label>
        <select class="input" id="musculo" aria-describedby="e-musculo">
          <option value="">Elige uno</option>
          ${ej.MUSCULOS_FILTRO.map(([, grupo, ms]) => `<optgroup label="${grupo}">${ms.map((m) => `<option value="${m}" ${e.musculo === m ? 'selected' : ''}>${esc(MUSCULO[m])}</option>`).join('')}</optgroup>`).join('')}
        </select><span class="error" id="e-musculo" hidden></span></div>

      <fieldset class="opciones"><legend class="campo-legend">Músculos secundarios (opcional)</legend>
        <div class="chips chips--wrap" role="group">
          ${musculos.map((m) => `<button type="button" class="chip" data-sec="${m}" aria-pressed="${e.secundarios.includes(m)}">${esc(MUSCULO[m])}</button>`).join('')}
        </div></fieldset>

      <fieldset class="opciones" aria-describedby="e-material"><legend class="campo-legend">Material</legend>
        <div class="chips chips--wrap" role="group">
          ${ej.MATERIALES.map(([m, n]) => `<button type="button" class="chip" data-mat="${m}" aria-pressed="${e.material.includes(m)}">${esc(n)}</button>`).join('')}
        </div><span class="error" id="e-material" hidden></span></fieldset>

      <fieldset class="opciones"><legend class="campo-legend">Cómo se mide</legend>
        ${ej.TIPOS.map(([t, n]) => `<label class="opcion"><input type="radio" name="tipo" value="${t}" ${e.tipo === t ? 'checked' : ''}><span class="opcion__txt"><b>${esc(n)}</b></span>${ico('check')}</label>`).join('')}
      </fieldset>

      <button class="btn btn--lg btn--block" type="submit">${id ? 'Guardar cambios' : 'Crear ejercicio'}</button>
    </form>`;

  const f = $('#f-ej', el);
  const sec = new Set(e.secundarios), mat = new Set(e.material);
  f.addEventListener('click', (ev) => {
    const b = ev.target.closest('button[type="button"]');
    if (!b) return;
    const [set, val] = b.dataset.sec ? [sec, b.dataset.sec] : [mat, b.dataset.mat];
    if (set.has(val)) set.delete(val); else set.add(val);
    b.setAttribute('aria-pressed', set.has(val));
  });

  const error = (campo, texto, input) => {
    const s = $(`#e-${campo}`, el); s.textContent = texto; s.hidden = !texto;
    if (input) { if (texto) input.setAttribute('aria-invalid', 'true'); else input.removeAttribute('aria-invalid'); }
    return !texto;
  };

  f.onsubmit = async (ev) => {
    ev.preventDefault();
    const nombre = $('#nombre', el).value.trim();
    const musculo = $('#musculo', el).value;
    let ok = error('nombre', !nombre ? 'Escribe un nombre.' : (await ej.existeNombre(nombre, id)) ? 'Ya hay un ejercicio con ese nombre.' : '', $('#nombre', el));
    ok = error('musculo', musculo ? '' : 'Elige el músculo principal.', $('#musculo', el)) && ok;
    ok = error('material', mat.size ? '' : 'Elige al menos un material (o "Sin material").') && ok;
    if (!ok) {
      const malo = el.querySelector('[aria-invalid="true"]');
      if (malo) malo.focus(); else $('#e-material', el).scrollIntoView({ block: 'center' });
      return;
    }
    const guardado = await ej.guardarPropio({
      ...(previo ?? {}), nombre, musculo, secundarios: [...sec].filter((m) => m !== musculo), material: [...mat],
      tipo: f.querySelector('input[name="tipo"]:checked')?.value ?? 'peso_reps', claves: previo?.claves ?? [],
    });
    toast(id ? 'Cambios guardados' : 'Ejercicio creado');
    // Si veníamos de elegir ejercicios, se vuelve a la lista con el nuevo ya marcado
    if (!id && estado.eleccion) {
      if (['reemplazar', 'rutina-cambiar'].includes(estado.eleccion.modo)) { location.hash = '#/ejercicios'; return; }
      estado.eleccion.preseleccion = [...(estado.eleccion.preseleccion ?? []), guardado.id];
      location.hash = '#/ejercicios';
      return;
    }
    location.hash = `#/ejercicio/${guardado.id}`;
  };
}
