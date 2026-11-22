// Otras actividades (correr, pádel...): añadidas por el usuario. Cuentan para la racha.
import * as db from '../db.js';
import { diaLocal } from '../logica/fechas.js';
import { calcularRacha } from '../logica/racha.js';

export const DEPORTES = [
  { id: 'correr', nombre: 'Correr', km: true },
  { id: 'caminar', nombre: 'Caminar', km: true },
  { id: 'bici', nombre: 'Bici', km: true },
  { id: 'natacion', nombre: 'Natación', km: true },
  { id: 'padel', nombre: 'Pádel' },
  { id: 'tenis', nombre: 'Tenis' },
  { id: 'futbol', nombre: 'Fútbol' },
  { id: 'baloncesto', nombre: 'Baloncesto' },
  { id: 'escalada', nombre: 'Escalada' },
  { id: 'yoga', nombre: 'Yoga / estiramientos' },
  { id: 'senderismo', nombre: 'Senderismo', km: true },
  { id: 'boxeo', nombre: 'Boxeo / artes marciales' },
  { id: 'otro', nombre: 'Otro' },
];
export const deporte = (id) => DEPORTES.find((d) => d.id === id) ?? DEPORTES.at(-1);
export const nombreActividad = (a) => (a.deporte === 'otro' && a.nombre) ? a.nombre : deporte(a.deporte).nombre;

export const guardar = (a) => db.guardar('actividades', a);
export const borrar = (id) => db.borrar('actividades', id);
export async function listar() {
  return (await db.todos('actividades')).sort((a, b) => b.fecha.localeCompare(a.fecha) || b.creado.localeCompare(a.creado));
}

// Racha = días con un entreno terminado O una actividad.
export async function racha(hoy = diaLocal()) {
  const sesiones = await db.porIndice('sesiones', 'estado', 'terminada');
  const actividades = await db.todos('actividades');
  return calcularRacha([...sesiones.map((s) => s.fecha), ...actividades.map((a) => a.fecha)], hoy);
}
