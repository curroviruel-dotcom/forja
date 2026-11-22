// S20 Comida del día: objetivos, totales y comidas por momento. Añadido por el usuario.
import { $, esc, ico, cabecera, hoja, toast, pedirNumero } from '../ui.js';
import * as comida from '../datos/comida.js';
import { sumar, MOMENTOS } from '../logica/nutricion.js';
import { diaLocal, sumarDias, fechaCorta } from '../logica/fechas.js';

const fmt = (n) => String(Math.round(n * 10) / 10).replace('.', ',');
const cantidadTxt = (c) => (c.cantidad == null ? '' : c.base === 'racion' ? `${fmt(c.cantidad)} ${c.cantidad === 1 ? 'ración' : 'raciones'}` : `${fmt(c.cantidad)} g`);

function barraMacro(nombre, valor, objetivo, unidad = 'g') {
  const pct = objetivo ? Math.min(100, (valor / objetivo) * 100) : 0;
  const pasado = objetivo && valor > objetivo * 1.05;
  return `
    <div class="macro ${pasado ? 'macro--pasado' : ''}">
      <div class="fila-flex entre"><span>${nombre}</span><span class="tab-num">${fmt(valor)}${objetivo ? ` / ${fmt(objetivo)}` : ''} ${unidad}</span></div>
      <div class="progreso" role="progressbar" aria-label="${nombre}" aria-valuemin="0" aria-valuemax="${objetivo || 0}" aria-valuenow="${Math.round(valor)}"><i style="width:${pct}%"></i></div>
    </div>`;
}

export default async function vistaComida(el, fechaParam) {
  const hoy = diaLocal();
  const fecha = fechaParam && fechaParam <= hoy ? fechaParam : hoy;
  const [obj, lista, media] = await Promise.all([comida.objetivos(), comida.delDia(fecha), comida.mediaSemana(hoy)]);
  const total = sumar(lista);
  cabecera({ titulo: 'Comida', extra: '<a class="btn btn--ghost" href="#/comida-objetivos">Objetivos</a>' });

  const queda = obj ? obj.kcal - total.kcal : null;
  el.innerHTML = `
    <nav class="fila-flex entre navegar-dia" aria-label="Cambiar de día">
      <a class="btn btn--icon" href="#/comida/${sumarDias(fecha, -1)}" aria-label="Día anterior">${ico('back')}</a>
      <h2 class="titulo-seccion" style="margin:0">${esc(fechaCorta(fecha, hoy))}</h2>
      ${fecha < hoy ? `<a class="btn btn--icon" href="#/comida/${sumarDias(fecha, 1)}" aria-label="Día siguiente">${ico('chevron')}</a>` : '<span class="hueco"></span>'}
    </nav>

    ${obj ? `
    <article class="card" aria-label="Resumen del día">
      <div class="kcal">
        <b class="tab-num">${total.kcal.toLocaleString('es')}</b><span class="muted"> / ${obj.kcal.toLocaleString('es')} kcal</span>
        <p class="card__meta" style="margin:var(--s-1) 0 var(--s-3)">${queda >= 0 ? `Te quedan ${queda.toLocaleString('es')} kcal` : `Te has pasado ${(-queda).toLocaleString('es')} kcal`}</p>
      </div>
      <div class="progreso progreso--grande" role="progressbar" aria-label="Calorías" aria-valuemin="0" aria-valuemax="${obj.kcal}" aria-valuenow="${total.kcal}"><i style="width:${Math.min(100, (total.kcal / obj.kcal) * 100)}%"></i></div>
      <div class="pila" style="margin-top:var(--s-4)">
        ${barraMacro('Proteína', total.prot, obj.prot)}
        ${barraMacro('Carbohidratos', total.carb, obj.carb)}
        ${barraMacro('Grasa', total.grasa, obj.grasa)}
      </div>
    </article>` : `
    <article class="card">
      <h2 class="card__titulo">Pon tus objetivos</h2>
      <p class="card__meta">Los calculamos con tu peso, altura, edad y entreno, o los escribes tú.</p>
      <a class="btn btn--block" href="#/comida-objetivos">Calcular objetivos</a>
      <p class="card__meta" style="margin:var(--s-3) 0 0">Hoy llevas ${total.kcal.toLocaleString('es')} kcal · ${fmt(total.prot)} g de proteína.</p>
    </article>`}

    ${MOMENTOS.map(([id, nombre]) => {
      const items = lista.filter((c) => c.momento === id);
      const sub = sumar(items);
      return `
      <section aria-labelledby="m-${id}">
        <h2 class="grupo-titulo fila-flex entre" id="m-${id}"><span>${nombre}</span>
          <span class="tab-num">${items.length ? `${sub.kcal} kcal` : ''}</span></h2>
        <ul class="grupo">
          ${items.map((c) => `
            <li><button class="fila" data-comida="${c.id}">
              <span style="flex:1;min-width:0"><b style="font-weight:600">${esc(c.nombre)}</b><br>
              <span class="muted" style="font:var(--t-sm)">${esc(cantidadTxt(c))}${c.cantidad != null ? ' · ' : ''}P ${fmt(c.prot)} · C ${fmt(c.carb)} · G ${fmt(c.grasa)}</span></span>
              <span class="fila__valor tab-num">${c.kcal} kcal</span></button></li>`).join('')}
          <li><a class="fila" href="#/comida-anadir/${id}/${fecha}" style="color:var(--c-accent)"><span class="fila-flex">${ico('plus')}Añadir</span></a></li>
        </ul>
      </section>`;
    }).join('')}

    ${media ? `<p class="muted" style="font:var(--t-sm);margin:0 var(--s-4)">Media de los últimos 7 días (${media.dias} ${media.dias === 1 ? 'día apuntado' : 'días apuntados'}): ${media.kcal.toLocaleString('es')} kcal y ${media.prot} g de proteína.</p>` : ''}`;

  el.querySelectorAll('[data-comida]').forEach((b) => b.onclick = async () => {
    const c = lista.find((x) => x.id === b.dataset.comida);
    const op = await hoja({
      titulo: c.nombre, texto: `${cantidadTxt(c)} · ${c.kcal} kcal`,
      opciones: [{ valor: 'cantidad', texto: 'Cambiar cantidad', estilo: 'sec', deshabilitado: c.cantidad == null }, { valor: 'borrar', texto: 'Quitar', estilo: 'danger' }],
    });
    if (op === 'cantidad') {
      const v = await pedirNumero({ titulo: c.nombre, etiqueta: c.base === 'racion' ? 'Raciones' : 'Gramos', valor: c.cantidad, min: 0.1, max: c.base === 'racion' ? 50 : 5000 });
      if (v == null) return;
      await comida.cambiarCantidad(c, v);
    } else if (op === 'borrar') {
      await comida.borrar(c.id);
      toast(`${c.nombre} quitado`, { deshacer: async () => { await comida.restaurar(c); vistaComida(el, fechaParam); } });
    } else return;
    vistaComida(el, fechaParam);
  });
}
