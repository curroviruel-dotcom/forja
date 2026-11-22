// S10 Resumen al terminar: duración, volumen, series, récords y racha.
import { esc, ico, cabecera } from '../ui.js';
import * as entreno from '../datos/entreno.js';
import * as act from '../datos/actividades.js';
import { duracion } from '../logica/fechas.js';
import { fmtKg } from '../logica/progresion.js';
import { NOMBRE_RECORD } from '../logica/records.js';

const valorRecord = (r) => (r.tipo === 'reps' ? `${r.valor} reps` : r.tipo === 'volumen' ? `${Math.round(r.valor).toLocaleString('es')} kg` : `${fmtKg(r.valor)} kg`);

export default async function resumen(el, sesionId) {
  const s = await entreno.obtener(sesionId);
  cabecera({ titulo: 'Entreno terminado', accion: '<a class="btn btn--ghost" href="#/">Listo</a>' });
  if (!s?.resumen) {
    el.innerHTML = '<div class="card vacio"><h2>No encontramos este entreno</h2><a class="btn" href="#/">Volver a Hoy</a></div>';
    return;
  }
  const r = s.resumen;
  const racha = await act.racha();
  el.innerHTML = `
    <article class="card" aria-labelledby="t-res">
      <h2 class="card__titulo" id="t-res">${esc(s.nombre)}</h2>
      <p class="card__meta">${r.ejercicios} ${r.ejercicios === 1 ? 'ejercicio' : 'ejercicios'}</p>
      <div class="datos">
        <div class="dato"><b>${esc(duracion(r.duracionS))}</b><span>Duración</span></div>
        <div class="dato"><b>${r.volumenKg.toLocaleString('es')}</b><span>kg movidos</span></div>
        <div class="dato"><b>${r.series}</b><span>Series</span></div>
      </div>
    </article>

    <div class="racha racha--grande" style="justify-self:center" aria-label="Racha de ${racha.dias} días">
      <span class="racha__n">${racha.dias}</span>${racha.dias === 1 ? 'día de racha' : 'días de racha'}
    </div>

    <h2 class="titulo-seccion">Récords</h2>
    ${r.records.length
      ? `<ul class="grupo">${r.records.map((x) => `
          <li class="fila"><span><b style="font-weight:600">${esc(x.nombre)}</b><br><span class="muted" style="font:var(--t-sm)">${esc(NOMBRE_RECORD[x.tipo])}</span></span>
          <span class="record record--nuevo">${ico('trofeo')}${esc(valorRecord(x))}</span></li>`).join('')}</ul>`
      : '<p class="muted" style="margin:0">Hoy no hay récords nuevos. La constancia también cuenta.</p>'}

    <a class="btn btn--lg btn--block" href="#/">Volver a Hoy</a>`;
}
