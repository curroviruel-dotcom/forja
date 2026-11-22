// S12 Detalle de un entreno pasado: ver, corregir series, añadir nota, borrar.
import { $, esc, ico, cabecera, hoja, toast } from '../ui.js';
import * as historial from '../datos/historial.js';
import { mapaEjercicios } from '../datos/semilla.js';
import { fechaCorta, duracion } from '../logica/fechas.js';
import { fmtKg, leerNumero } from '../logica/progresion.js';
import { NOMBRE_RECORD } from '../logica/records.js';

export default async function vistaSesion(el, id) {
  let editando = false;
  const ejercicios = await mapaEjercicios();

  async function pintar() {
    const { sesion, series } = await historial.detalle(id);
    if (!sesion || sesion.estado !== 'terminada') {
      cabecera({ titulo: 'Entreno', volver: '#/historial' });
      el.innerHTML = '<div class="card vacio"><h2>Este entreno ya no existe</h2><a class="btn" href="#/historial">Ir al historial</a></div>';
      return;
    }
    cabecera({ titulo: sesion.nombre, volver: '#/historial', accion: `<button class="btn btn--ghost" id="b-editar">${editando ? 'Hecho' : 'Editar'}</button>` });
    $('#b-editar').onclick = () => { editando = !editando; pintar(); };

    const r = sesion.resumen ?? {};
    const bloques = sesion.ejercicios
      .map((se) => ({ se, ss: series.filter((s) => s.sesionEjercicioId === se.id) }))
      .filter((b) => b.ss.length);
    const hora = new Date(sesion.inicio).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });

    el.innerHTML = `
      <article class="card" aria-label="Resumen">
        <p class="card__meta">${esc(fechaCorta(sesion.fecha))} · ${hora}</p>
        <div class="datos">
          <div class="dato"><b>${esc(duracion(r.duracionS ?? 0))}</b><span>Duración</span></div>
          <div class="dato"><b>${(r.volumenKg ?? 0).toLocaleString('es')}</b><span>kg movidos</span></div>
          <div class="dato"><b>${r.series ?? 0}</b><span>Series</span></div>
        </div>
        ${r.records?.length ? `<div class="fila-flex" style="margin-top:var(--s-3)">${r.records.map((x) => `<span class="record">${ico('trofeo')}${esc(x.nombre)}: ${esc(NOMBRE_RECORD[x.tipo].toLowerCase())}</span>`).join('')}</div>` : ''}
      </article>

      ${bloques.map(({ se, ss }) => {
        const ej = ejercicios.get(se.ejercicioId);
        const conPeso = ['peso_reps', 'asistido'].includes(ej?.tipo ?? 'peso_reps');
        return `
        <section class="ejercicio" aria-labelledby="t-${se.id}">
          <div class="ejercicio__cab"><h3 id="t-${se.id}"><a class="enlace-ej" href="#/ejercicio/${se.ejercicioId}">${esc(ej?.nombre ?? se.ejercicioId)}</a></h3></div>
          <ol class="lista-series">
            ${ss.map((s, i) => editando ? `
              <li class="serie-edit" data-serie="${s.id}">
                <span class="serie__n">${i + 1}</span>
                ${conPeso ? `<input class="num" data-campo="kg" inputmode="decimal" value="${fmtKg(s.kg)}" aria-label="Serie ${i + 1}, kilos"><span class="muted">kg ×</span>` : ''}
                <input class="num" data-campo="reps" inputmode="numeric" value="${s.reps}" aria-label="Serie ${i + 1}, ${ej?.tipo === 'tiempo' ? 'segundos' : 'repeticiones'}">
                <button class="btn btn--icon" data-borrar="${s.id}" aria-label="Borrar serie ${i + 1}" style="color:var(--c-danger)">✕</button>
              </li>` : `
              <li class="serie-ver"><span class="serie__n">${i + 1}</span>
                <span class="tab-num">${conPeso && s.kg != null ? `${fmtKg(s.kg)} kg × ${s.reps}` : `${s.reps} ${ej?.tipo === 'tiempo' ? 's' : 'reps'}`}</span></li>`).join('')}
          </ol>
        </section>`;
      }).join('') || '<p class="muted">Este entreno no tiene series.</p>'}

      <div class="campo"><label for="nota">Nota del entreno</label>
        <textarea class="input" id="nota" rows="3" maxlength="400" placeholder="Cómo te has sentido, molestias, lo que quieras recordar">${esc(sesion.notas ?? '')}</textarea></div>

      <button class="btn btn--ghost btn--block" id="b-borrar" style="color:var(--c-danger)">Borrar este entreno</button>`;

    // Nota: se guarda al salir del campo
    $('#nota', el).onchange = async (e) => { await historial.editarSesion({ ...sesion, notas: e.target.value.trim() }); toast('Nota guardada'); };

    el.querySelectorAll('.serie-edit .num').forEach((inp) => inp.onchange = async () => {
      const s = series.find((x) => x.id === inp.closest('[data-serie]').dataset.serie);
      const v = leerNumero(inp.value);
      const valido = inp.dataset.campo === 'kg' ? v != null && v >= 0 && v <= 1000 : Number.isInteger(v) && v > 0 && v <= 1000;
      if (!valido) { inp.setAttribute('aria-invalid', 'true'); toast(inp.dataset.campo === 'kg' ? 'Peso no válido' : 'Número entero mayor que 0', { error: true }); return; }
      inp.removeAttribute('aria-invalid');
      await historial.editarSerie({ ...s, [inp.dataset.campo]: v });
      toast('Serie corregida. Récords recalculados.');
    });

    el.querySelectorAll('[data-borrar]').forEach((b) => b.onclick = async () => {
      const s = series.find((x) => x.id === b.dataset.borrar);
      await historial.borrarSerie(s);
      toast('Serie borrada', { deshacer: async () => { await historial.editarSerie(s); pintar(); } });
      pintar();
    });

    $('#b-borrar', el).onclick = async () => {
      const ok = await hoja({ titulo: '¿Borrar este entreno?', texto: `${sesion.nombre}, ${fechaCorta(sesion.fecha).toLowerCase()}. Se borran sus series y se recalculan tus récords. No se puede deshacer.`, opciones: [{ valor: 'si', texto: 'Borrar entreno', estilo: 'danger' }] });
      if (!ok) return;
      await historial.borrarSesion(id);
      toast('Entreno borrado');
      location.hash = '#/historial';
    };
  }

  await pintar();
}
