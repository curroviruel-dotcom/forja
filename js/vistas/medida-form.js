// Añadir o editar un registro de peso y medidas.
import { $, esc, cabecera, hoja, toast } from '../ui.js';
import * as medidas from '../datos/medidas.js';
import { CAMPOS, validar } from '../logica/medidas.js';
import { diaLocal } from '../logica/fechas.js';
import { leerNumero } from '../logica/progresion.js';

export default async function medidaForm(el, id = null) {
  const previo = id ? await medidas.obtener(id) : null;
  if (id && !previo) { location.hash = '#/medidas'; return; }
  const hoy = diaLocal();
  const m = previo ?? { fecha: hoy };
  cabecera({ titulo: previo ? 'Editar registro' : 'Nuevo registro', volver: '#/medidas' });
  const v = (n) => (n == null ? '' : String(n).replace('.', ','));

  el.innerHTML = `
    <form id="f-med" class="pila" novalidate>
      <div class="campo"><label for="fecha">Día</label>
        <input class="input" id="fecha" type="date" value="${m.fecha}" max="${hoy}" required></div>
      <div class="campo"><label for="pesoKg">Peso (kg)</label>
        <input class="input input--grande" id="pesoKg" inputmode="decimal" autocomplete="off" value="${v(m.pesoKg)}" placeholder="74,5" aria-describedby="e-pesoKg">
        <span class="error" id="e-pesoKg" hidden></span></div>
      <fieldset class="opciones"><legend class="campo-legend">Perímetros en cm (opcional)</legend>
        <div class="rejilla-2">
          ${CAMPOS.filter(([c]) => c !== 'pesoKg').map(([c, n]) => `
            <div class="campo"><label for="${c}">${n}</label>
              <input class="input" id="${c}" inputmode="decimal" autocomplete="off" value="${v(m[c])}" aria-describedby="e-${c}">
              <span class="error" id="e-${c}" hidden></span></div>`).join('')}
        </div>
      </fieldset>
      <p class="muted" style="font:var(--t-sm);margin:0">Mide siempre en el mismo sitio: cintura a la altura del ombligo, brazo y muslo por la parte más ancha, relajados.</p>
      <span class="error" id="e-_" role="alert" hidden></span>
      <button class="btn btn--lg btn--block" type="submit">Guardar</button>
      ${previo ? '<button class="btn btn--ghost btn--block" type="button" id="b-borrar" style="color:var(--c-danger)">Borrar registro</button>' : ''}
    </form>`;

  const f = $('#f-med', el);
  f.onsubmit = async (e) => {
    e.preventDefault();
    const datos = Object.fromEntries(CAMPOS.map(([c]) => [c, leerNumero($(`#${c}`, el).value)]));
    const errores = validar(datos);
    for (const [c] of [...CAMPOS, ['_']]) {
      const s = $(`#e-${c}`, el); s.textContent = errores[c] ?? ''; s.hidden = !errores[c];
      const i = $(`#${c}`, el); if (i) { if (errores[c]) i.setAttribute('aria-invalid', 'true'); else i.removeAttribute('aria-invalid'); }
    }
    if (Object.keys(errores).length) { el.querySelector('[aria-invalid="true"]')?.focus(); return; }
    const fecha = $('#fecha', el).value && $('#fecha', el).value <= hoy ? $('#fecha', el).value : hoy;

    // Un registro por día: si ya hay otro ese día, se completa con lo nuevo
    let base = previo ?? {};
    const otro = await medidas.delDia(fecha);
    if (otro && otro.id !== previo?.id) {
      const r = await hoja({ titulo: 'Ya tienes un registro ese día', texto: 'Se completará con los datos que acabas de escribir.', opciones: [{ valor: 'si', texto: 'Completar ese registro' }] });
      if (!r) return;
      if (previo) await medidas.borrar(previo.id);
      base = otro;
    }
    const limpio = Object.fromEntries(Object.entries(datos).filter(([, x]) => x != null));
    // Al editar, un campo vaciado se borra; al completar otro registro, se conservan sus datos
    const registro = base === previo && previo ? { id: previo.id, creado: previo.creado, ...limpio, fecha } : { ...base, ...limpio, fecha };
    await medidas.guardar(registro);
    toast('Guardado');
    location.hash = '#/medidas';
  };

  $('#b-borrar', el)?.addEventListener('click', async () => {
    await medidas.borrar(previo.id);
    toast('Registro borrado', { deshacer: async () => { await medidas.restaurar(previo); location.hash = '#/medidas'; } });
    location.hash = '#/medidas';
  });

  if (!previo) $('#pesoKg', el).focus();
}
