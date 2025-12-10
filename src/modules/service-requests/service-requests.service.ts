import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../../database/constants';

import { CreateSolicitudBaseDto } from './dto/create-base.dto';
import {
  CreateGrandparentsPayloadDto,
} from './dto/create-grandparents.dto';
import {
  CreateChildrenPayloadDto,
} from './dto/create-children.dto';

// Ajusta el nombre según tu archivo real (si aún se llama create-mascotas.dto)
import {
  CreatePetsPayloadDto,
} from './dto/create-pets.dto';

import { GetAbiertasQueryDto } from './dto/get-my-requests.dto';
import { GetMiasQueryDto } from './dto/get-my-requests.dto';

@Injectable()
export class ServiceRequestsService {
  constructor(
    @Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient,
  ) {}

  // Helper genérico para inserts con .single()
  private async insertOne<T = any>(table: string, data: any): Promise<T> {
    const { data: res, error } = await this.supabase
      .from(table)
      .insert(data)
      .select()
      .single();
    if (error) throw new BadRequestException(error.message);
    return res as T;
  }

  // ======================================================
  //                  CREATE: GRANDPARENTS
  // ======================================================
  async createGrandparents(
    userId: string,
    body: {
      base: CreateSolicitudBaseDto;
      payload: CreateGrandparentsPayloadDto;
    },
  ) {
    const { base, payload } = body;

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

  // ======================================================
  //                     CREATE: CHILDREN
  // ======================================================
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

  // ======================================================
  //                      CREATE: PETS
  //          (migrado de tu createMascotas del controller)
  // ======================================================
  async createPets(
    userId: string,
    body: { base: CreateSolicitudBaseDto; payload: CreatePetsPayloadDto },
  ) {
    const { base, payload } = body;

    if (!payload?.animales?.length || payload.animales.length > 3) {
      throw new BadRequestException('Debes registrar entre 1 y 3 mascotas');
    }

    if (base.precio_sugerido !== undefined && base.precio_sugerido < 0) {
      throw new BadRequestException('precio_sugerido debe ser >= 0');
    }

    // 1) Base
    const solicitud = await this.insertOne('solicitudes', {
      usuario_id: userId,
      tipo: 'MASCOTAS',
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
    await this.insertOne('solicitud_mascotas_detalle', {
      solicitud_id: solicitud.id,
      servicio: payload.servicio,
      modalidad: payload.modalidad,
    });

    // 4) Contacto
    await this.insertOne('solicitud_contacto_cercano', {
      solicitud_id: solicitud.id,
      nombre: payload.contacto.nombre,
      relacion: payload.contacto.relacion,
      telefono_e164: payload.contacto.telefono_e164,
    });

    // 5) Animales
    for (const a of payload.animales) {
      const { error } = await this.supabase
        .from('solicitud_mascotas_animales')
        .insert({
          solicitud_id: solicitud.id,
          nombre: a.nombre,
          especie: a.especie,
          raza: a.raza ?? null,
          tamanio: a.tamanio,
          personalidad: a.personalidad,
          foto_url: a.foto_url ?? null,
          problemas_salud: a.problemas_salud,
          descripcion_salud: a.descripcion_salud ?? null,
          alimentos_preferidos: a.alimentos_preferidos ?? null,
          clinica_veterinaria: a.clinica_veterinaria ?? null,
        });
      if (error) throw new BadRequestException(error.message);
    }

    return { message: 'Solicitud (Mascotas) creada', solicitud_id: solicitud.id };
  }

  // ======================================================
  //                  LISTAR MIS SOLICITUDES (simple)
  //          Equivale a tu @Get() antiguo (sin paginación extra)
  // ======================================================
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

  // ======================================================
  //       LISTAR ABIERTAS PARA CUIDADOR (antes "abiertas")
  // ======================================================
  async listOpenForCaregiver(userId: string, q: GetAbiertasQueryDto) {
    // 1) Tipos del cuidador
    const { data: caretakers, error: cuErr } = await this.supabase
      .from('cuidadores')
      .select('tipos_servicio')
      .eq('usuario_id', userId)
      .maybeSingle();
    if (cuErr) throw new BadRequestException(cuErr.message);
    if (!caretakers) {
      throw new BadRequestException('Aún no tienes perfil de cuidador');
    }
    const tipos: string[] = Array.isArray(caretakers.tipos_servicio)
      ? caretakers.tipos_servicio
      : [];
    if (tipos.length !== 2) {
      throw new BadRequestException('Perfil de cuidador inválido (tipos_servicio)');
    }

    // 2) IDs de solicitudes ya postuladas
    const { data: postulaciones, error: posErr } = await this.supabase
      .from('postulaciones')
      .select('solicitud_id')
      .eq('cuidador_id', userId);
    if (posErr) throw new BadRequestException(posErr.message);
    const excluidas = (postulaciones ?? []).map((r) => r.solicitud_id);

    // 3) Query principal
    const page = q.page ?? 1;
    const limit = q.limit ?? 10;
    const offset = (page - 1) * limit;
    const to = offset + limit - 1;

    let query = this.supabase
      .from('solicitudes')
      .select(
        `
        id,
        tipo,
        titulo,
        precio_sugerido,
        descripcion,
        creado_en,
        solicitud_fechas (fecha, hora_inicio, hora_fin)
      `,
      )
      .eq('estado', 'ABIERTA')
      .in('tipo', tipos)
      .neq('usuario_id', userId)
      .order('creado_en', { ascending: false })
      .range(offset, to);

    if (excluidas.length > 0) {
      query = query.not('id', 'in', `(${excluidas.join(',')})`);
    }

    if (q.fecha) {
      // Filtro por fecha en la relación; ajusta si tu RLS o Supabase no lo acepta así.
      query = query.eq('solicitud_fechas.fecha', q.fecha as any);
    }

    const { data, error } = await query;
    if (error) throw new BadRequestException(error.message);

    const items = (data ?? []).map((r: any) => ({
      id: r.id,
      tipo: r.tipo,
      titulo: r.titulo,
      precio_sugerido: r.precio_sugerido ?? null,
      descripcion: r.descripcion,
      creado_en: r.creado_en,
      fechas: Array.isArray(r.solicitud_fechas) ? r.solicitud_fechas : [],
    }));

    return { page, limit, count: items.length, items };
  }

  // ======================================================
  //     MIS SOLICITUDES PAGINADAS + ESTADO (antes "mias")
  // ======================================================
  async listMinePaged(userId: string, q: GetMiasQueryDto) {
    const page = q.page ?? 1;
    const limit = q.limit ?? 10;
    const offset = (page - 1) * limit;
    const to = offset + limit - 1;

    let query = this.supabase
      .from('solicitudes')
      .select(
        `
        id,
        tipo,
        titulo,
        descripcion,
        estado,
        precio_sugerido,
        creado_en,
        solicitud_fechas (fecha, hora_inicio, hora_fin),
        postulaciones:postulaciones ( count )
      `,
      )
      .eq('usuario_id', userId)
      .order('creado_en', { ascending: false })
      .range(offset, to);

    if (q.estado) {
      query = query.eq('estado', q.estado);
    }

    const { data, error } = await query;
    if (error) throw new BadRequestException(error.message);

    const rows = data ?? [];
    const items = rows.map((s: any) => ({
      id: s.id,
      tipo: s.tipo,
      titulo: s.titulo,
      descripcion: s.descripcion,
      estado: s.estado,
      precio_sugerido: s.precio_sugerido ?? null,
      creado_en: s.creado_en,
      fechas: s.solicitud_fechas ?? [],
      postulaciones_count:
        Array.isArray(s.postulaciones) && s.postulaciones[0]?.count != null
          ? Number(s.postulaciones[0].count)
          : 0,
    }));

    return { page, limit, count: items.length, items };
  }

  // ======================================================
  //       MIS SOLICITUDES AGRUPADAS POR ESTADO
  //        (antes "mias/por-estado")
  // ======================================================
  async listMineGroupedByStatus(userId: string) {
    const { data, error } = await this.supabase
      .from('solicitudes')
      .select(
        `
        id,
        tipo,
        titulo,
        descripcion,
        estado,
        precio_sugerido,
        creado_en,
        solicitud_fechas (fecha, hora_inicio, hora_fin),
        postulaciones:postulaciones ( count )
      `,
      )
      .eq('usuario_id', userId)
      .order('creado_en', { ascending: false });
    if (error) throw new BadRequestException(error.message);

    const grupos: Record<string, any[]> = {
      ABIERTA: [],
      EN_REVISION: [],
      ASIGNADA: [],
      ACTIVA: [],
      COMPLETADA: [],
      CANCELADA: [],
    };

    for (const s of data ?? []) {
      const item = {
        id: s.id,
        tipo: s.tipo,
        titulo: s.titulo,
        descripcion: s.descripcion,
        estado: s.estado,
        precio_sugerido: s.precio_sugerido ?? null,
        creado_en: s.creado_en,
        fechas: s.solicitud_fechas ?? [],
        postulaciones_count:
          Array.isArray(s.postulaciones) && s.postulaciones[0]?.count != null
            ? Number(s.postulaciones[0].count)
            : 0,
      };
      if (grupos[s.estado]) {
        grupos[s.estado].push(item);
      }
    }

    return grupos;
  }

  // ======================================================
  //         GET ONE BY ID (antes getOne del controller)
  // ======================================================
  async getById(id: string) {
    const { data, error } = await this.supabase
      .from('solicitudes')
      .select(
        `
        *,
        solicitud_fechas (*),
        solicitud_contacto_cercano (*),
        solicitud_abuelos_detalle (*),
        solicitud_abuelos_personas (*, solicitud_abuelos_medicamentos (*)),
        solicitud_ninios_detalle (*),
        solicitud_ninios_personas (*, solicitud_ninios_medicamentos (*)),
        solicitud_mascotas_detalle (*),
        solicitud_mascotas_animales (*),
        solicitud_imagenes (*)
      `,
      )
      .eq('id', id)
      .single();
    if (error) throw new BadRequestException(error.message);
    if (!data) throw new BadRequestException('No encontrada');

    const sol: any = { ...data };

    // Limpieza por tipo (igual que tu switch original)
    switch (sol.tipo) {
      case 'ABUELOS':
        delete sol.solicitud_ninios_detalle;
        delete sol.solicitud_ninios_personas;
        delete sol.solicitud_ninios_medicamentos;
        delete sol.solicitud_mascotas_detalle;
        delete sol.solicitud_mascotas_animales;
        break;
      case 'NINIOS':
        delete sol.solicitud_abuelos_detalle;
        delete sol.solicitud_abuelos_personas;
        delete sol.solicitud_abuelos_medicamentos;
        delete sol.solicitud_mascotas_detalle;
        delete sol.solicitud_mascotas_animales;
        break;
      case 'MASCOTAS':
        delete sol.solicitud_abuelos_detalle;
        delete sol.solicitud_abuelos_personas;
        delete sol.solicitud_abuelos_medicamentos;
        delete sol.solicitud_ninios_detalle;
        delete sol.solicitud_ninios_personas;
        delete sol.solicitud_ninios_medicamentos;
        break;
    }

    return sol;
  }

  // ======================================================
  //              CANCEL (soft delete) por ID
  // ======================================================
  async cancel(id: string) {
    const { data, error } = await this.supabase
      .from('solicitudes')
      .update({ estado: 'CANCELADA' })
      .eq('id', id)
      .select()
      .maybeSingle();
    if (error) throw new BadRequestException(error.message);

    return { ok: true, solicitud: data ?? null };
  }
}
