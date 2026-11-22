// S01 Bienvenida: primer arranque.
import * as db from '../db.js';
import { $, ico, cabecera, hoja, toast } from '../ui.js';
import * as perfil from '../datos/perfil.js';

export default function bienvenida(el) {
  cabecera({ titulo: 'Forja' });
  el.innerHTML = `
    <section class="bienvenida">
      <h2 class="bienvenida__titulo">Tu cuaderno de gimnasio, en el bolsillo</h2>
      <p class="muted">Contesta cinco preguntas y te preparamos una rutina, o móntala tú eligiendo entre más de 120 ejercicios. Después, la app te dice cuánto peso poner cada día.</p>
      <ul class="grupo">
        <li class="fila"><span class="fila__ico">${ico('lista')}</span><span style="flex:1">Rutina hecha a tu medida, y la puedes cambiar cuando quieras</span></li>
        <li class="fila"><span class="fila__ico">${ico('up')}</span><span style="flex:1">Sugerencia de peso y repeticiones en cada serie</span></li>
        <li class="fila"><span class="fila__ico">${ico('llama')}</span><span style="flex:1">Racha que también cuenta el pádel, correr o nadar</span></li>
        <li class="fila"><span class="fila__ico">${ico('yo')}</span><span style="flex:1">Sin cuentas ni internet: tus datos se quedan en tu iPhone</span></li>
      </ul>
    </section>
    <div class="pila">
      <a class="btn btn--lg btn--block" href="#/cuestionario/1">Empezar</a>
      <button class="btn btn--sec btn--block" id="b-yo">Prefiero montar mi rutina</button>
      <label class="btn btn--sec btn--block">Tengo una copia de seguridad<input type="file" accept="application/json,.json" id="b-imp" hidden></label>
      <button class="btn btn--ghost btn--block" id="b-saltar">Ahora no, ya la haré</button>
    </div>`;

  $('#b-saltar', el).onclick = async () => { await perfil.marcarOnboarding(); location.hash = '#/'; };
  $('#b-yo', el).onclick = async () => { await perfil.marcarOnboarding(); location.hash = '#/rutina/nueva'; };
  $('#b-imp', el).onchange = async (e) => {
    const f = e.target.files[0]; if (!f) return;
    const r = await hoja({ titulo: '¿Restaurar esta copia?', texto: 'Se cargarán las rutinas, entrenos y ajustes que contenga.', opciones: [{ valor: 'si', texto: 'Restaurar copia' }] });
    e.target.value = '';
    if (!r) return;
    try { await db.importar(f); await perfil.marcarOnboarding(); toast('Copia restaurada'); location.hash = '#/'; location.reload(); }
    catch (err) { toast(err.message, { error: true }); }
  };
}
