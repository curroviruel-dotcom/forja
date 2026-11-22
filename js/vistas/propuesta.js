// S03 Rutina propuesta por el cuestionario: revisar, regenerar o aceptar.
import { $, esc, cabecera, toast } from '../ui.js';
import { estado } from '../datos/estado.js';
import * as perfil from '../datos/perfil.js';
import * as rutinas from '../datos/rutinas.js';
import { mapaEjercicios } from '../datos/semilla.js';

export default async function propuesta(el) {
  if (!estado.propuesta || !estado.perfilBorrador) { location.hash = '#/cuestionario/1'; return; }
  const ejercicios = await mapaEjercicios();
  const { rutina } = estado.propuesta;
  cabecera({ titulo: 'Tu rutina', volver: '#/cuestionario/5' });

  el.innerHTML = `
    <div>
      <h2 class="titulo-seccion" style="margin:0">${esc(rutina.nombre)}</h2>
      <p class="muted" style="margin:var(--s-1) 0 0">Vas haciendo los días en orden. Si un día no puedes ir, al siguiente toca el que te saltaste.</p>
    </div>
    ${rutina.dias.map((d, i) => `
      <article class="card" aria-labelledby="pd-${i}">
        <span class="etiqueta">Día ${i + 1}</span>
        <h3 class="card__titulo" id="pd-${i}" style="margin-top:var(--s-2)">${esc(d.nombre)}</h3>
        <ul class="lista-ej" style="margin:var(--s-2) 0 0">
          ${d.ejercicios.map((e) => `<li><span>${esc(ejercicios.get(e.ejercicioId)?.nombre ?? e.ejercicioId)}</span><span>${e.series} × ${e.repMin}–${e.repMax}${ejercicios.get(e.ejercicioId)?.tipo === 'tiempo' ? ' s' : ''}</span></li>`).join('')}
        </ul>
      </article>`).join('')}
    <div class="pila">
      <button class="btn btn--lg btn--block" id="b-usar">Usar esta rutina</button>
      <button class="btn btn--sec btn--block" id="b-yo">Prefiero montarla yo</button>
      <a class="btn btn--ghost btn--block" href="#/cuestionario/1">Cambiar mis respuestas</a>
    </div>`;

  // Montarla a mano: se guardan las respuestas (sirven para Comida) y se abre el editor vacío.
  $('#b-yo', el).onclick = async () => {
    await perfil.guardar(estado.perfilBorrador);
    await perfil.marcarOnboarding();
    estado.propuesta = null; estado.perfilBorrador = null;
    location.hash = '#/rutina/nueva';
  };

  $('#b-usar', el).onclick = async (e) => {
    e.currentTarget.classList.add('is-loading');
    await perfil.guardar(estado.perfilBorrador);
    await rutinas.guardar(rutinas.conIds(rutina), { activar: true });
    await perfil.marcarOnboarding();
    estado.propuesta = null; estado.perfilBorrador = null;
    toast('Rutina guardada. Puedes cambiarla en Perfil → Mis rutinas.');
    location.hash = '#/';
  };
}
