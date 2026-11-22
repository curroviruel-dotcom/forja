// Página provisional para pantallas del recon que aún no están construidas.
import { esc, cabecera, vacio } from '../ui.js';

const PANTALLAS = {
  medidas: ['S17', 'Peso y medidas'],
};

export default function pendiente(el, ruta) {
  const clave = (ruta ?? location.hash.replace(/^#\/?/, '')).split('/')[0];
  const [id, titulo] = PANTALLAS[clave] ?? ['', 'Próximamente'];
  const esPestana = ['progreso', 'comida'].includes(clave);
  cabecera(esPestana ? { titulo } : { titulo, volver: history.length > 1 ? 'javascript:history.back()' : '#/' });
  el.innerHTML = vacio({ icono: 'obras', titulo: 'En construcción', texto: `${titulo} (${esc(id)}) llegará en el siguiente hito.`, boton: '<a class="btn btn--sec" href="#/">Ir a Hoy</a>' });
}
