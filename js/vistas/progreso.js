// S13 Progreso: series por músculo, volumen por grupo, constancia, récords y ejercicios más hechos.
import * as db from '../db.js';
import { $$, esc, ico, cabecera, vacio } from '../ui.js';
import { mapaEjercicios } from '../datos/semilla.js';
import { sesionesTerminadas } from '../datos/historial.js';
import * as act from '../datos/actividades.js';
import { diaLocal, sumarDias, fechaCorta } from '../logica/fechas.js';
import { seriesPorGrupo, volumenPorGrupo, diasPorSemana, masHechos, zona, lunes } from '../logica/stats.js';
import { NOMBRE_RECORD } from '../logica/records.js';
import { chipRacha } from './hoy.js';

const PERIODOS = [['semana', 'Esta semana'], ['4s', '4 semanas'], ['3m', '3 meses']];
let periodo = 'semana';

const TEXTO_ZONA = { nada: 'Sin series', bajo: 'Por debajo de 10', bien: 'Entre 10 y 20', alto: 'Más de 20' };

export default async function progreso(el) {
  const hoy = diaLocal();
  const [ejercicios, todas, sesiones, actividades, racha] = await Promise.all([
    mapaEjercicios(), db.todos('series'), sesionesTerminadas(), act.listar(), act.racha(),
  ]);
  cabecera({ titulo: 'Progreso', extra: chipRacha(racha) });

  // Solo series de entrenos terminados (no las del que está en curso)
  const terminadas = new Set(sesiones.map((s) => s.id));
  const series = todas.filter((s) => terminadas.has(s.sesionId));

  if (!sesiones.length) {
    el.innerHTML = vacio({ icono: 'grafica', titulo: 'Aún no hay nada que medir', texto: 'Termina un par de entrenos y aquí verás tus series por músculo, tu volumen y tus récords.', boton: '<a class="btn" href="#/">Ir a Hoy</a>' });
    return;
  }

  const desde = periodo === 'semana' ? lunes(hoy) : sumarDias(hoy, periodo === '4s' ? -27 : -90);
  const porGrupo = seriesPorGrupo(series, ejercicios, periodo === 'semana' ? desde : lunes(desde), hoy);
  const maxSeries = Math.max(22, ...porGrupo.map((g) => g.series));
  const vol = volumenPorGrupo(series, ejercicios, desde, hoy);
  const maxVol = Math.max(1, ...vol.map((v) => v.kg));
  const constancia = diasPorSemana([...sesiones.map((s) => s.fecha), ...actividades.map((a) => a.fecha)], hoy, 8);
  const recientes = sesiones.flatMap((s) => (s.resumen?.records ?? []).map((r) => ({ ...r, fecha: s.fecha }))).slice(0, 8);
  const top = masHechos(series);
  const enPeriodo = sesiones.filter((s) => s.fecha >= desde);

  el.innerHTML = `
    <div class="chips" role="group" aria-label="Periodo">
      ${PERIODOS.map(([id, n]) => `<button class="chip" data-periodo="${id}" aria-pressed="${periodo === id}">${n}</button>`).join('')}
    </div>

    <article class="card">
      <div class="datos">
        <div class="dato"><b>${enPeriodo.length}</b><span>Entrenos</span></div>
        <div class="dato"><b>${enPeriodo.reduce((a, s) => a + (s.resumen?.series ?? 0), 0)}</b><span>Series</span></div>
        <div class="dato"><b>${String(Math.round(enPeriodo.reduce((a, s) => a + (s.resumen?.volumenKg ?? 0), 0) / 100) / 10).replace('.', ',')}</b><span>Toneladas</span></div>
      </div>
    </article>

    <section class="card" aria-labelledby="t-spm">
      <h2 class="card__titulo" id="t-spm">Series por músculo${periodo === 'semana' ? ' esta semana' : ' (media por semana)'}</h2>
      <p class="card__meta">La guía general para ganar músculo es de 10 a 20 series duras por semana. Los músculos secundarios cuentan media serie.</p>
      <ul class="barras" role="list">
        ${porGrupo.map((g) => `
          <li class="barra barra--${zona(g.series)}">
            <span class="barra__nombre">${esc(g.nombre)}</span>
            <span class="barra__pista" aria-hidden="true">
              <span class="barra__banda" style="left:${(10 / maxSeries) * 100}%;width:${(10 / maxSeries) * 100}%"></span>
              <span class="barra__relleno" style="width:${(g.series / maxSeries) * 100}%"></span>
            </span>
            <span class="barra__valor" aria-label="${g.series} series, ${TEXTO_ZONA[zona(g.series)].toLowerCase()}">${String(g.series).replace('.', ',')}</span>
          </li>`).join('')}
      </ul>
    </section>

    <section class="card" aria-labelledby="t-vol">
      <h2 class="card__titulo" id="t-vol">Volumen por grupo</h2>
      <p class="card__meta">Kilos × repeticiones en ${PERIODOS.find(([id]) => id === periodo)[1].toLowerCase()}, solo el músculo principal.</p>
      <ul class="barras" role="list">
        ${vol.filter((v) => v.kg > 0).map((v) => `
          <li class="barra barra--bien">
            <span class="barra__nombre">${esc(v.nombre)}</span>
            <span class="barra__pista" aria-hidden="true"><span class="barra__relleno" style="width:${(v.kg / maxVol) * 100}%"></span></span>
            <span class="barra__valor">${v.kg.toLocaleString('es')}</span>
          </li>`).join('') || '<li class="muted">Sin series con peso en este periodo.</li>'}
      </ul>
    </section>

    <section class="card" aria-labelledby="t-const">
      <h2 class="card__titulo" id="t-const">Días entrenados por semana</h2>
      <p class="card__meta">Últimas 8 semanas. Cuentan el gimnasio y los otros deportes.</p>
      <div class="columnas" role="img" aria-label="${esc(constancia.map((c) => `semana del ${fechaCorta(c.semana)}: ${c.dias} días`).join('; '))}">
        ${constancia.map((c, i) => `<div class="columna ${i === constancia.length - 1 ? 'columna--actual' : ''}">
          <span class="columna__n">${c.dias}</span><span class="columna__barra" style="height:${(c.dias / 7) * 100}%"></span></div>`).join('')}
      </div>
    </section>

    <section aria-labelledby="t-rec">
      <h2 class="titulo-seccion" id="t-rec">Récords recientes</h2>
      ${recientes.length ? `<ul class="grupo" style="margin-top:var(--s-2)">${recientes.map((r) => `
        <li><a class="fila" href="#/ejercicio/${r.ejercicioId}">
          <span style="flex:1"><b style="font-weight:600">${esc(r.nombre)}</b><br><span class="muted" style="font:var(--t-sm)">${esc(NOMBRE_RECORD[r.tipo])} · ${esc(fechaCorta(r.fecha))}</span></span>
          <span class="record">${ico('trofeo')}${r.tipo === 'reps' ? `${r.valor} reps` : `${String(Math.round(r.valor * 10) / 10).replace('.', ',')} kg`}</span></a></li>`).join('')}</ul>`
        : '<p class="muted" style="margin:var(--s-2) 0 0">Cuando superes una marca aparecerá aquí.</p>'}
    </section>

    <section aria-labelledby="t-top">
      <h2 class="titulo-seccion" id="t-top">Tus ejercicios más hechos</h2>
      <ul class="grupo" style="margin-top:var(--s-2)">${top.map((t) => `
        <li><a class="fila" href="#/ejercicio/${t.id}"><span>${esc(ejercicios.get(t.id)?.nombre ?? t.id)}</span>
          <span class="fila__valor">${t.sesiones} ${t.sesiones === 1 ? 'vez' : 'veces'} ${ico('chevron')}</span></a></li>`).join('')}</ul>
    </section>`;

  $$('[data-periodo]', el).forEach((b) => b.onclick = () => { periodo = b.dataset.periodo; progreso(el); });
}
