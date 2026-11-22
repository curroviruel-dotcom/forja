// S21 Añadir comida: elegir de tus alimentos, crear uno nuevo o entrada rápida.
import { $, $$, esc, ico, cabecera, toast, vacio } from '../ui.js';
import * as comida from '../datos/comida.js';
import { macrosDe, cuadra, kcalDeMacros, MOMENTOS, esCodigoBarras } from '../logica/nutricion.js';
import { leerNumero } from '../logica/progresion.js';
import { diaLocal } from '../logica/fechas.js';

const fmt = (n) => String(Math.round(n * 10) / 10).replace('.', ',');
let pestana = 'mios';

export default async function anadir(el, momento, fecha = diaLocal()) {
  const nombreMomento = MOMENTOS.find(([id]) => id === momento)?.[1] ?? 'Comida';
  const volver = `#/comida/${fecha}`;
  cabecera({ titulo: `Añadir a ${nombreMomento.toLowerCase()}`, volver });
  let elegido = null;
  let texto = '';

  const ir = async () => { location.hash = volver; };

  async function pintar() {
    el.innerHTML = `
      <div class="segmentado segmentado--4" role="tablist" aria-label="Forma de añadir">
        ${[['mios', 'Míos'], ['internet', 'Internet'], ['nuevo', 'Nuevo'], ['rapido', 'Rápido']].map(([id, n]) => `
          <button class="chip ${pestana === id ? '' : 'chip--sec'}" role="tab" aria-selected="${pestana === id}" aria-pressed="${pestana === id}" data-pest="${id}">${n}</button>`).join('')}
      </div>
      <div id="panel" role="tabpanel"></div>`;
    $$('[data-pest]', el).forEach((b) => b.onclick = () => { pestana = b.dataset.pest; elegido = null; pintar(); });
    if (pestana === 'mios') await panelMios();
    else if (pestana === 'internet') panelInternet();
    else if (pestana === 'nuevo') panelNuevo();
    else panelRapido();
  }

  // ---------- Mis alimentos ----------
  async function panelMios() {
    const p = $('#panel', el);
    if (elegido) { panelCantidad(elegido); return; }
    p.innerHTML = `
      <label class="buscar"><span class="sr-only">Buscar alimento</span>${ico('search')}
        <input type="search" id="q" placeholder="Buscar en tus alimentos" autocomplete="off" value="${esc(texto)}"></label>
      <div id="lista-al" style="margin-top:var(--s-3)"></div>`;
    const pintarLista = async () => {
      const lista = await comida.alimentos(texto);
      $('#lista-al', el).innerHTML = lista.length ? `<ul class="grupo">${lista.map((a) => `
        <li><button class="fila" data-al="${a.id}"><span style="flex:1;min-width:0"><b style="font-weight:600">${esc(a.nombre)}</b><br>
          <span class="muted" style="font:var(--t-sm)">${a.kcal} kcal · P ${fmt(a.prot)} · C ${fmt(a.carb)} · G ${fmt(a.grasa)} ${a.base === 'racion' ? 'por ración' : 'por 100 g'}</span></span>
          <span class="muted">${ico('chevron')}</span></button></li>`).join('')}</ul>`
        : vacio({ icono: 'comida', titulo: texto ? 'No tienes ningún alimento así' : 'Aún no tienes alimentos', texto: 'Crea los que comes a menudo con los datos de la etiqueta. Después solo tendrás que elegirlos.', boton: '<button class="btn" id="b-ir-nuevo">Crear alimento</button>' });
      $('#b-ir-nuevo', el)?.addEventListener('click', () => { pestana = 'nuevo'; pintar(); });
      $$('[data-al]', el).forEach((b) => b.onclick = async () => { elegido = await comida.alimento(b.dataset.al); panelCantidad(elegido); });
    };
    $('#q', el).oninput = (e) => { texto = e.target.value; pintarLista(); };
    await pintarLista();
  }

  // ---------- Buscar en internet (Open Food Facts) ----------
  let ultimaBusqueda = '';
  let resultados = [];
  function panelInternet() {
    const p = $('#panel', el);
    if (elegido) { panelCantidad(elegido); return; }
    p.innerHTML = `
      <form id="f-off" class="pila" role="search" novalidate>
        <div class="fila-flex" style="flex-wrap:nowrap">
          <label class="buscar" style="flex:1"><span class="sr-only">Nombre o código de barras</span>${ico('search')}
            <input type="search" id="q-off" placeholder="Nombre o código de barras" autocomplete="off" enterkeyhint="search" value="${esc(ultimaBusqueda)}"></label>
          <button class="btn" type="submit" id="b-off">Buscar</button>
        </div>
        <p class="muted" style="font:var(--t-sm);margin:0">Busca en Open Food Facts, una base de datos pública. Solo se envía lo que escribes. El código de barras son los números bajo las rayas.</p>
      </form>
      <div id="res-off" aria-live="polite" style="margin-top:var(--s-3)"></div>`;
    const pintarRes = () => {
      $('#res-off', el).innerHTML = resultados.length ? `<ul class="grupo">${resultados.map((a, i) => `
        <li><button class="fila" data-off="${i}"><span style="flex:1;min-width:0"><b style="font-weight:600">${esc(a.nombre)}</b><br>
          <span class="muted" style="font:var(--t-sm)">${a.kcal} kcal · P ${fmt(a.prot)} · C ${fmt(a.carb)} · G ${fmt(a.grasa)} por 100 g</span></span>
          <span class="muted">${ico('chevron')}</span></button></li>`).join('')}</ul>`
        : ultimaBusqueda ? '<p class="muted">Sin resultados con datos de calorías. Prueba con otra palabra o créalo en "Nuevo".</p>' : '';
      $$('[data-off]', el).forEach((b) => b.onclick = async () => {
        elegido = await comida.guardarDeInternet(resultados[Number(b.dataset.off)]);
        panelCantidad(elegido);
      });
    };
    $('#f-off', el).onsubmit = async (e) => {
      e.preventDefault();
      const q = $('#q-off', el).value.trim();
      if (q.length < 2) { $('#res-off', el).innerHTML = '<p class="error">Escribe al menos 2 letras o un código.</p>'; return; }
      const b = $('#b-off', el); b.classList.add('is-loading'); b.setAttribute('aria-busy', 'true');
      $('#res-off', el).innerHTML = '<p class="muted">Buscando…</p>';
      try {
        const codigo = q.replace(/\s/g, '');
        if (esCodigoBarras(codigo)) { const a = await comida.porCodigo(codigo); resultados = a ? [a] : []; }
        else resultados = await comida.buscarInternet(q);
        ultimaBusqueda = q;
        pintarRes();
      } catch (err) {
        $('#res-off', el).innerHTML = `<p class="error">${esc(err.message)}</p>`;
      } finally { b.classList.remove('is-loading'); b.removeAttribute('aria-busy'); }
    };
    pintarRes();
    if (!ultimaBusqueda) $('#q-off', el).focus();
  }

  function panelCantidad(a) {
    const p = $('#panel', el);
    const porRacion = a.base === 'racion';
    p.innerHTML = `
      <article class="card pila">
        <h2 class="card__titulo">${esc(a.nombre)}</h2>
        <div class="campo"><label for="cant">${porRacion ? 'Raciones' : 'Gramos'}</label>
          <input class="input" id="cant" inputmode="decimal" autocomplete="off" value="${porRacion ? 1 : (a.gramosRacion ?? 100)}" aria-describedby="e-cant">
          <span class="error" id="e-cant" hidden></span></div>
        ${!porRacion && a.gramosRacion ? `<button class="btn btn--sec" id="b-racion">Una ración (${fmt(a.gramosRacion)} g)</button>` : ''}
        <p class="tab-num" id="prev" aria-live="polite" style="margin:0"></p>
        <button class="btn btn--lg btn--block" id="b-add">Añadir a ${esc(nombreMomento.toLowerCase())}</button>
        <button class="btn btn--ghost btn--block" id="b-otro">Elegir otro alimento</button>
      </article>`;
    const cant = $('#cant', el);
    const prev = () => {
      const v = leerNumero(cant.value);
      $('#prev', el).textContent = v > 0 ? (() => { const m = macrosDe(a, v); return `${m.kcal} kcal · Proteína ${fmt(m.prot)} g · Carbohidratos ${fmt(m.carb)} g · Grasa ${fmt(m.grasa)} g`; })() : '';
    };
    cant.oninput = prev; prev();
    $('#b-racion', el)?.addEventListener('click', () => { cant.value = fmt(a.gramosRacion); prev(); });
    $('#b-otro', el).onclick = () => { elegido = null; pintar(); };
    $('#b-add', el).onclick = async () => {
      const v = leerNumero(cant.value);
      if (!(v > 0 && v <= (porRacion ? 50 : 5000))) {
        const e = $('#e-cant', el); e.textContent = porRacion ? 'Entre 0,1 y 50 raciones.' : 'Entre 1 y 5000 gramos.'; e.hidden = false;
        cant.setAttribute('aria-invalid', 'true'); cant.focus(); return;
      }
      await comida.anadir({ fecha, momento, alimento: a, cantidad: v });
      toast(`${a.nombre} añadido`);
      ir();
    };
    cant.focus();
  }

  // ---------- Formulario de macros (nuevo y rápido) ----------
  const camposMacros = (conBase) => `
    <div class="campo"><label for="f-nombre">Nombre${conBase ? '' : ' (opcional)'}</label>
      <input class="input" id="f-nombre" maxlength="60" autocomplete="off" placeholder="${conBase ? 'Por ejemplo: Pechuga de pollo' : 'Por ejemplo: Menú del bar'}" aria-describedby="e-f-nombre">
      <span class="error" id="e-f-nombre" hidden></span></div>
    ${conBase ? `
    <fieldset class="opciones"><legend class="campo-legend">Los valores son…</legend>
      <div class="segmentado">
        <label class="opcion"><input type="radio" name="base" value="100g" checked><span class="opcion__txt"><b>Por 100 g</b></span></label>
        <label class="opcion"><input type="radio" name="base" value="racion"><span class="opcion__txt"><b>Por ración</b></span></label>
      </div></fieldset>
    <div class="campo" id="c-gr"><label for="f-gr">Gramos de una ración (opcional)</label>
      <input class="input" id="f-gr" inputmode="decimal" autocomplete="off" placeholder="125"></div>` : ''}
    <div class="rejilla-2">
      ${[['kcal', 'Calorías (kcal)'], ['prot', 'Proteína (g)'], ['carb', 'Carbohidratos (g)'], ['grasa', 'Grasa (g)']].map(([id, n]) => `
        <div class="campo"><label for="f-${id}">${n}</label><input class="input" id="f-${id}" inputmode="decimal" autocomplete="off" placeholder="0" aria-describedby="e-f-${id}"><span class="error" id="e-f-${id}" hidden></span></div>`).join('')}
    </div>
    <p class="muted" id="aviso-kcal" style="font:var(--t-sm);margin:0" hidden></p>`;

  function leerMacros(conBase) {
    let ok = true;
    const err = (id, t) => { const e = $(`#e-f-${id}`, el); e.textContent = t; e.hidden = !t; const i = $(`#f-${id}`, el); if (t) { i.setAttribute('aria-invalid', 'true'); ok = false; } else i.removeAttribute('aria-invalid'); };
    const v = {};
    for (const id of ['kcal', 'prot', 'carb', 'grasa']) {
      const n = leerNumero($(`#f-${id}`, el).value) ?? 0;
      err(id, Number.isNaN(n) || n < 0 || n > (id === 'kcal' ? 5000 : 500) ? 'Número no válido' : '');
      v[id] = id === 'kcal' ? Math.round(n) : n;
    }
    if (!v.kcal && (v.prot || v.carb || v.grasa)) v.kcal = kcalDeMacros(v); // si solo pone macros
    const nombre = $('#f-nombre', el).value.trim();
    if (conBase) err('nombre', nombre ? '' : 'Ponle un nombre');
    if (!conBase && !v.kcal) { err('kcal', 'Escribe al menos las calorías'); }
    return ok ? { nombre, ...v } : null;
  }

  function avisoCuadra() {
    const v = Object.fromEntries(['kcal', 'prot', 'carb', 'grasa'].map((id) => [id, leerNumero($(`#f-${id}`, el).value) ?? 0]));
    const a = $('#aviso-kcal', el);
    a.hidden = !(v.kcal && (v.prot || v.carb || v.grasa)) || cuadra(v);
    a.textContent = `Ojo: con esos macros salen unas ${kcalDeMacros(v)} kcal. Revisa la etiqueta.`;
  }

  function panelNuevo() {
    $('#panel', el).innerHTML = `<form id="f-nuevo" class="pila" novalidate>${camposMacros(true)}
      <button class="btn btn--lg btn--block" type="submit">Guardar y elegir cantidad</button></form>`;
    const f = $('#f-nuevo', el);
    f.oninput = avisoCuadra;
    f.onchange = (e) => { if (e.target.name === 'base') $('#c-gr', el).hidden = e.target.value === 'racion'; };
    f.onsubmit = async (e) => {
      e.preventDefault();
      const v = leerMacros(true);
      if (!v) { el.querySelector('[aria-invalid="true"]')?.focus(); return; }
      const base = f.querySelector('input[name="base"]:checked').value;
      const gr = leerNumero($('#f-gr', el).value);
      const a = await comida.guardarAlimento({ ...v, base, gramosRacion: base === '100g' && gr > 0 ? gr : null, usadoEn: new Date().toISOString() });
      toast('Alimento guardado');
      pestana = 'mios'; elegido = a; await pintar();
    };
    $('#f-nombre', el).focus();
  }

  function panelRapido() {
    $('#panel', el).innerHTML = `<form id="f-rapido" class="pila" novalidate>
      <p class="muted" style="margin:0;font:var(--t-sm)">Para algo que no vas a repetir. No se guarda como alimento.</p>
      ${camposMacros(false)}
      <button class="btn btn--lg btn--block" type="submit">Añadir a ${esc(nombreMomento.toLowerCase())}</button></form>`;
    const f = $('#f-rapido', el);
    f.oninput = avisoCuadra;
    f.onsubmit = async (e) => {
      e.preventDefault();
      const v = leerMacros(false);
      if (!v) { el.querySelector('[aria-invalid="true"]')?.focus(); return; }
      await comida.anadirRapido({ fecha, momento, ...v });
      toast('Añadido');
      ir();
    };
  }

  await pintar();
}
