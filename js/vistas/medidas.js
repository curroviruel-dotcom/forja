// S17 Peso y medidas: último peso, tendencia, gráfica, perímetros e historial.
import { $$, esc, ico, cabecera, vacio } from '../ui.js';
import * as medidas from '../datos/medidas.js';
import * as fotos from '../datos/fotos.js';
import { CAMPOS, serie, ultimo, cambio, tendenciaSemanal } from '../logica/medidas.js';
import { diaLocal, sumarDias, fechaCorta } from '../logica/fechas.js';
import { graficaLinea } from '../grafica.js';

const fmt = (n) => String(Math.round(n * 10) / 10).replace('.', ',');
const signo = (n) => (n > 0 ? `+${fmt(n)}` : n < 0 ? `−${fmt(-n)}` : '0');
const PERIODOS = [['1m', '1 mes', -30], ['3m', '3 meses', -91], ['todo', 'Todo', null]];
let periodo = '3m';
let campoGrafica = 'pesoKg';

export default async function vistaMedidas(el) {
  cabecera({ titulo: 'Peso y medidas', volver: '#/perfil', accion: '<a class="btn btn--ghost" href="#/medida-nueva">Añadir</a>' });
  const [lista, nFotos] = await Promise.all([medidas.listar(), fotos.listar().then((x) => x.length)]);
  const hoy = diaLocal();

  if (!lista.length) {
    el.innerHTML = vacio({ icono: 'grafica', titulo: 'Apunta tu peso', texto: 'Pésate a la misma hora (mejor al levantarte) unas veces por semana. Aquí verás la tendencia, no el día suelto.', boton: '<div class="pila" style="width:100%"><a class="btn btn--block" href="#/medida-nueva">Apuntar peso</a><a class="btn btn--sec btn--block" href="#/fotos">Fotos de progreso</a></div>' });
    return;
  }

  const desde = (() => { const p = PERIODOS.find(([id]) => id === periodo); return p[2] == null ? '' : sumarDias(hoy, p[2]); })();
  const peso = ultimo(lista, 'pesoKg');
  const tend = tendenciaSemanal(lista, hoy);
  const cambioPeriodo = cambio(lista, 'pesoKg', desde);
  const [, nombreCampo, ud] = CAMPOS.find(([id]) => id === campoGrafica);
  const puntos = serie(lista, campoGrafica, desde).map((p) => ({ x: fechaCorta(p.fecha, hoy), y: p.valor }));
  const conDatos = CAMPOS.filter(([id]) => ultimo(lista, id));

  el.innerHTML = `
    <article class="card" aria-label="Peso actual">
      ${peso ? `
        <div class="kcal"><b class="tab-num">${fmt(peso.valor)}</b><span class="muted"> kg · ${esc(fechaCorta(peso.fecha, hoy).toLowerCase())}</span></div>
        <div class="datos" style="margin-top:var(--s-3)">
          <div class="dato"><b>${tend == null ? '—' : signo(tend)}</b><span>kg / semana</span></div>
          <div class="dato"><b>${cambioPeriodo ? signo(cambioPeriodo.valor) : '—'}</b><span>${esc(PERIODOS.find(([id]) => id === periodo)[1].toLowerCase())}</span></div>
          <div class="dato"><b>${serie(lista, 'pesoKg').length}</b><span>registros</span></div>
        </div>
        <p class="card__meta" style="margin:var(--s-3) 0 0">${tend == null ? 'La tendencia sale cuando tengas pesos en las dos últimas semanas.' : 'Tendencia: media de los últimos 7 días frente a los 7 anteriores.'}</p>`
      : '<p class="card__meta" style="margin:0">Aún no has apuntado tu peso, solo medidas.</p>'}
    </article>

    <div class="chips" role="group" aria-label="Periodo">
      ${PERIODOS.map(([id, n]) => `<button class="chip" data-periodo="${id}" aria-pressed="${periodo === id}">${n}</button>`).join('')}
    </div>

    <section class="card" aria-labelledby="t-graf">
      <h2 class="card__titulo" id="t-graf">${esc(nombreCampo)}</h2>
      ${conDatos.length > 1 ? `<div class="chips" role="group" aria-label="Qué medida ver" style="margin-bottom:var(--s-2)">
        ${conDatos.map(([id, n]) => `<button class="chip chip--sec" data-campo="${id}" aria-pressed="${campoGrafica === id}">${n}</button>`).join('')}</div>` : ''}
      ${puntos.length >= 2 ? graficaLinea(puntos, { titulo: nombreCampo, unidad: ud, textoMax: 'máximo' })
        : `<p class="card__meta" style="margin:0">Necesitas al menos dos registros de ${esc(nombreCampo.toLowerCase())} en este periodo para ver la gráfica.</p>`}
    </section>

    <a class="card card__enlace-total" href="#/fotos">
      <span style="flex:1"><b class="card__titulo" style="display:block">Fotos de progreso</b>
      <span class="card__meta" style="display:block;margin:0">${nFotos ? `${nFotos} ${nFotos === 1 ? 'foto' : 'fotos'} · compara dos fechas` : 'Hazte una para ver los cambios con el tiempo'}</span></span>
      <span class="muted">${ico('chevron')}</span>
    </a>

    <section aria-labelledby="t-per">
      <h2 class="grupo-titulo" id="t-per">Últimas medidas</h2>
      <ul class="grupo">
        ${CAMPOS.map(([id, n, u]) => {
          const ult = ultimo(lista, id);
          const c = cambio(lista, id);
          return `<li class="fila"><span>${n}</span><span class="fila__valor tab-num">${ult ? `${fmt(ult.valor)} ${u}${c ? ` <span class="${c.valor === 0 ? '' : 'texto-acento'}">(${signo(c.valor)})</span>` : ''}` : '—'}</span></li>`;
        }).join('')}
      </ul>
      <p class="muted" style="font:var(--t-sm);margin:var(--s-2) var(--s-4) 0">Entre paréntesis, el cambio desde tu primer registro.</p>
    </section>

    <section aria-labelledby="t-hist">
      <h2 class="grupo-titulo" id="t-hist">Historial</h2>
      <ul class="grupo">${lista.map((m) => `
        <li><a class="fila" href="#/medida/${m.id}">
          <span>${esc(fechaCorta(m.fecha, hoy))}</span>
          <span class="fila__valor tab-num" style="text-align:right">${CAMPOS.filter(([id]) => m[id] != null).map(([id, n, u]) => (id === 'pesoKg' ? `${fmt(m[id])} kg` : `${n.toLowerCase()} ${fmt(m[id])}`)).map(esc).join(' · ')}</span>
          <span class="muted">${ico('chevron')}</span></a></li>`).join('')}
      </ul>
    </section>`;

  $$('[data-periodo]', el).forEach((b) => b.onclick = () => { periodo = b.dataset.periodo; vistaMedidas(el); });
  $$('[data-campo]', el).forEach((b) => b.onclick = () => { campoGrafica = b.dataset.campo; vistaMedidas(el); });
}
