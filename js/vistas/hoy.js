// S04 Hoy: qué toca, racha, entreno a medias, otras actividades.
import * as db from '../db.js';
import { $, esc, ico, cabecera, hoja, toast, vacio, MUSCULO } from '../ui.js';
import * as rutinas from '../datos/rutinas.js';
import * as entreno from '../datos/entreno.js';
import * as act from '../datos/actividades.js';
import { mapaEjercicios, plantillas } from '../datos/semilla.js';
import { diaLocal, diffDias, fechaCorta } from '../logica/fechas.js';
import * as perfil from '../datos/perfil.js';

const TEXTO_RACHA = {
  activa: (n) => `${n} ${n === 1 ? 'día' : 'días'}`,
  en_riesgo: () => 'Entrena hoy o pierdes la racha',
  rota: () => 'Racha a cero: empieza otra hoy',
  nueva: () => 'Empieza tu racha hoy',
};

export function chipRacha(r) {
  const clase = r.estado === 'en_riesgo' ? 'racha--riesgo' : r.estado === 'activa' ? '' : 'racha--rota';
  const texto = r.estado === 'en_riesgo' ? `${r.dias} días · ${TEXTO_RACHA.en_riesgo()}` : TEXTO_RACHA[r.estado](r.dias);
  return `<span class="racha ${clase}" aria-label="Racha: ${esc(texto)}">${ico('llama', 'style="width:16px;height:16px"')}${esc(texto)}</span>`;
}

function duracionEstimada(dia) {
  const s = dia.ejercicios.reduce((a, e) => a + e.series * ((e.descansoS ?? 120) + 40), 0);
  return Math.round(s / 60 / 5) * 5;
}

export default async function hoy(el) {
  const hoyStr = diaLocal();
  const [racha, enCurso, plan, ejercicios, actividades] = await Promise.all([
    act.racha(), entreno.enCurso(), rutinas.diaDeHoy(), mapaEjercicios(), act.listar(),
  ]);
  // Primer arranque: sin rutina, sin entrenos y sin haber visto la bienvenida.
  if (!plan && !enCurso && !actividades.length && !(await perfil.onboardingHecho())) { location.replace('#/bienvenida'); return; }
  cabecera({ titulo: 'Hoy', extra: chipRacha(racha) });

  const deHoy = actividades.filter((a) => a.fecha === hoyStr);
  const hechoHoy = plan?.ultimo?.fecha === hoyStr ? plan.ultimo : null;
  const ultimaCopia = await db.ajuste('ultimaCopia');
  const hayDatos = !!plan?.ultimo || actividades.length > 0;
  const copiaVieja = hayDatos && (!ultimaCopia || diffDias(ultimaCopia.slice(0, 10), hoyStr) >= 7);

  let html = '';

  if (enCurso) {
    html += `
      <article class="card" aria-labelledby="t-curso">
        <h2 class="card__titulo" id="t-curso">Tienes un entreno a medias</h2>
        <p class="card__meta">${esc(enCurso.nombre)} · empezado ${esc(fechaCorta(enCurso.fecha).toLowerCase())} a las ${new Date(enCurso.inicio).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}</p>
        <div class="pila">
          <a class="btn btn--lg btn--block" href="#/entreno/${enCurso.id}">Seguir entrenando</a>
          <button class="btn btn--ghost btn--block" id="b-descartar">Descartarlo</button>
        </div>
      </article>`;
  }

  if (!plan) {
    const ps = await plantillas();
    html += vacio({
      icono: 'lista', titulo: 'Aún no tienes rutina',
      texto: 'Contesta cinco preguntas y te preparamos una, o empieza con una de ejemplo.',
      boton: `<div class="pila" style="width:100%"><a class="btn btn--block" href="#/cuestionario/1">Crear mi rutina</a>
        ${ps.map((p) => `<button class="btn btn--sec btn--block" data-plantilla="${p.id}">Usar «${esc(p.nombre)}»</button>`).join('')}
        <a class="btn btn--ghost btn--block" href="#/rutina/nueva">Montarla yo eligiendo ejercicios</a></div>`,
    });
  } else if (!enCurso) {
    const { rutina, dia, indice } = plan;
    const musculos = [...new Set(dia.ejercicios.map((e) => MUSCULO[ejercicios.get(e.ejercicioId)?.musculo]).filter(Boolean))];
    const series = dia.ejercicios.reduce((a, e) => a + e.series, 0);
    html += `
      <article class="card" aria-labelledby="t-dia">
        <div class="fila-flex entre" style="margin-bottom:var(--s-2)">
          <span class="etiqueta">Día ${indice + 1} de ${rutina.dias.length} · ${esc(rutina.nombre)}</span>
          <a class="enlace" href="#/rutinas">Mis rutinas</a>
        </div>
        <h2 class="card__titulo" id="t-dia">${hechoHoy ? 'Siguiente: ' : ''}${esc(dia.nombre)}</h2>
        <p class="card__meta">${dia.ejercicios.length} ejercicios · ${series} series · unos ${duracionEstimada(dia)} min</p>
        <ul class="lista-ej">
          ${dia.ejercicios.map((e) => `<li><span>${esc(ejercicios.get(e.ejercicioId)?.nombre ?? e.ejercicioId)}</span><span>${e.series} × ${e.repMin}–${e.repMax}</span></li>`).join('')}
        </ul>
        <div class="chips" style="margin-bottom:var(--s-3)">${musculos.map((m) => `<span class="etiqueta">${esc(m)}</span>`).join('')}</div>
        ${hechoHoy ? `<p class="card__meta">Hoy ya has hecho ${esc(hechoHoy.nombre)}. Si quieres, puedes seguir con el siguiente día.</p>` : ''}
        <button class="btn btn--lg btn--block ${hechoHoy ? 'btn--sec' : ''}" id="b-empezar">Empezar entreno</button>
      </article>`;
  }

  html += `
    <article class="card" aria-labelledby="t-otra">
      <div class="fila-flex entre">
        <div><h2 class="card__titulo" id="t-otra">¿Otro deporte?</h2>
        <p class="card__meta" style="margin:0">Correr, pádel, natación… también cuenta para la racha.</p></div>
      </div>
      ${deHoy.length ? `<ul class="lista-ej" style="margin-top:var(--s-3)">${deHoy.map((a) => `<li><span>${esc(act.nombreActividad(a))}</span><span>${a.minutos} min${a.km ? ` · ${String(a.km).replace('.', ',')} km` : ''}</span></li>`).join('')}</ul>` : ''}
      <a class="btn btn--sec btn--block" style="margin-top:var(--s-3)" href="#/actividad">${ico('run')}Registrar actividad</a>
    </article>`;

  if (copiaVieja) {
    html += `
      <article class="card">
        <h2 class="card__titulo">Haz una copia de seguridad</h2>
        <p class="card__meta">${ultimaCopia ? `La última fue hace ${diffDias(ultimaCopia.slice(0, 10), hoyStr)} días.` : 'Aún no has hecho ninguna.'} Tus datos solo están en este iPhone.</p>
        <a class="btn btn--sec btn--block" href="#/perfil">Ir a copia de seguridad</a>
      </article>`;
  }

  el.innerHTML = html;

  el.querySelectorAll('[data-plantilla]').forEach((b) => b.onclick = async () => {
    b.classList.add('is-loading'); b.setAttribute('aria-busy', 'true');
    await rutinas.desdePlantilla(b.dataset.plantilla);
    toast('Rutina lista. ¡A por el primer día!');
    hoy(el);
  });

  $('#b-empezar', el)?.addEventListener('click', async (e) => {
    e.currentTarget.classList.add('is-loading');
    try {
      const s = await entreno.empezar({ rutina: plan.rutina, dia: plan.dia });
      location.hash = `#/entreno/${s.id}`;
    } catch (err) { toast(err.message, { error: true }); hoy(el); }
  });

  $('#b-descartar', el)?.addEventListener('click', async () => {
    const r = await hoja({
      titulo: '¿Descartar el entreno a medias?',
      texto: 'Se borrarán las series que marcaste. No se puede deshacer.',
      opciones: [{ valor: 'si', texto: 'Descartar entreno', estilo: 'danger' }],
    });
    if (r) { await entreno.descartar(enCurso.id); toast('Entreno descartado'); hoy(el); }
  });
}
