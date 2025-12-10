import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../../database/constants';
import { CreateSolicitudBaseDto } from './dto/create-base.dto';
import {
  CreateGrandparentsPayloadDto,
  GrandparentPersonDto,
} from './dto/create-grandparents.dto';
import {
  CreateChildrenPayloadDto,
  ChildPersonDto,
} from './dto/create-children.dto';

@Injectable()
export class ServiceRequestsService {
  constructor(
    @Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient,
  ) {}

  // Helper for inserts
  private async insertOne<T = any>(table: string, data: any): Promise<T> {
    const { data: res, error } = await this.supabase
      .from(table)
      .insert(data)
      .select()
      .single();
    if (error) throw new BadRequestException(error.message);
    return res as T;
  }

  // --- GRANDPARENTS ---
  async createGrandparents(
    userId: string,
    body: {
      base: CreateSolicitudBaseDto;
      payload: CreateGrandparentsPayloadDto;
    },
  ) {
    const { base, payload } = body;

    // Validation
    if (!payload?.personas?.length || payload.personas.length > 3) {
      throw new BadRequestException(
        'Debes registrar entre 1 y 3 personas a cuidar',
      );
    }
    if (base.precio_sugerido !== undefined && base.precio_sugerido < 0) {
      throw new BadRequestException('precio_sugerido debe ser >= 0');
    }

    // 1) Base
    const solicitud = await this.insertOne('solicitudes', {
      usuario_id: userId,
      tipo: 'ABUELOS',
      titulo: base.titulo,
      descripcion: base.descripcion,
      direccion_linea: base.ubicacion.direccion_linea,
      lat: base.ubicacion.lat,
      lng: base.ubicacion.lng,
      estado: 'ABIERTA',
      precio_sugerido: base.precio_sugerido ?? null,
    });

    // 2) Fechas
    if (base.fechas?.length) {
      const fechasPayload = base.fechas.map((f) => ({
        solicitud_id: solicitud.id,
        fecha: f.fecha,
        hora_inicio: f.hora_inicio,
        hora_fin: f.hora_fin,
      }));
      const { error } = await this.supabase
        .from('solicitud_fechas')
        .insert(fechasPayload);
      if (error) throw new BadRequestException(error.message);
    }

    // 3) Detalle
    await this.insertOne('solicitud_abuelos_detalle', {
      solicitud_id: solicitud.id,
      servicio: payload.servicio,
    });

    // 4) Contacto
    await this.insertOne('solicitud_contacto_cercano', {
      solicitud_id: solicitud.id,
      nombre: payload.contacto_cercano.nombre,
      relacion: payload.contacto_cercano.relacion,
      telefono_e164: payload.contacto_cercano.telefono_e164,
    });

    // 5) Personas & Meds
    for (const p of payload.personas) {
      const persona = await this.insertOne<{ id: string }>(
        'solicitud_abuelos_personas',
        {
          solicitud_id: solicitud.id,
          nombre_completo: p.nombre_completo,
          fecha_nacimiento: p.fecha_nacimiento,
          genero: p.genero,
          fumador: p.fumador,
          limitacion_movimiento: p.limitacion_movimiento,
          tipo_limitacion: p.tipo_limitacion ?? null,
          alimentos_restringidos: (p.alimentos_restringidos ?? []).slice(0, 3),
        },
      );

      if (p.medicamentos?.length) {
        const medsPayload = p.medicamentos.map((m) => ({
          persona_id: persona.id,
          nombre: m.nombre,
          frecuencia: m.frecuencia,
          dosis: m.dosis,
        }));
        const { error } = await this.supabase
          .from('solicitud_abuelos_medicamentos')
          .insert(medsPayload);
        if (error) throw new BadRequestException(error.message);
      }
    }

    return { message: 'Solicitud creada', solicitud_id: solicitud.id };
  }

  // --- CHILDREN ---
  async createChildren(
    userId: string,
    body: { base: CreateSolicitudBaseDto; payload: CreateChildrenPayloadDto },
  ) {
    const { base, payload } = body;

    if (!payload?.personas?.length || payload.personas.length > 3) {
      throw new BadRequestException('Debes registrar entre 1 y 3 niños');
    }

    if (base.precio_sugerido !== undefined && base.precio_sugerido < 0) {
      throw new BadRequestException('precio_sugerido debe ser >= 0');
    }

    // 1) Base
    const solicitud = await this.insertOne('solicitudes', {
      usuario_id: userId,
      tipo: 'NINIOS',
      titulo: base.titulo,
      descripcion: base.descripcion,
      direccion_linea: base.ubicacion.direccion_linea,
      lat: base.ubicacion.lat,
      lng: base.ubicacion.lng,
      estado: 'ABIERTA',
      precio_sugerido: base.precio_sugerido ?? null,
    });

    // 2) Fechas
    if (base.fechas?.length) {
      const fechasPayload = base.fechas.map((f) => ({
        solicitud_id: solicitud.id,
        fecha: f.fecha,
        hora_inicio: f.hora_inicio,
        hora_fin: f.hora_fin,
      }));
      const { error } = await this.supabase
        .from('solicitud_fechas')
        .insert(fechasPayload);
      if (error) throw new BadRequestException(error.message);
    }

    // 3) Detalle
    await this.insertOne('solicitud_ninios_detalle', {
      solicitud_id: solicitud.id,
      servicio: payload.servicio,
    });

    // 4) Contacto Tutor
    await this.insertOne('solicitud_contacto_cercano', {
      // Reusing same table as Abuelos? Original code used `solicitud_contacto_cercano` for both.
      solicitud_id: solicitud.id,
      nombre: payload.contacto_tutor.nombre,
      relacion: payload.contacto_tutor.relacion,
      telefono_e164: payload.contacto_tutor.telefono_e164,
    });

    // 5) Personas & Meds
    for (const p of payload.personas) {
      const persona = await this.insertOne<{ id: string }>(
        'solicitud_ninios_personas',
        {
          solicitud_id: solicitud.id,
          nombre_completo: p.nombre_completo,
          fecha_nacimiento: p.fecha_nacimiento,
          genero: p.genero,

          camina_solo: p.camina_solo,
          dificultad_movimiento: p.dificultad_movimiento,
          tipo_limitacion: p.tipo_limitacion ?? null,

          condicion_medica: p.condicion_medica,
          tipo_condicion: p.tipo_condicion ?? null,

          alergias: p.alergias,
          detalle_alergias: p.detalle_alergias ?? null,

          alimentacion: p.alimentacion,
          dieta_especial: p.dieta_especial,
          tipo_dieta_especial: p.tipo_dieta_especial ?? null,

          problemas_suenio: p.problemas_suenio,
          objeto_apego: p.objeto_apego,

          panales: p.panales,
        },
      );

      if (p.medicamentos?.length) {
        const medsPayload = p.medicamentos.map((m) => ({
          persona_id: persona.id,
          nombre: m.nombre,
          frecuencia: m.frecuencia,
          dosis: m.dosis,
        }));
        const { error } = await this.supabase
          .from('solicitud_ninios_medicamentos')
          .insert(medsPayload);
        if (error) throw new BadRequestException(error.message);
      }
    }

    return { message: 'Solicitud (Niños) creada', solicitud_id: solicitud.id };
  }

  async listMine(userId: string, type?: string) {
    let query = this.supabase
      .from('solicitudes')
      .select('*, solicitud_fechas(*)')
      .eq('usuario_id', userId)
      .order('creado_en', { ascending: false });

    if (type) {
      query = query.eq('tipo', type);
    }

    const { data, error } = await query;
    if (error) throw new BadRequestException(error.message);
    return data;
  }
}
