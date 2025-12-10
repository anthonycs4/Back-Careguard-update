// src/sesiones/types.ts
export type Sesion = {
  id: string;
  asignacion_id: string;
  solicitud_id: string;
  cuidador_id: string;
  estado: 'PROGRAMADA' | 'ACTIVA' | 'COMPLETADA' | 'CANCELADA';
  check_in_at: string | null;
  check_out_at: string | null;
  owner_check_in_at: string | null;
  owner_check_out_at: string | null;
  notas_cuidador: string | null;
  resumen: string | null;
  duracion_min: number | null;
  costo_total: string | null;
  creado_en: string;
  actualizado_en: string;
};
