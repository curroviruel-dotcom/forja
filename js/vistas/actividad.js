// S19 Registrar otra actividad (añadido por el usuario). Cuenta para la racha.
import { $, esc, cabecera, toast } from '../ui.js';
import * as act from '../datos/actividades.js';
import { diaLocal } from '../logica/fechas.js';
import { leerNumero } from '../logica/progresion.js';

export default async function actividad(el) {
  cabecera({ titulo: 'Otra actividad', volver: '#/' });
  const hoy = diaLocal();
  el.innerHTML = `
    <form id="f-act" class="pila" novalidate>
      <fieldset class="opciones deportes" aria-describedby="e-dep">
        <legend style="grid-column:1/-1;font:var(--t-lg)">¿Qué has hecho?</legend>
        ${act.DEPORTES.map((d, i) => `
          <label class="opcion"><input type="radio" name="deporte" value="${d.id}" ${i === 0 ? 'checked' : ''}>
          <span class="opcion__txt"><b>${esc(d.nombre)}</b></span></label>`).join('')}
      </fieldset>
      <span class="error" id="e-dep" hidden></span>

      <div class="campo" id="c-otro" hidden>
        <label for="nombre">¿Cómo se llama?</label>
        <input class="input" id="nombre" name="nombre" maxlength="40" autocomplete="off" placeholder="Por ejemplo: remo, surf, crossfit">
      </div>

      <div class="campo">
        <label for="minutos">Minutos</label>
        <input class="input" id="minutos" name="minutos" inputmode="numeric" required placeholder="60" aria-describedby="e-min">
        <span class="error" id="e-min" hidden></span>
      </div>

      <div class="campo" id="c-km">
        <label for="km">Kilómetros (opcional)</label>
        <input class="input" id="km" name="km" inputmode="decimal" placeholder="5,2" aria-describedby="e-km">
        <span class="error" id="e-km" hidden></span>
      </div>

      <div class="campo">
        <label for="fecha">Día</label>
        <input class="input" id="fecha" name="fecha" type="date" value="${hoy}" max="${hoy}" required>
      </div>

      <div class="campo">
        <label for="notas">Notas (opcional)</label>
        <input class="input" id="notas" name="notas" maxlength="120" autocomplete="off" placeholder="Partido con amigos">
      </div>

      <button class="btn btn--lg btn--block" type="submit">Guardar actividad</button>
    </form>`;

  const f = $('#f-act', el);
  const ajustar = () => {
    const d = act.deporte(f.deporte.value);
    $('#c-km', el).hidden = !d.km;
    $('#c-otro', el).hidden = d.id !== 'otro';
  };
  f.addEventListener('change', (e) => { if (e.target.name === 'deporte') ajustar(); });
  ajustar();

  const error = (input, idErr, texto) => {
    const e = $(`#${idErr}`, el);
    e.textContent = texto; e.hidden = !texto;
    input.toggleAttribute('aria-invalid', !!texto);
    if (texto) input.setAttribute('aria-invalid', 'true');
  };

  f.onsubmit = async (e) => {
    e.preventDefault();
    const d = act.deporte(f.deporte.value);
    const minutos = leerNumero(f.minutos.value);
    const km = d.km ? leerNumero(f.km.value) : null;
    let ok = true;
    if (minutos == null || Number.isNaN(minutos) || minutos < 1 || minutos > 1440 || !Number.isInteger(minutos)) {
      error(f.minutos, 'e-min', 'Escribe los minutos (un número entero entre 1 y 1440).'); ok = false;
    } else error(f.minutos, 'e-min', '');
    if (km != null && (Number.isNaN(km) || km < 0 || km > 500)) { error(f.km, 'e-km', 'Los kilómetros deben ser un número entre 0 y 500.'); ok = false; }
    else if (d.km) error(f.km, 'e-km', '');
    const fecha = f.fecha.value || hoy;
    if (!ok) { el.querySelector('[aria-invalid="true"]')?.focus(); return; }
    await act.guardar({
      fecha: fecha > hoy ? hoy : fecha, deporte: d.id,
      nombre: d.id === 'otro' ? f.nombre.value.trim() : '', minutos, km: km ?? null, notas: f.notas.value.trim(),
    });
    toast(`${d.id === 'otro' && f.nombre.value.trim() ? f.nombre.value.trim() : d.nombre} guardado. Suma a tu racha.`);
    location.hash = '#/';
  };
}
