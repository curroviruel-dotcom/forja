// Fotos de progreso: añadir, comparar dos fechas y galería. Todo se queda en el dispositivo.
import { $, $$, esc, ico, cabecera, hoja, toast, vacio } from '../ui.js';
import * as fotos from '../datos/fotos.js';
import * as medidas from '../datos/medidas.js';
import { diaLocal, diffDias, fechaCorta } from '../logica/fechas.js';

const fmt = (n) => String(Math.round(n * 10) / 10).replace('.', ',');
let angulo = 'frente';
let anguloComparar = 'frente';
let antesId = null, despuesId = null;

export default async function vistaFotos(el) {
  const u = fotos.urls();
  cabecera({ titulo: 'Fotos de progreso', volver: '#/medidas' });
  const hoy = diaLocal();

  async function pintar() {
    u.liberar();
    const [lista, regs] = await Promise.all([fotos.listar(), medidas.listar()]);
    const pesoDe = (fecha) => regs.find((m) => m.fecha === fecha && m.pesoKg != null)?.pesoKg;
    const deAngulo = lista.filter((f) => f.angulo === anguloComparar).sort((a, b) => a.fecha.localeCompare(b.fecha));
    // Por defecto se compara la primera con la última de ese ángulo
    if (!deAngulo.some((f) => f.id === antesId)) antesId = deAngulo[0]?.id ?? null;
    if (!deAngulo.some((f) => f.id === despuesId)) despuesId = deAngulo.at(-1)?.id ?? null;
    const A = deAngulo.find((f) => f.id === antesId), B = deAngulo.find((f) => f.id === despuesId);
    const mb = lista.reduce((s, f) => s + (f.bytes ?? f.blob?.size ?? 0), 0) / 1048576;

    const fechas = [...new Set(lista.map((f) => f.fecha))];
    const opcion = (f, sel) => `<option value="${f.id}" ${f.id === sel ? 'selected' : ''}>${esc(fechaCorta(f.fecha, hoy))}${pesoDe(f.fecha) ? ` · ${fmt(pesoDe(f.fecha))} kg` : ''}</option>`;
    const lado = (f, titulo) => f ? `
      <figure class="comparar__lado">
        <img src="${u.de(f)}" alt="${titulo}: ${esc(fechaCorta(f.fecha, hoy))}">
        <figcaption><b>${titulo}</b> ${esc(fechaCorta(f.fecha, hoy))}${pesoDe(f.fecha) ? ` · ${fmt(pesoDe(f.fecha))} kg` : ''}</figcaption>
      </figure>` : '';

    el.innerHTML = `
      <form id="f-foto" class="card pila" novalidate aria-labelledby="t-nueva">
        <h2 class="card__titulo" id="t-nueva">Nueva foto</h2>
        <div class="segmentado segmentado--3" role="radiogroup" aria-label="Ángulo">
          ${fotos.ANGULOS.map(([id, n]) => `<button type="button" class="chip ${angulo === id ? '' : 'chip--sec'}" role="radio" aria-checked="${angulo === id}" aria-pressed="${angulo === id}" data-angulo="${id}">${n}</button>`).join('')}
        </div>
        <div class="campo"><label for="f-fecha">Día</label><input class="input" type="date" id="f-fecha" value="${hoy}" max="${hoy}"></div>
        <label class="btn btn--lg btn--block" id="b-subir">${ico('plus')}Hacer o elegir foto
          <input type="file" accept="image/*" id="f-archivo" hidden></label>
        <p class="muted" style="font:var(--t-sm);margin:0">Consejo: misma luz, misma distancia y misma postura cada vez. Las fotos no salen de tu dispositivo.</p>
      </form>

      ${lista.length ? `
      <section class="card pila" aria-labelledby="t-comp">
        <h2 class="card__titulo" id="t-comp">Comparar</h2>
        <div class="chips" role="group" aria-label="Ángulo a comparar">
          ${fotos.ANGULOS.map(([id, n]) => `<button class="chip chip--sec" data-comp="${id}" aria-pressed="${anguloComparar === id}">${n} · ${lista.filter((f) => f.angulo === id).length}</button>`).join('')}
        </div>
        ${deAngulo.length >= 2 ? `
          <div class="rejilla-2">
            <div class="campo"><label for="s-antes">Antes</label><select class="input" id="s-antes">${deAngulo.map((f) => opcion(f, antesId)).join('')}</select></div>
            <div class="campo"><label for="s-despues">Después</label><select class="input" id="s-despues">${deAngulo.map((f) => opcion(f, despuesId)).join('')}</select></div>
          </div>
          <div class="comparar">${lado(A, 'Antes')}${lado(B, 'Después')}</div>
          ${A && B ? `<p class="card__meta" style="margin:0">${Math.abs(diffDias(A.fecha, B.fecha))} días entre una y otra${pesoDe(A.fecha) && pesoDe(B.fecha) ? ` · ${pesoDe(B.fecha) - pesoDe(A.fecha) > 0 ? '+' : ''}${fmt(pesoDe(B.fecha) - pesoDe(A.fecha))} kg` : ''}.</p>` : ''}`
          : `<p class="card__meta" style="margin:0">Necesitas dos fotos de ${esc(fotos.ANGULOS.find(([id]) => id === anguloComparar)[1].toLowerCase())} para compararlas.</p>`}
      </section>

      <section aria-labelledby="t-gal">
        <h2 class="grupo-titulo" id="t-gal">Todas · ${lista.length} ${lista.length === 1 ? 'foto' : 'fotos'} · ${fmt(mb)} MB</h2>
        ${fechas.map((fecha) => `
          <h3 class="subtitulo-fecha">${esc(fechaCorta(fecha, hoy))}${pesoDe(fecha) ? ` · ${fmt(pesoDe(fecha))} kg` : ''}</h3>
          <ul class="rejilla-fotos">
            ${lista.filter((f) => f.fecha === fecha).map((f) => `
              <li><button class="foto-mini" data-ver="${f.id}" aria-label="Ver foto de ${esc(f.angulo)} del ${esc(fechaCorta(fecha, hoy))}">
                <img src="${u.de(f)}" alt="" loading="lazy"><span>${esc(fotos.ANGULOS.find(([id]) => id === f.angulo)?.[1] ?? '')}</span></button></li>`).join('')}
          </ul>`).join('')}
      </section>`
      : vacio({ icono: 'yo', titulo: 'Aún no hay fotos', texto: 'Una foto cada 2–4 semanas enseña cambios que la báscula no ve.' })}`;

    // ---- eventos ----
    $$('[data-angulo]', el).forEach((b) => b.onclick = () => { angulo = b.dataset.angulo; anguloComparar = angulo; pintar(); });
    $$('[data-comp]', el).forEach((b) => b.onclick = () => { anguloComparar = b.dataset.comp; pintar(); });
    $('#s-antes', el)?.addEventListener('change', (e) => { antesId = e.target.value; pintar(); });
    $('#s-despues', el)?.addEventListener('change', (e) => { despuesId = e.target.value; pintar(); });

    $('#f-archivo', el).onchange = async (e) => {
      const file = e.target.files?.[0];
      e.target.value = '';
      if (!file) return;
      const b = $('#b-subir', el);
      b.classList.add('is-loading'); b.setAttribute('aria-busy', 'true');
      try {
        const fecha = $('#f-fecha', el).value && $('#f-fecha', el).value <= hoy ? $('#f-fecha', el).value : hoy;
        const f = await fotos.guardar({ fecha, angulo, file });
        anguloComparar = angulo; despuesId = f.id;
        toast(`Foto guardada (${Math.round(f.bytes / 1024)} KB)`);
        pintar();
      } catch (err) {
        toast(err.message, { error: true });
        b.classList.remove('is-loading'); b.removeAttribute('aria-busy');
      }
    };

    $$('[data-ver]', el).forEach((b) => b.onclick = () => verFoto(lista.find((f) => f.id === b.dataset.ver)));
  }

  function verFoto(f) {
    const d = document.createElement('dialog');
    d.className = 'visor';
    d.setAttribute('aria-label', 'Foto de progreso');
    const url = URL.createObjectURL(f.blob);
    d.innerHTML = `
      <img src="${url}" alt="Foto de ${esc(f.angulo)} del ${esc(fechaCorta(f.fecha, hoy))}">
      <div class="visor__barra">
        <span>${esc(fotos.ANGULOS.find(([id]) => id === f.angulo)?.[1] ?? '')} · ${esc(fechaCorta(f.fecha, hoy))}</span>
        <button class="btn btn--ghost" data-borrar style="color:var(--c-danger)">Borrar</button>
        <button class="btn btn--sec" data-cerrar>Cerrar</button>
      </div>`;
    document.body.append(d);
    const cerrar = () => { d.close(); d.remove(); URL.revokeObjectURL(url); };
    d.addEventListener('cancel', (e) => { e.preventDefault(); cerrar(); });
    d.addEventListener('click', async (e) => {
      if (e.target.closest('[data-cerrar]')) cerrar();
      else if (e.target.closest('[data-borrar]')) {
        cerrar();
        const ok = await hoja({ titulo: '¿Borrar esta foto?', opciones: [{ valor: 'si', texto: 'Borrar foto', estilo: 'danger' }] });
        if (!ok) return;
        await fotos.borrar(f.id);
        toast('Foto borrada', { deshacer: async () => { await fotos.restaurar(f); pintar(); } });
        pintar();
      }
    });
    d.showModal();
  }

  await pintar();
  return () => u.liberar();
}
