import { Inject, Injectable, BadRequestException } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../../database/constants';
import { CreatePostulacionDto } from './dto/create-postulacion.dto';
import { AceptarPostulacionDto } from './dto/aceptar.dto';

@Injectable()
export class ApplicationsService {
  constructor(
    @Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient,
  ) {}

  // CREATE application
  async crear(userId: string, dto: CreatePostulacionDto) {
    if (!dto.solicitud_id) {
      throw new BadRequestException('solicitud_id es requerido');
    }

    const { data, error } = await this.supabase
      .from('postulaciones')
      .insert({
        solicitud_id: dto.solicitud_id,
        cuidador_id: userId,
        mensaje: dto.mensaje ?? null,
        tarifa_propuesta: dto.tarifa_propuesta ?? null,
        estado: 'POSTULADO',
      })
      .select()
      .single();

    if (error) {
      if (
        error.message.includes('duplicate key') ||
        error.message.includes('postulaciones_unicas_activas')
      ) {
        throw new BadRequestException(
          'Ya te postulaste a esta solicitud (o está seleccionada).',
        );
      }
      throw new BadRequestException(error.message);
    }

    return { message: 'Postulación creada', postulacion: data };
  }

  // GET applications of a request
  async getBySolicitud(userId: string, solicitudId: string) {
    // 1. Verificar que la solicitud pertenece al usuario autenticado
   const { data: solicitud, error: solError } = await this.supabase
  .from('solicitudes')
  .select('id, usuario_id')
  .eq('id', solicitudId)
  .single();

console.log('DEBUG solicitudId:', solicitudId);
console.log('DEBUG solError:', solError);
console.log('DEBUG solicitud:', solicitud);

if (solError) {
  // mientras debuggeas, devuelve el error real
  throw new BadRequestException(`Supabase error: ${solError.message}`);
}

if (!solicitud) {
  throw new BadRequestException(
    'Solicitud no encontrada (0 filas: ID inexistente o en otra BD)',
  );
}

    if (solicitud.usuario_id !== userId) {
      throw new BadRequestException(
        'No puedes ver postulaciones de otra solicitud',
      );
    }

    // 2. Obtener postulaciones ya estructuradas
    const { data, error } = await this.supabase
      .from('postulaciones')
      .select(
        `
        id,
        mensaje,
        tarifa_propuesta,
        precio_solicitante,
        estado,
        creado_en,
        cuidador:cuidadores!postulaciones_cuidador_id_fkey(
          usuario_id,
          bio,
          anios_experiencia,
          rating_promedio,
          tipos_servicio,
          usuario:usuarios!cuidadores_usuario_id_fkey(
            nombre_completo,
            correo,
            foto_url
          )
        )
      `,
      )
      .eq('solicitud_id', solicitudId)
      .order('creado_en', { ascending: false });

    if (error) {
      throw new BadRequestException(error.message);
    }

    const mapped = data.map((p: any) => ({
      id: p.id,
      mensaje: p.mensaje,
      tarifa_propuesta: p.tarifa_propuesta,
      precio_solicitante: p.precio_solicitante,
      estado: p.estado,
      creado_en: p.creado_en,
      cuidador: {
        bio: p.cuidador?.bio,
        rating_promedio: p.cuidador?.rating_promedio,
        tipos_servicio: p.cuidador?.tipos_servicio,
        usuario: p.cuidador?.usuario ?? null,
      },
    }));

    return {
      solicitud_id: solicitudId,
      total: mapped.length,
      postulaciones: mapped,
    };
  }

  // ACCEPT application (match)
  async aceptar(
    actorId: string,
    postulacionId: string,
    dto: AceptarPostulacionDto,
  ) {
    if (dto.tarifa_acordada == null) {
      throw new BadRequestException('tarifa_acordada es requerida');
    }

    const { data, error } = await this.supabase.rpc(
      'rpc_seleccionar_postulacion',
      {
        p_postulacion_id: postulacionId,
        p_actor_id: actorId,
        p_tarifa_acordada: dto.tarifa_acordada,
      },
    );

    if (error) {
      throw new BadRequestException(error.message);
    }

    return {
      message: 'Postulación aceptada',
      result: data,
    };
  }
}
