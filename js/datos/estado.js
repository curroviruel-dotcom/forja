// Estado en memoria entre pantallas (los módulos ES se cargan una vez, así que sobrevive a cambiar de ruta).
// - eleccion: qué hacer cuando el usuario elige ejercicios en la biblioteca (S07 en modo selección).
//   {modo: 'rutina', diaId, volver} | {modo: 'reemplazar', sesionId, seId, volver} | {modo: 'entreno', sesionId, volver}
// - borrador: la rutina que se está editando en S06 (sin guardar todavía).
// - propuesta: la rutina generada por el cuestionario (S03) antes de aceptarla.
export const estado = { eleccion: null, borrador: null, propuesta: null, perfilBorrador: null };
