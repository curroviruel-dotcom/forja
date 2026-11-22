// Utilidades de interfaz compartidas por todas las vistas.

export const $ = (s, el = document) => el.querySelector(s);
export const $$ = (s, el = document) => [...el.querySelectorAll(s)];
export const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const ico = (n, extra = '') => `<svg class="ico" ${extra} aria-hidden="true"><use href="#i-${n}"/></svg>`;

export const MUSCULO = {
  pecho: 'Pecho', hombro_ant: 'Hombros', hombro_lat: 'Hombros', hombro_post: 'Hombros',
  espalda_alta: 'Espalda', dorsal: 'Espalda', lumbar: 'Espalda', trapecio: 'Espalda',
  biceps: 'Bíceps', triceps: 'Tríceps', antebrazo: 'Antebrazo',
  cuadriceps: 'Cuádriceps', isquios: 'Isquios', gluteo: 'Glúteo', aductores: 'Aductores',
  abductores: 'Abductores', gemelo: 'Gemelo', abdomen: 'Abdomen', oblicuos: 'Oblicuos',
};

// Cabecera: grande (título de pestaña) o compacta (pantalla hija con volver y acción).
export function cabecera({ titulo, volver = null, accion = '', extra = '' }) {
  const c = $('#cabecera');
  if (volver || accion) {
    c.className = 'cabecera cabecera--compacta';
    c.innerHTML = `
      ${volver ? `<a class="btn btn--icon" href="${volver}" aria-label="Volver">${ico('back')}</a>` : '<span class="hueco"></span>'}
      <h1>${esc(titulo)}</h1>
      ${accion || '<span class="hueco"></span>'}`;
  } else {
    c.className = 'cabecera';
    c.innerHTML = `<div class="cabecera__fila"><h1>${esc(titulo)}</h1>${extra}</div>`;
  }
  document.title = `${titulo} · Forja`;
}

export function anunciar(texto) {
  const a = $('#anuncio'); a.textContent = ''; setTimeout(() => { a.textContent = texto; }, 50);
}

export function toast(texto, { error = false, deshacer = null, ms = 4000 } = {}) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.setAttribute('role', error ? 'alert' : 'status');
  t.innerHTML = `<span style="flex:1">${esc(texto)}</span>${deshacer ? '<button class="btn btn--ghost">Deshacer</button>' : ''}`;
  $('#avisos').append(t);
  const quitar = () => t.remove();
  if (deshacer) t.querySelector('button').onclick = () => { quitar(); deshacer(); };
  setTimeout(quitar, deshacer ? 5000 : ms);
}

// Hoja inferior. opciones: [{valor, texto, estilo: 'danger'|'sec'|''}]. Devuelve el valor elegido o null.
export function hoja({ titulo, texto = '', opciones, cancelar = 'Cancelar' }) {
  return new Promise((ok) => {
    const d = document.createElement('dialog');
    d.className = 'hoja';
    d.setAttribute('aria-labelledby', 'hoja-titulo');
    d.innerHTML = `
      <div class="hoja__asa"></div>
      <h2 id="hoja-titulo">${esc(titulo)}</h2>
      ${texto ? `<p class="muted hoja__texto">${esc(texto)}</p>` : ''}
      <div class="pila">
        ${opciones.map((o, i) => `<button class="btn btn--block ${o.estilo === 'danger' ? 'btn--danger' : o.estilo === 'sec' ? 'btn--sec' : ''}" data-i="${i}" ${o.deshabilitado ? 'disabled' : ''}>${esc(o.texto)}</button>`).join('')}
        <button class="btn btn--ghost btn--block" data-cancelar>${esc(cancelar)}</button>
      </div>`;
    document.body.append(d);
    const previo = document.activeElement;
    const cerrar = (v) => { d.close(); d.remove(); previo?.focus?.(); ok(v); };
    d.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (b?.dataset.i != null) cerrar(opciones[b.dataset.i].valor);
      else if (b?.hasAttribute('data-cancelar') || e.target === d) cerrar(null);
    });
    d.addEventListener('cancel', (e) => { e.preventDefault(); cerrar(null); });
    d.showModal();
  });
}

// Hoja con un campo numérico. Devuelve el número, o null si se cancela.
export function pedirNumero({ titulo, etiqueta, valor = '', min = 0, max = 100000, decimales = true }) {
  return new Promise((ok) => {
    const d = document.createElement('dialog');
    d.className = 'hoja';
    d.setAttribute('aria-labelledby', 'pn-t');
    d.innerHTML = `
      <div class="hoja__asa"></div>
      <h2 id="pn-t">${esc(titulo)}</h2>
      <form method="dialog" class="pila" novalidate>
        <div class="campo"><label for="pn-v">${esc(etiqueta)}</label>
          <input class="input" id="pn-v" inputmode="${decimales ? 'decimal' : 'numeric'}" value="${esc(String(valor).replace('.', ','))}" autocomplete="off" aria-describedby="pn-e">
          <span class="error" id="pn-e" hidden></span></div>
        <button class="btn btn--block" value="ok">Guardar</button>
        <button class="btn btn--ghost btn--block" value="" formnovalidate>Cancelar</button>
      </form>`;
    document.body.append(d);
    const previo = document.activeElement;
    const inp = d.querySelector('#pn-v');
    const fin = (v) => { d.close(); d.remove(); previo?.focus?.(); ok(v); };
    d.querySelector('form').addEventListener('submit', (e) => {
      e.preventDefault();
      if (e.submitter?.value !== 'ok') { fin(null); return; }
      const v = Number(inp.value.replace(',', '.'));
      if (!inp.value.trim() || !Number.isFinite(v) || v < min || v > max || (!decimales && !Number.isInteger(v))) {
        const er = d.querySelector('#pn-e'); er.textContent = `Escribe un número entre ${min} y ${max}.`; er.hidden = false;
        inp.setAttribute('aria-invalid', 'true'); inp.focus(); return;
      }
      fin(v);
    });
    d.addEventListener('cancel', (e) => { e.preventDefault(); fin(null); });
    d.showModal();
    inp.select();
  });
}

// ---------- Fotos de ejercicios (free-exercise-db, dominio público) ----------
export const fotoSrc = (e, i = 0) => (e?.foto ? `img/ej/${e.id}-${i}.jpg` : null);

export function miniatura(e) {
  return `<span class="ej-card__img">${e?.foto ? `<img src="${fotoSrc(e)}" alt="" loading="lazy" decoding="async">` : ico('pesa')}</span>`;
}

// Las dos fotos (inicio y final) alternándose. Tocar pausa / reanuda.
export function fotoEjercicio(e, { mini = false } = {}) {
  if (!e?.foto) return '';
  return `
    <figure class="foto-ej ${mini ? 'foto-ej--mini' : ''}" data-foto-ej role="img" aria-label="Cómo se hace ${esc(e.nombre)}: posición inicial y final">
      <img src="${fotoSrc(e, 0)}" alt="" decoding="async">
      <img class="foto-ej__b" src="${fotoSrc(e, 1)}" alt="" decoding="async">
      <figcaption aria-hidden="true">Inicio ↔ final</figcaption>
    </figure>`;
}

// Delegado global: tocar una foto la pausa o la reanuda
document.addEventListener('click', (ev) => { const f = ev.target.closest?.('[data-foto-ej]'); if (f) f.classList.toggle('foto-ej--pausa'); });

// Hoja con la foto y las claves de técnica (desde el entreno)
export function verTecnica(e) {
  const d = document.createElement('dialog');
  d.className = 'hoja';
  d.setAttribute('aria-labelledby', 'vt-t');
  d.innerHTML = `
    <div class="hoja__asa"></div>
    <h2 id="vt-t">${esc(e.nombre)}</h2>
    <div class="pila">
      ${fotoEjercicio(e)}
      ${e.claves?.length ? `<ol class="claves">${e.claves.map((c) => `<li>${esc(c)}</li>`).join('')}</ol>` : ''}
      <button class="btn btn--sec btn--block" data-cerrar>Cerrar</button>
    </div>`;
  document.body.append(d);
  const previo = document.activeElement;
  const cerrar = () => { d.close(); d.remove(); previo?.focus?.(); };
  d.addEventListener('click', (ev) => { if (ev.target === d || ev.target.closest('[data-cerrar]')) cerrar(); });
  d.addEventListener('cancel', (ev) => { ev.preventDefault(); cerrar(); });
  d.showModal();
}

export function vacio({ icono = 'lista', titulo, texto = '', boton = '' }) {
  return `<div class="card vacio">${ico(icono)}<h2>${esc(titulo)}</h2>${texto ? `<p>${esc(texto)}</p>` : ''}${boton}</div>`;
}
