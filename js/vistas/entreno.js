// S09 Entreno en curso. Un toque por serie: el peso y las reps sugeridos ya están escritos.
import { $, $$, esc, ico, cabecera, hoja, toast, anunciar, miniatura, verTecnica, MUSCULO } from '../ui.js';
import * as entreno from '../datos/entreno.js';
import { mapaEjercicios } from '../datos/semilla.js';
import { fmtKg, leerNumero } from '../logica/progresion.js';
import { reloj } from '../logica/fechas.js';
import { estado } from '../datos/estado.js';
import { grupoDe } from '../datos/ejercicios.js';

const CLAVE_DESCANSO = 'forja-descanso'; // {fin, total, sesionId}: sobrevive a cerrar la app
const ICONO_MOTIVO = { subir_peso: 'up', subir_reps: 'plus', mantener: 'equal', bajar: 'down', sin_datos: 'equal' };
const CLASE_MOTIVO = { subir_peso: 'sugerencia--subir', subir_reps: 'sugerencia--subir', mantener: 'sugerencia--mantener', bajar: 'sugerencia--bajar', sin_datos: 'sugerencia--mantener' };

const leerDescanso = () => { try { return JSON.parse(localStorage.getItem(CLAVE_DESCANSO)); } catch { return null; } };
const fijarDescanso = (v) => { try { v ? localStorage.setItem(CLAVE_DESCANSO, JSON.stringify(v)) : localStorage.removeItem(CLAVE_DESCANSO); } catch {} };

export default async function vistaEntreno(el, sesionId) {
  let sesion = await entreno.obtener(sesionId);
  if (!sesion || sesion.estado !== 'en_curso') {
    if (sesion?.estado === 'terminada') { location.hash = `#/resumen/${sesionId}`; return; }
    cabecera({ titulo: 'Entreno', volver: '#/' });
    el.innerHTML = '<div class="card vacio"><h2>Este entreno ya no existe</h2><p>Puede que lo descartaras.</p><a class="btn" href="#/">Volver a Hoy</a></div>';
    return;
  }
  const ejercicios = await mapaEjercicios();
  // series hechas: clave `${sesionEjercicioId}:${orden}`
  const hechas = new Map((await entreno.seriesDe(sesionId)).map((s) => [`${s.sesionEjercicioId}:${s.orden}`, s]));

  cabecera({
    titulo: sesion.nombre, volver: '#/',
    accion: '<button class="btn btn--ghost" id="b-terminar">Terminar</button>',
  });

  const tipoDe = (se) => ejercicios.get(se.ejercicioId)?.tipo ?? 'peso_reps';
  const usaKg = (se) => ['peso_reps', 'asistido'].includes(tipoDe(se));
  const unidadReps = (se) => (tipoDe(se) === 'tiempo' ? 'seg' : 'reps');

  function filaSerie(se, i) {
    const h = hechas.get(`${se.id}:${i}`);
    const sug = { ...(se.sugerencia?.series?.[i] ?? {}) };
    // Sin sugerencia: hereda el peso de la última serie ya hecha de este ejercicio (también tras recargar).
    if (sug.kg == null) for (let j = i - 1; j >= 0; j--) { const p = hechas.get(`${se.id}:${j}`); if (p?.kg != null) { sug.kg = p.kg; break; } }
    const ant = se.anterior?.[i];
    const n = i + 1;
    const antTxt = ant ? (usaKg(se) && ant.kg != null ? `${fmtKg(ant.kg)} × ${ant.reps}` : `${ant.reps}`) : '—';
    return `
      <div class="serie ${h ? 'serie--hecha' : ''}" role="row" data-se="${se.id}" data-i="${i}">
        <span class="serie__n" role="cell">${n}</span>
        <span class="serie__ant" role="cell" aria-label="Anterior: ${esc(antTxt)}">${esc(antTxt)}</span>
        <span role="cell">${usaKg(se)
          ? `<input class="num" data-campo="kg" inputmode="decimal" autocomplete="off" aria-label="Serie ${n}, kilos" placeholder="${sug.kg != null ? fmtKg(sug.kg) : 'kg'}" value="${h?.kg != null ? fmtKg(h.kg) : ''}">`
          : '<span class="muted" style="width:100%;text-align:center">—</span>'}</span>
        <span role="cell"><input class="num" data-campo="reps" inputmode="numeric" autocomplete="off" aria-label="Serie ${n}, ${unidadReps(se)}" placeholder="${sug.reps ?? ''}" value="${h?.reps ?? ''}"></span>
        <span role="cell"><button class="check" data-check aria-pressed="${!!h}" aria-label="${h ? `Serie ${n} hecha. Toca para desmarcar` : `Marcar serie ${n}`}">${ico('check')}</button></span>
      </div>`;
  }

  function bloque(se) {
    const ej = ejercicios.get(se.ejercicioId);
    const s = se.sugerencia;
    return `
      <section class="ejercicio ${se.saltado ? 'ejercicio--saltado' : ''}" data-bloque="${se.id}" aria-labelledby="t-${se.id}">
        <div class="ejercicio__cab">
          <button class="miniatura-btn" data-tecnica="${se.ejercicioId}" aria-label="Ver cómo se hace ${esc(ej?.nombre ?? '')}">${miniatura(ej)}</button>
          <h3 id="t-${se.id}">${esc(ej?.nombre ?? se.ejercicioId)}</h3>
          ${se.saltado ? '<span class="etiqueta">Saltado</span>' : ''}
          <button class="btn btn--icon" data-opciones="${se.id}" aria-label="Opciones de ${esc(ej?.nombre ?? '')}">${ico('more')}</button>
        </div>
        <div class="ejercicio__meta">
          <span>${esc(MUSCULO[ej?.musculo] ?? '')} · ${se.nSeries} × ${se.repMin}–${se.repMax}${tipoDe(se) === 'tiempo' ? ' s' : ''}</span>
          ${s?.texto ? `<span class="sugerencia ${CLASE_MOTIVO[s.motivo]}">${ico(ICONO_MOTIVO[s.motivo])}${esc(s.texto)}</span>` : ''}
        </div>
        ${se.saltado ? '' : `
        <div class="series" role="table" aria-label="Series de ${esc(ej?.nombre ?? '')}">
          <div role="row" style="display:contents">
            <span class="series__cab" role="columnheader">Nº</span><span class="series__cab" role="columnheader">Anterior</span>
            <span class="series__cab" role="columnheader">kg</span><span class="series__cab" role="columnheader">${unidadReps(se)}</span>
            <span class="series__cab" role="columnheader"><span class="sr-only">Hecha</span></span>
          </div>
          ${Array.from({ length: se.nSeries }, (_, i) => filaSerie(se, i)).join('')}
        </div>
        <button class="btn btn--ghost btn--block" data-anadir="${se.id}">${ico('plus')}Añadir serie</button>`}
      </section>`;
  }

  function progreso() {
    const total = sesion.ejercicios.filter((e) => !e.saltado).reduce((a, e) => a + e.nSeries, 0);
    const n = [...hechas.values()].length;
    return { n, total };
  }

  function pintar() {
    const { n, total } = progreso();
    el.innerHTML = `
      <div class="fila-flex entre">
        <span class="crono" id="crono" aria-label="Tiempo de entreno">0:00</span>
        <span class="muted" style="font:var(--t-sm)" id="cuenta">${n} de ${total} series</span>
      </div>
      <div class="progreso" role="progressbar" aria-label="Series hechas" aria-valuemin="0" aria-valuemax="${total}" aria-valuenow="${n}"><i id="barra" style="width:${total ? (n / total) * 100 : 0}%"></i></div>
      ${sesion.ejercicios.length ? sesion.ejercicios.map(bloque).join('') : '<div class="card vacio"><h2>Entreno sin ejercicios</h2><p>Añade los que vayas a hacer.</p></div>'}
      <button class="btn btn--sec btn--block" id="b-anadir-ej">${ico('plus')}Añadir ejercicio</button>
      <button class="btn btn--lg btn--block" id="b-terminar-2">Terminar entreno</button>`;
  }

  function actualizarProgreso() {
    const { n, total } = progreso();
    $('#cuenta', el).textContent = `${n} de ${total} series`;
    $('#barra', el).style.width = `${total ? (n / total) * 100 : 0}%`;
    $('.progreso', el).setAttribute('aria-valuenow', n);
  }

  // ---------- Marcar / desmarcar ----------
  async function alternar(fila) {
    const se = sesion.ejercicios.find((e) => e.id === fila.dataset.se);
    const i = Number(fila.dataset.i);
    const clave = `${se.id}:${i}`;
    const boton = $('[data-check]', fila);
    const previa = hechas.get(clave);

    if (previa) {
      await entreno.desmarcarSerie(previa.id);
      hechas.delete(clave);
      fila.classList.remove('serie--hecha');
      boton.setAttribute('aria-pressed', 'false');
      boton.setAttribute('aria-label', `Marcar serie ${i + 1}`);
      actualizarProgreso();
      return;
    }

    const inKg = $('[data-campo="kg"]', fila);
    const inReps = $('[data-campo="reps"]', fila);
    const kg = usaKg(se) ? (leerNumero(inKg.value) ?? leerNumero(inKg.placeholder)) : null;
    const reps = leerNumero(inReps.value) ?? leerNumero(inReps.placeholder);
    let error = '';
    if (usaKg(se) && (kg == null || Number.isNaN(kg) || kg < 0 || kg > 1000)) { error = 'Escribe el peso'; inKg?.setAttribute('aria-invalid', 'true'); inKg?.focus(); }
    else if (reps == null || Number.isNaN(reps) || reps <= 0 || reps > 1000 || !Number.isInteger(reps)) { error = `Escribe las ${unidadReps(se)}`; inReps.setAttribute('aria-invalid', 'true'); inReps.focus(); }
    if (error) { toast(error, { error: true }); return; }
    inKg?.removeAttribute('aria-invalid'); inReps.removeAttribute('aria-invalid');

    const s = await entreno.marcarSerie(sesion, se, { id: crypto.randomUUID(), orden: i, kg, reps });
    hechas.set(clave, s);
    if (inKg && !inKg.value) inKg.value = fmtKg(kg);
    if (!inReps.value) inReps.value = reps;
    // Las series siguientes sin sugerencia heredan el peso que acabas de usar.
    if (usaKg(se)) {
      for (let j = i + 1; j < se.nSeries; j++) {
        const sig = $(`[data-se="${se.id}"][data-i="${j}"] [data-campo="kg"]`, el);
        if (sig && !hechas.has(`${se.id}:${j}`) && se.sugerencia?.series?.[j]?.kg == null) sig.placeholder = fmtKg(kg);
      }
    }
    fila.classList.add('serie--hecha');
    boton.setAttribute('aria-pressed', 'true');
    boton.setAttribute('aria-label', `Serie ${i + 1} hecha. Toca para desmarcar`);
    actualizarProgreso();
    anunciar(`Serie ${i + 1} completada`);
    empezarDescanso(se.descansoS);
  }

  // Si se corrige una serie ya marcada, se guarda al salir del campo.
  async function corregir(input) {
    const fila = input.closest('.serie');
    const se = sesion.ejercicios.find((e) => e.id === fila.dataset.se);
    const h = hechas.get(`${se.id}:${fila.dataset.i}`);
    if (!h) return;
    const v = leerNumero(input.value);
    if (v == null || Number.isNaN(v) || v < 0) { input.setAttribute('aria-invalid', 'true'); return; }
    input.removeAttribute('aria-invalid');
    const nueva = { ...h, [input.dataset.campo]: v };
    hechas.set(`${se.id}:${fila.dataset.i}`, await entreno.marcarSerie(sesion, se, nueva));
  }

  // ---------- Opciones del ejercicio ----------
  async function opciones(seId) {
    const se = sesion.ejercicios.find((e) => e.id === seId);
    const ultima = se.nSeries - 1;
    const r = await hoja({
      titulo: ejercicios.get(se.ejercicioId)?.nombre ?? '',
      opciones: [
        { valor: 'saltar', texto: se.saltado ? 'Volver a hacerlo' : 'Saltar este ejercicio', estilo: 'sec' },
        { valor: 'quitar', texto: 'Quitar la última serie', estilo: 'sec', deshabilitado: se.nSeries <= 1 || hechas.has(`${se.id}:${ultima}`) },
        { valor: 'reemplazar', texto: 'Cambiar por otro', estilo: 'sec' },
        { valor: 'tecnica', texto: 'Ver cómo se hace', estilo: 'sec' },
      ],
    });
    if (r === 'reemplazar') {
      const marcadas = [...hechas.keys()].filter((k) => k.startsWith(`${se.id}:`)).length;
      if (marcadas) {
        const ok = await hoja({ titulo: 'Ya has hecho series de este', texto: `Si lo cambias se borrarán las ${marcadas} series marcadas.`, opciones: [{ valor: 'si', texto: 'Cambiar igualmente', estilo: 'danger' }] });
        if (!ok) return;
      }
      estado.eleccion = { modo: 'reemplazar', sesionId: sesion.id, seId: se.id, grupo: grupoDe(ejercicios.get(se.ejercicioId)?.musculo), volver: `#/entreno/${sesion.id}` };
      location.hash = '#/ejercicios';
      return;
    }
    if (r === 'tecnica') { verTecnica(ejercicios.get(se.ejercicioId)); return; }
    if (r === 'saltar') se.saltado = !se.saltado;
    else if (r === 'quitar') se.nSeries -= 1;
    else return;
    sesion = await entreno.actualizar(sesion);
    redibujar();
  }

  async function anadirSerie(seId) {
    const se = sesion.ejercicios.find((e) => e.id === seId);
    se.nSeries += 1;
    sesion = await entreno.actualizar(sesion);
    redibujar();
    $(`[data-se="${seId}"][data-i="${se.nSeries - 1}"] [data-campo]`, el)?.focus();
  }

  function redibujar() { const y = scrollY; pintar(); scrollTo(0, y); tick(); }

  // ---------- Terminar ----------
  async function terminar() {
    const { n } = progreso();
    if (!n) {
      const r = await hoja({
        titulo: 'No has marcado ninguna serie',
        texto: 'Si terminas ahora no se guardará nada.',
        opciones: [{ valor: 'descartar', texto: 'Descartar entreno', estilo: 'danger' }],
        cancelar: 'Seguir entrenando',
      });
      if (r) { await entreno.descartar(sesion.id); fijarDescanso(null); location.hash = '#/'; }
      return;
    }
    const { total } = progreso();
    const r = await hoja({
      titulo: '¿Terminar el entreno?',
      texto: n < total ? `Llevas ${n} de ${total} series. Las que falten no se guardan.` : 'Has hecho todas las series. ¡Buen trabajo!',
      opciones: [{ valor: 'si', texto: 'Terminar y guardar' }],
      cancelar: 'Seguir entrenando',
    });
    if (!r) return;
    await entreno.terminar(sesion.id);
    fijarDescanso(null);
    location.hash = `#/resumen/${sesion.id}`;
  }

  // ---------- Temporizador de descanso (hora de fin, no ticks: iOS congela JS en segundo plano) ----------
  const barra = document.createElement('div');
  barra.className = 'barra-inferior';
  document.body.append(barra);

  function empezarDescanso(seg) {
    fijarDescanso({ fin: Date.now() + seg * 1000, total: seg, sesionId: sesion.id });
    pintarDescanso();
  }
  function pintarDescanso() {
    const d = leerDescanso();
    if (!d || d.sesionId !== sesion.id) { barra.innerHTML = ''; barra.hidden = true; return; }
    barra.hidden = false;
    barra.innerHTML = `
      <div class="descanso" role="timer" aria-label="Descanso">
        <div style="flex:1"><div class="descanso__t" id="d-t">0:00</div><div class="descanso__barra"><i id="d-b"></i></div></div>
        <button class="btn btn--sec" data-d="-15" aria-label="Quitar 15 segundos">−15</button>
        <button class="btn btn--sec" data-d="15" aria-label="Añadir 15 segundos">+15</button>
        <button class="btn btn--ghost" data-d="saltar">Saltar</button>
      </div>`;
    tick();
  }
  let avisado = false;
  function tick() {
    const c = $('#crono', el);
    if (c) c.textContent = reloj((Date.now() - new Date(sesion.inicio)) / 1000);
    const d = leerDescanso();
    const t = $('#d-t', barra);
    if (!d || !t) return;
    const queda = (d.fin - Date.now()) / 1000;
    const caja = $('.descanso', barra);
    if (queda <= 0) {
      t.textContent = '¡A por la siguiente!';
      t.style.fontSize = 'var(--t-lg)';
      caja.classList.add('descanso--fin');
      $('#d-b', barra).style.width = '0%';
      if (!avisado) { avisado = true; anunciar('Descanso terminado'); pitido(); }
      if (queda < -20) { fijarDescanso(null); pintarDescanso(); }
      return;
    }
    avisado = false;
    t.style.fontSize = '';
    caja.classList.remove('descanso--fin');
    t.textContent = reloj(queda);
    $('#d-b', barra).style.width = `${Math.min(100, (queda / d.total) * 100)}%`;
  }
  barra.addEventListener('click', (e) => {
    const b = e.target.closest('[data-d]');
    if (!b) return;
    const d = leerDescanso(); if (!d) return;
    if (b.dataset.d === 'saltar') fijarDescanso(null);
    else { const delta = Number(b.dataset.d) * 1000; fijarDescanso({ ...d, fin: Math.max(Date.now(), d.fin + delta), total: Math.max(1, d.total + delta / 1000) }); }
    pintarDescanso();
  });

  // Pitido corto con Web Audio (solo suena con la app abierta).
  let audio;
  function pitido() {
    try {
      audio ??= new AudioContext();
      const o = audio.createOscillator(), g = audio.createGain();
      o.frequency.value = 880; g.gain.value = 0.15;
      o.connect(g); g.connect(audio.destination); o.start(); o.stop(audio.currentTime + 0.25);
    } catch {}
  }

  // Que la pantalla no se apague mientras entrenas.
  let wake = null;
  const pedirWake = async () => { try { wake = await navigator.wakeLock?.request('screen'); } catch {} };

  // ---------- Eventos ----------
  el.addEventListener('click', onClick);
  el.addEventListener('change', onChange);
  el.addEventListener('keydown', onKey);
  async function onClick(e) {
    const t = e.target.closest('button');
    if (!t) return;
    if (!audio) try { audio = new AudioContext(); } catch {}
    if (t.dataset.tecnica) verTecnica(ejercicios.get(t.dataset.tecnica));
    else if (t.hasAttribute('data-check')) alternar(t.closest('.serie'));
    else if (t.dataset.opciones) opciones(t.dataset.opciones);
    else if (t.dataset.anadir) anadirSerie(t.dataset.anadir);
    else if (t.id === 'b-terminar-2') terminar();
    else if (t.id === 'b-anadir-ej') { estado.eleccion = { modo: 'entreno', sesionId: sesion.id, volver: `#/entreno/${sesion.id}` }; location.hash = '#/ejercicios'; }
  }
  function onChange(e) { if (e.target.matches('.num')) corregir(e.target); }
  // Intro en reps = marcar la serie
  function onKey(e) {
    if (e.key === 'Enter' && e.target.matches('[data-campo="reps"]')) {
      const fila = e.target.closest('.serie');
      if (!hechas.has(`${fila.dataset.se}:${fila.dataset.i}`)) { e.preventDefault(); alternar(fila); }
    }
  }
  const terminarCab = () => terminar();
  $('#b-terminar').addEventListener('click', terminarCab);
  const onVisible = () => { if (!document.hidden) { tick(); pedirWake(); } };
  document.addEventListener('visibilitychange', onVisible);

  pintar();
  pintarDescanso();
  pedirWake();
  const intervalo = setInterval(tick, 1000);

  return () => {
    clearInterval(intervalo);
    barra.remove();
    el.removeEventListener('click', onClick);
    el.removeEventListener('change', onChange);
    el.removeEventListener('keydown', onKey);
    document.removeEventListener('visibilitychange', onVisible);
    wake?.release?.().catch(() => {});
  };
}
