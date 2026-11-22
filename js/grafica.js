// Gráfica de línea en SVG hecha a mano (sin librerías): solo tokens de color, con resumen en texto y tabla oculta.
import { esc } from './ui.js';

/**
 * @param {{x:string, y:number}[]} puntos   x = etiqueta (fecha corta), y = valor
 * @param {{titulo:string, unidad:string, formato?:(n:number)=>string}} op
 */
export function graficaLinea(puntos, { titulo, unidad, textoMax = 'mejor', formato = (n) => String(Math.round(n * 10) / 10).replace('.', ',') }) {
  const W = 320, H = 140, pad = { l: 36, r: 12, t: 12, b: 22 };
  const ys = puntos.map((p) => p.y);
  let min = Math.min(...ys), max = Math.max(...ys);
  if (min === max) { min -= 1; max += 1; }
  const margen = (max - min) * 0.1; min -= margen; max += margen;
  const x = (i) => pad.l + (puntos.length === 1 ? (W - pad.l - pad.r) / 2 : (i * (W - pad.l - pad.r)) / (puntos.length - 1));
  const y = (v) => pad.t + (1 - (v - min) / (max - min)) * (H - pad.t - pad.b);
  const d = puntos.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.y).toFixed(1)}`).join(' ');
  const mejor = puntos.reduce((a, p) => (p.y > a.y ? p : a), puntos[0]);
  const delta = puntos.at(-1).y - puntos[0].y;
  const resumen = `${titulo}: ahora ${formato(puntos.at(-1).y)} ${unidad}, ${textoMax} ${formato(mejor.y)} ${unidad} (${mejor.x}). ${delta >= 0 ? '+' : ''}${formato(delta)} ${unidad} desde el ${puntos[0].x}.`;

  return `
    <figure class="grafica">
      <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(resumen)}">
        <line x1="${pad.l}" x2="${W - pad.r}" y1="${y(max - margen)}" y2="${y(max - margen)}" class="grafica__rejilla"/>
        <line x1="${pad.l}" x2="${W - pad.r}" y1="${y(min + margen)}" y2="${y(min + margen)}" class="grafica__rejilla"/>
        <text x="${pad.l - 6}" y="${y(max - margen) + 4}" text-anchor="end" class="grafica__txt">${esc(formato(max - margen))}</text>
        <text x="${pad.l - 6}" y="${y(min + margen) + 4}" text-anchor="end" class="grafica__txt">${esc(formato(min + margen))}</text>
        <path d="${d}" class="grafica__linea"/>
        ${puntos.map((p, i) => `<circle cx="${x(i).toFixed(1)}" cy="${y(p.y).toFixed(1)}" r="3.5" class="grafica__punto"/>`).join('')}
        <text x="${pad.l}" y="${H - 4}" class="grafica__txt">${esc(puntos[0].x)}</text>
        <text x="${W - pad.r}" y="${H - 4}" text-anchor="end" class="grafica__txt">${esc(puntos.at(-1).x)}</text>
      </svg>
      <figcaption class="muted">${esc(resumen)}</figcaption>
      <table class="sr-only"><caption>${esc(titulo)}</caption><tr><th>Fecha</th><th>${esc(unidad)}</th></tr>
        ${puntos.map((p) => `<tr><td>${esc(p.x)}</td><td>${esc(formato(p.y))}</td></tr>`).join('')}</table>
    </figure>`;
}
