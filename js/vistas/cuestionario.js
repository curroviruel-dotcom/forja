// S02 Cuestionario: cinco pasos, uno por pantalla (#/cuestionario/1 … 5). El botón Atrás del sistema funciona.
import { $, esc, ico, cabecera } from '../ui.js';
import { estado } from '../datos/estado.js';
import * as perfil from '../datos/perfil.js';
import { generarRutina } from '../logica/generador.js';
import { mapaEjercicios } from '../datos/semilla.js';
import { leerNumero } from '../logica/progresion.js';

const PASOS = [
  {
    clave: 'objetivo', titulo: '¿Qué buscas sobre todo?',
    opciones: [
      ['musculo', 'Ganar músculo', 'Más volumen y repeticiones medias'],
      ['fuerza', 'Ganar fuerza', 'Menos repeticiones y más peso en los básicos'],
      ['perder_grasa', 'Perder grasa sin perder músculo', 'Entreno de fuerza; la dieta hace el resto'],
    ],
  },
  {
    clave: 'experiencia', titulo: '¿Cuánto llevas entrenando con pesas?',
    opciones: [
      ['novato', 'Estoy empezando', 'Menos de 6 meses, o lo dejé hace mucho'],
      ['intermedio', 'Algo de experiencia', 'Entre 6 meses y 2 años'],
      ['avanzado', 'Bastante', 'Más de 2 años entrenando en serio'],
    ],
  },
  {
    clave: 'diasSemana', titulo: '¿Cuántos días por semana puedes entrenar?', numero: true,
    opciones: [
      [2, '2 días', 'Cuerpo completo'], [3, '3 días', 'Cuerpo completo, tres variantes'],
      [4, '4 días', 'Torso y pierna'], [5, '5 días', 'Empuje, tirón, pierna, torso y pierna'], [6, '6 días', 'Empuje, tirón y pierna dos veces'],
    ],
  },
  {
    clave: 'lugar', titulo: '¿Dónde vas a entrenar?',
    opciones: [
      ['gimnasio', 'En un gimnasio', 'Máquinas, barras, poleas y mancuernas'],
      ['casa_mancuernas', 'En casa con mancuernas', 'Mancuernas y tu peso corporal'],
      ['sin_material', 'Sin material', 'Solo con tu peso corporal'],
    ],
  },
  { clave: 'sobre_ti', titulo: 'Un poco sobre ti' },
];

export default async function cuestionario(el, pasoTxt) {
  const n = Math.min(PASOS.length, Math.max(1, Number(pasoTxt) || 1));
  estado.perfilBorrador ??= { ...(await perfil.obtener()) };
  const p = estado.perfilBorrador;
  const paso = PASOS[n - 1];

  cabecera({ titulo: `Paso ${n} de ${PASOS.length}`, volver: n > 1 ? `#/cuestionario/${n - 1}` : '#/bienvenida' });

  const cuerpo = paso.opciones ? `
      <fieldset class="opciones">
        <legend>${esc(paso.titulo)}</legend>
        ${paso.opciones.map(([v, t, d]) => `
          <label class="opcion"><input type="radio" name="op" value="${v}" ${String(p[paso.clave]) === String(v) ? 'checked' : ''}>
            <span class="opcion__txt"><b>${esc(t)}</b><span>${esc(d)}</span></span>${ico('check')}</label>`).join('')}
      </fieldset>
      ${paso.clave === 'lugar' ? `
        <div id="c-barra" class="pila" ${p.lugar === 'gimnasio' || !p.lugar ? 'hidden' : ''}>
        <h2 class="grupo-titulo" style="margin:var(--s-2) 0 0">Además</h2>
        <label class="opcion">
          <input type="checkbox" id="barra" ${p.barraDominadas ? 'checked' : ''}>
          <span class="opcion__txt"><b>Tengo barra de dominadas</b><span>En una puerta o en un parque cercano</span></span>${ico('check')}</label></div>` : ''}`
    : `
      <fieldset class="opciones">
        <legend>${esc(paso.titulo)}</legend>
        <div class="segmentado" role="radiogroup" aria-label="Sexo">
          <label class="opcion"><input type="radio" name="sexo" value="hombre" ${p.sexo === 'hombre' ? 'checked' : ''}><span class="opcion__txt"><b>Hombre</b></span></label>
          <label class="opcion"><input type="radio" name="sexo" value="mujer" ${p.sexo === 'mujer' ? 'checked' : ''}><span class="opcion__txt"><b>Mujer</b></span></label>
        </div>
        <div class="campo"><label for="peso">Peso corporal (kg)</label>
          <input class="input" id="peso" inputmode="decimal" autocomplete="off" value="${p.pesoKg ?? ''}" placeholder="70" aria-describedby="e-peso"><span class="error" id="e-peso" hidden></span></div>
        <div class="campo"><label for="altura">Altura en cm (opcional)</label>
          <input class="input" id="altura" inputmode="numeric" autocomplete="off" value="${p.alturaCm ?? ''}" placeholder="175" aria-describedby="e-alt"><span class="error" id="e-alt" hidden></span></div>
        <div class="campo"><label for="edad">Edad (opcional)</label>
          <input class="input" id="edad" inputmode="numeric" autocomplete="off" value="${p.edad ?? ''}" placeholder="20" aria-describedby="e-edad"><span class="error" id="e-edad" hidden></span></div>
        <p class="muted" style="font:var(--t-sm);margin:0">El sexo y el peso sirven para los objetivos de comida. La altura y la edad, también. Nada sale de tu iPhone.</p>
        <span class="error" id="e-sexo" hidden></span>
      </fieldset>`;

  el.innerHTML = `
    <div class="progreso" role="progressbar" aria-label="Paso ${n} de ${PASOS.length}" aria-valuemin="1" aria-valuemax="${PASOS.length}" aria-valuenow="${n}"><i style="width:${(n / PASOS.length) * 100}%"></i></div>
    <form id="f-paso" class="pila" novalidate>
      ${cuerpo}
      <button class="btn btn--lg btn--block" id="b-sig" type="submit">${n < PASOS.length ? 'Siguiente' : 'Ver mi rutina'}</button>
    </form>`;

  const f = $('#f-paso', el);
  const boton = $('#b-sig', el);
  const listo = () => (paso.opciones ? !!f.querySelector('input[name="op"]:checked') : true);
  const refrescar = () => { boton.disabled = !listo(); };
  refrescar();

  f.addEventListener('change', (e) => {
    if (e.target.name === 'op') {
      p[paso.clave] = paso.numero ? Number(e.target.value) : e.target.value;
      if (paso.clave === 'lugar') $('#c-barra', el).hidden = e.target.value === 'gimnasio';
    }
    if (e.target.id === 'barra') p.barraDominadas = e.target.checked;
    refrescar();
  });

  const error = (id, texto, input) => {
    const s = $(`#${id}`, el); s.textContent = texto; s.hidden = !texto;
    if (input) { if (texto) input.setAttribute('aria-invalid', 'true'); else input.removeAttribute('aria-invalid'); }
    return !texto;
  };

  f.onsubmit = async (e) => {
    e.preventDefault();
    if (!listo()) return;
    if (paso.clave === 'sobre_ti') {
      const sexo = f.querySelector('input[name="sexo"]:checked')?.value;
      const peso = leerNumero($('#peso', el).value);
      const alt = leerNumero($('#altura', el).value);
      const edad = leerNumero($('#edad', el).value);
      let ok = error('e-sexo', sexo ? '' : 'Elige una opción de sexo.');
      ok = error('e-peso', peso != null && peso >= 30 && peso <= 250 ? '' : 'Escribe tu peso: un número entre 30 y 250.', $('#peso', el)) && ok;
      ok = error('e-alt', alt == null || (alt >= 120 && alt <= 230) ? '' : 'La altura va en centímetros, entre 120 y 230.', $('#altura', el)) && ok;
      ok = error('e-edad', edad == null || (Number.isInteger(edad) && edad >= 14 && edad <= 100) ? '' : 'La edad debe estar entre 14 y 100.', $('#edad', el)) && ok;
      if (!ok) { el.querySelector('[aria-invalid="true"]')?.focus(); return; }
      Object.assign(p, { sexo, pesoKg: peso, alturaCm: alt, edad });
      const catalogo = [...(await mapaEjercicios()).values()];
      estado.propuesta = { rutina: generarRutina(p, catalogo, 0), semilla: 0 };
      location.hash = '#/propuesta';
      return;
    }
    location.hash = `#/cuestionario/${n + 1}`;
  };
}
