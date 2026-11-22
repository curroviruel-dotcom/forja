// S11 Historial: entrenos terminados y otras actividades, por fecha.
import { esc, ico, cabecera, hoja, toast, vacio } from '../ui.js';
import { sesionesTerminadas } from '../datos/historial.js';
import * as act from '../datos/actividades.js';
import { fechaCorta, duracion } from '../logica/fechas.js';

export default async function historial(el) {
  cabecera({ titulo: 'Historial' });
  const [sesiones, actividades] = await Promise.all([sesionesTerminadas(), act.listar()]);
  const items = [
    ...sesiones.map((s) => ({ tipo: 's', fecha: s.fecha, orden: s.fin ?? '', s })),
    ...actividades.map((a) => ({ tipo: 'a', fecha: a.fecha, orden: a.creado, a })),
  ].sort((x, y) => y.fecha.localeCompare(x.fecha) || y.orden.localeCompare(x.orden));

  if (!items.length) {
    el.innerHTML = vacio({ icono: 'reloj', titulo: 'Tus entrenos aparecerán aquí', texto: 'Termina tu primer entreno o registra una actividad.', boton: '<a class="btn" href="#/">Ir a Hoy</a>' });
    return;
  }

  const grupos = new Map();
  for (const it of items) { if (!grupos.has(it.fecha)) grupos.set(it.fecha, []); grupos.get(it.fecha).push(it); }

  el.innerHTML = [...grupos].map(([fecha, lista]) => `
    <section>
      <h2 class="grupo-titulo">${esc(fechaCorta(fecha))}</h2>
      <ul class="grupo">${lista.map((it) => it.tipo === 's' ? `
        <li><a class="fila" href="#/sesion/${it.s.id}">
          <span>${ico('pesa')}</span>
          <span style="flex:1"><b style="font-weight:600">${esc(it.s.nombre)}</b><br>
          <span class="muted" style="font:var(--t-sm)">${esc(duracion(it.s.resumen?.duracionS ?? 0))} · ${it.s.resumen?.series ?? 0} series · ${(it.s.resumen?.volumenKg ?? 0).toLocaleString('es')} kg</span></span>
          ${it.s.resumen?.records?.length ? `<span class="record">${ico('trofeo')}${it.s.resumen.records.length}</span>` : ''}
        </a></li>` : `
        <li><button class="fila" data-act="${it.a.id}">
          <span>${ico('run')}</span>
          <span style="flex:1"><b style="font-weight:600">${esc(act.nombreActividad(it.a))}</b><br>
          <span class="muted" style="font:var(--t-sm)">${it.a.minutos} min${it.a.km ? ` · ${String(it.a.km).replace('.', ',')} km` : ''}${it.a.notas ? ` · ${esc(it.a.notas)}` : ''}</span></span>
        </button></li>`).join('')}
      </ul>
    </section>`).join('');

  el.querySelectorAll('[data-act]').forEach((b) => b.onclick = async () => {
    const a = actividades.find((x) => x.id === b.dataset.act);
    const r = await hoja({ titulo: act.nombreActividad(a), texto: `${fechaCorta(a.fecha)} · ${a.minutos} min`, opciones: [{ valor: 'borrar', texto: 'Borrar actividad', estilo: 'danger' }] });
    if (r !== 'borrar') return;
    await act.borrar(a.id);
    toast('Actividad borrada', { deshacer: async () => { await act.guardar(a); historial(el); } });
    historial(el);
  });
}
