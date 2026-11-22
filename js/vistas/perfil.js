// S15 Perfil y ajustes (parcial): datos, copia de seguridad, borrar todo.
import * as db from '../db.js';
import { $, cabecera, hoja, toast, ico } from '../ui.js';
import { diaLocal, diffDias } from '../logica/fechas.js';

export default async function perfil(el) {
  cabecera({ titulo: 'Perfil' });
  const est = await navigator.storage?.estimate?.();
  const persistente = await navigator.storage?.persisted?.();
  const ultima = await db.ajuste('ultimaCopia');
  const hace = ultima ? diffDias(ultima.slice(0, 10), diaLocal()) : null;

  el.innerHTML = `
    <section>
      <h2 class="grupo-titulo">Entrenamiento</h2>
      <ul class="grupo">
        <li><a class="fila" href="#/rutinas"><span>Mis rutinas</span><span class="muted">${ico('chevron')}</span></a></li>
        <li><a class="fila" href="#/ejercicios"><span>Ejercicios</span><span class="muted">${ico('chevron')}</span></a></li>
        <li><a class="fila" href="#/medidas"><span>Peso y medidas</span><span class="muted">${ico('chevron')}</span></a></li>
        <li><a class="fila" href="#/fotos"><span>Fotos de progreso</span><span class="muted">${ico('chevron')}</span></a></li>
      </ul>
    </section>
    <section>
      <h2 class="grupo-titulo">Tus datos</h2>
      <ul class="grupo">
        <li class="fila"><span>Guardado protegido</span><span class="fila__valor">${persistente ? 'Sí' : 'No'}</span></li>
        <li class="fila"><span>Espacio usado</span><span class="fila__valor">${est ? (est.usage / 1048576).toFixed(1) + ' MB' : '—'}</span></li>
        <li class="fila"><span>Última copia</span><span class="fila__valor">${hace == null ? 'Nunca' : hace === 0 ? 'Hoy' : `Hace ${hace} días`}</span></li>
      </ul>
    </section>
    <section class="pila">
      <h2 class="grupo-titulo">Copia de seguridad</h2>
      <button class="btn btn--block" id="b-exp">Exportar copia completa</button>
      <button class="btn btn--sec btn--block" id="b-exp-ligera">Exportar sin fotos (más ligera)</button>
      <label class="btn btn--sec btn--block">Importar copia<input type="file" accept="application/json,.json" id="b-imp" hidden></label>
      <p class="muted" style="font:var(--t-sm);margin:0 var(--s-4)">Tus datos solo están en este iPhone. Si borras la app se pierden.
        Exporta una copia de vez en cuando y guárdala en Archivos o iCloud.</p>
    </section>
    <section>
      <h2 class="grupo-titulo">Zona peligrosa</h2>
      <ul class="grupo"><li><button class="fila fila--danger" id="b-borrar">Borrar todos los datos</button></li></ul>
    </section>`;

  $('#b-exp', el).onclick = async () => { await db.exportar(); perfil(el); };
  $('#b-exp-ligera', el).onclick = async () => { await db.exportar({ sinFotos: true }); perfil(el); };
  $('#b-imp', el).onchange = async (e) => {
    const f = e.target.files[0]; if (!f) return;
    const r = await hoja({ titulo: '¿Restaurar esta copia?', texto: 'Se sustituirán todos los datos actuales por los de la copia.', opciones: [{ valor: 'si', texto: 'Restaurar copia', estilo: 'danger' }] });
    e.target.value = '';
    if (!r) return;
    try { await db.importar(f); toast('Copia restaurada'); location.hash = '#/'; location.reload(); }
    catch (err) { toast(err.message, { error: true }); }
  };
  $('#b-borrar', el).onclick = async () => {
    const r = await hoja({ titulo: '¿Borrar todo?', texto: 'Se borrarán rutinas, entrenos, actividades y ajustes de este dispositivo. No se puede deshacer. Haz antes una copia si la quieres.', opciones: [{ valor: 'si', texto: 'Borrar todo para siempre', estilo: 'danger' }] });
    if (!r) return;
    await db.borrarTodo();
    location.hash = '#/'; location.reload();
  };
}
