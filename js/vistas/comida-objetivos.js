// Objetivos de comida: calculados con tus datos (Mifflin-St Jeor) o escritos a mano.
import { $, esc, cabecera, toast } from '../ui.js';
import * as comida from '../datos/comida.js';
import * as perfil from '../datos/perfil.js';
import { objetivosComida } from '../logica/generador.js';
import { leerNumero } from '../logica/progresion.js';

export default async function objetivos(el) {
  cabecera({ titulo: 'Objetivos de comida', volver: '#/comida' });
  const p = (await perfil.obtener()) ?? {};
  const o = (await comida.objetivos()) ?? {};
  const opt = (v, actual, txt) => `<option value="${v}" ${String(actual) === String(v) ? 'selected' : ''}>${txt}</option>`;

  el.innerHTML = `
    <section class="card pila" aria-labelledby="t-calc">
      <h2 class="card__titulo" id="t-calc">Calcularlos con tus datos</h2>
      <div class="rejilla-2">
        <div class="campo"><label for="sexo">Sexo</label><select class="input" id="sexo">${opt('', p.sexo, 'Elige')}${opt('hombre', p.sexo, 'Hombre')}${opt('mujer', p.sexo, 'Mujer')}</select></div>
        <div class="campo"><label for="edad">Edad</label><input class="input" id="edad" inputmode="numeric" value="${p.edad ?? ''}" placeholder="20"></div>
        <div class="campo"><label for="peso">Peso (kg)</label><input class="input" id="peso" inputmode="decimal" value="${p.pesoKg != null ? String(p.pesoKg).replace('.', ',') : ''}" placeholder="70"></div>
        <div class="campo"><label for="altura">Altura (cm)</label><input class="input" id="altura" inputmode="numeric" value="${p.alturaCm ?? ''}" placeholder="175"></div>
        <div class="campo"><label for="dias">Días de entreno</label><select class="input" id="dias">${[2, 3, 4, 5, 6].map((d) => opt(d, p.diasSemana ?? 4, `${d} por semana`)).join('')}</select></div>
        <div class="campo"><label for="obj">Objetivo</label><select class="input" id="obj">${opt('musculo', p.objetivo ?? 'musculo', 'Ganar músculo')}${opt('fuerza', p.objetivo, 'Ganar fuerza')}${opt('perder_grasa', p.objetivo, 'Perder grasa')}</select></div>
      </div>
      <span class="error" id="e-calc" hidden></span>
      <button class="btn btn--sec btn--block" id="b-calc">Calcular</button>
      <p class="muted" style="font:var(--t-sm);margin:0">Es una estimación (fórmula de Mifflin-St Jeor y tu actividad). Ajústala según cómo cambie tu peso en 2–3 semanas.</p>
    </section>

    <form id="f-obj" class="card pila" novalidate aria-labelledby="t-obj">
      <h2 class="card__titulo" id="t-obj">Tus objetivos diarios</h2>
      <div class="rejilla-2">
        ${[['kcal', 'Calorías (kcal)'], ['prot', 'Proteína (g)'], ['carb', 'Carbohidratos (g)'], ['grasa', 'Grasa (g)']].map(([id, n]) => `
          <div class="campo"><label for="o-${id}">${n}</label><input class="input" id="o-${id}" inputmode="numeric" value="${o[id] ?? ''}" aria-describedby="e-o"></div>`).join('')}
      </div>
      <span class="error" id="e-o" hidden></span>
      <button class="btn btn--lg btn--block" type="submit">Guardar objetivos</button>
    </form>`;

  const err = (id, t) => { const e = $(`#${id}`, el); e.textContent = t; e.hidden = !t; };

  $('#b-calc', el).onclick = async () => {
    const datos = {
      sexo: $('#sexo', el).value, edad: leerNumero($('#edad', el).value), pesoKg: leerNumero($('#peso', el).value),
      alturaCm: leerNumero($('#altura', el).value), diasSemana: Number($('#dias', el).value), objetivo: $('#obj', el).value,
    };
    const falta = [];
    if (!datos.sexo) falta.push('sexo');
    if (!(datos.edad >= 14 && datos.edad <= 100)) falta.push('edad (14–100)');
    if (!(datos.pesoKg >= 30 && datos.pesoKg <= 250)) falta.push('peso (30–250 kg)');
    if (!(datos.alturaCm >= 120 && datos.alturaCm <= 230)) falta.push('altura (120–230 cm)');
    if (falta.length) { err('e-calc', `Revisa: ${falta.join(', ')}.`); return; }
    err('e-calc', '');
    const r = objetivosComida(datos);
    for (const k of ['kcal', 'prot', 'carb', 'grasa']) $(`#o-${k}`, el).value = r[k];
    await perfil.guardar({ ...p, ...datos });
    toast('Calculado. Revisa y guarda.');
    $('#o-kcal', el).focus();
  };

  $('#f-obj', el).onsubmit = async (e) => {
    e.preventDefault();
    const v = Object.fromEntries(['kcal', 'prot', 'carb', 'grasa'].map((k) => [k, leerNumero($(`#o-${k}`, el).value)]));
    if (!(v.kcal >= 800 && v.kcal <= 8000) || [v.prot, v.carb, v.grasa].some((x) => !(x >= 0 && x <= 1000))) {
      err('e-o', 'Las calorías deben estar entre 800 y 8000, y cada macro entre 0 y 1000 g.');
      return;
    }
    err('e-o', '');
    await comida.fijarObjetivos({ kcal: Math.round(v.kcal), prot: Math.round(v.prot), carb: Math.round(v.carb), grasa: Math.round(v.grasa) });
    toast('Objetivos guardados');
    location.hash = '#/comida';
  };
}
