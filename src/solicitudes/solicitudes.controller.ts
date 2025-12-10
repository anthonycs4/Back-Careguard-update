import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseAuthGuard } from '../common/supabase-auth.guard';
import { CreateSolicitudBaseDto } from './dto/create-base.dto';
import { CreateAbuelosPayloadDto } from './dto/create-abuelos.dto';
import { CreateNiniosPayloadDto } from './dto/create-ninios.dto';
import { CreateMascotasPayloadDto } from './dto/create-mascotas.dto';
import { GetAbiertasQueryDto } from './dto/get-abiertas.query.dto';
import { GetMiasQueryDto } from './dto/get-mias.query.dto';
@Controller('solicitudes')
@UseGuards(SupabaseAuthGuard)
export class SolicitudesController {
  private baseUrl: string;
  private serviceKey: string;

  constructor(private cfg: ConfigService) {
    this.baseUrl = this.cfg.get<string>('SUPABASE_URL')!;
    this.serviceKey = this.cfg.get<string>('SUPABASE_SERVICE_ROLE_KEY')!;
  }

  // ---------- Helpers ----------
  private headersJson() {
    return {
      apikey: this.serviceKey,
      Authorization: `Bearer ${this.serviceKey}`,
      'Content-Type': 'application/json',
    };
  }

  // ---------- CREATE: ABUELOS ----------
  @Post('abuelos')
  async createAbuelos(
    @Req() req,
    @Body()
    body: { base: CreateSolicitudBaseDto; payload: CreateAbuelosPayloadDto },
  ) {
    const usuarioId = (req.userId ?? req.user?.id) as string;
    if (!usuarioId) throw new BadRequestException('Token inválido');

    const { base, payload } = body;

    if (!payload?.personas?.length || payload.personas.length > 3) {
      throw new BadRequestException(
        'Debes registrar entre 1 y 3 personas a cuidar',
      );
    }

    if (base.precio_sugerido !== undefined && base.precio_sugerido < 0) {
      throw new BadRequestException('precio_sugerido debe ser >= 0');
    }

    // 1) Base (incluye precio_sugerido)
    const resBase = await fetch(`${this.baseUrl}/rest/v1/solicitudes`, {
      method: 'POST',
      headers: {
        ...this.headersJson(),
        Prefer: 'return=representation,tx=commit',
      },
      body: JSON.stringify({
        usuario_id: usuarioId,
        tipo: 'ABUELOS',
        titulo: base.titulo,
        descripcion: base.descripcion,
        direccion_linea: base.ubicacion.direccion_linea,
        lat: base.ubicacion.lat,
        lng: base.ubicacion.lng,
        estado: 'ABIERTA',
        precio_sugerido: base.precio_sugerido ?? null, // ⬅️ nuevo
      }),
    });
    if (!resBase.ok) throw new BadRequestException(await resBase.text());
    const solicitud = (await resBase.json())[0];

    // 2) Fechas
    if (base.fechas?.length) {
      const fechasPayload = base.fechas.map((f) => ({
        solicitud_id: solicitud.id,
        fecha: f.fecha,
        hora_inicio: f.hora_inicio,
        hora_fin: f.hora_fin,
      }));
      const resFechas = await fetch(
        `${this.baseUrl}/rest/v1/solicitud_fechas`,
        {
          method: 'POST',
          headers: { ...this.headersJson(), Prefer: 'return=minimal' },
          body: JSON.stringify(fechasPayload),
        },
      );
      if (!resFechas.ok) throw new BadRequestException(await resFechas.text());
    }

    // 3) Detalle (servicio)
    const resDet = await fetch(
      `${this.baseUrl}/rest/v1/solicitud_abuelos_detalle`,
      {
        method: 'POST',
        headers: { ...this.headersJson(), Prefer: 'return=minimal' },
        body: JSON.stringify({
          solicitud_id: solicitud.id,
          servicio: payload.servicio,
        }),
      },
    );
    if (!resDet.ok) throw new BadRequestException(await resDet.text());

    // 4) Contacto cercano
    const resCc = await fetch(
      `${this.baseUrl}/rest/v1/solicitud_contacto_cercano`,
      {
        method: 'POST',
        headers: { ...this.headersJson(), Prefer: 'return=minimal' },
        body: JSON.stringify({
          solicitud_id: solicitud.id,
          nombre: payload.contacto_cercano.nombre,
          relacion: payload.contacto_cercano.relacion,
          telefono_e164: payload.contacto_cercano.telefono_e164,
        }),
      },
    );
    if (!resCc.ok) throw new BadRequestException(await resCc.text());

    // 5) Personas + medicamentos
    for (const p of payload.personas) {
      const resP = await fetch(
        `${this.baseUrl}/rest/v1/solicitud_abuelos_personas`,
        {
          method: 'POST',
          headers: { ...this.headersJson(), Prefer: 'return=representation' },
          body: JSON.stringify({
            solicitud_id: solicitud.id,
            nombre_completo: p.nombre_completo,
            fecha_nacimiento: p.fecha_nacimiento,
            genero: p.genero,
            fumador: p.fumador,
            limitacion_movimiento: p.limitacion_movimiento,
            tipo_limitacion: p.tipo_limitacion ?? null,
            alimentos_restringidos: (p.alimentos_restringidos ?? []).slice(
              0,
              3,
            ),
          }),
        },
      );
      if (!resP.ok) throw new BadRequestException(await resP.text());
      const persona = (await resP.json())[0];

      if (p.medicamentos?.length) {
        const medsPayload = p.medicamentos.map((m) => ({
          persona_id: persona.id,
          nombre: m.nombre,
          frecuencia: m.frecuencia,
          dosis: m.dosis,
        }));
        const resM = await fetch(
          `${this.baseUrl}/rest/v1/solicitud_abuelos_medicamentos`,
          {
            method: 'POST',
            headers: { ...this.headersJson(), Prefer: 'return=minimal' },
            body: JSON.stringify(medsPayload),
          },
        );
        if (!resM.ok) throw new BadRequestException(await resM.text());
      }
    }

    return { message: 'Solicitud creada', solicitud_id: solicitud.id };
  }

  // POST /solicitudes/ninios
  @Post('ninios')
  async createNinios(
    @Req() req,
    @Body()
    body: { base: CreateSolicitudBaseDto; payload: CreateNiniosPayloadDto },
  ) {
    const usuarioId = (req.userId ?? req.user?.id) as string;
    if (!usuarioId) throw new BadRequestException('Token inválido');

    const { base, payload } = body;

    // 1–3 niños
    if (!payload?.personas?.length || payload.personas.length > 3) {
      throw new BadRequestException('Debes registrar entre 1 y 3 niños');
    }

    // precio_sugerido opcional pero si viene debe ser >= 0
    if (base.precio_sugerido !== undefined && base.precio_sugerido < 0) {
      throw new BadRequestException('precio_sugerido debe ser >= 0');
    }

    // 1) Base (incluye precio_sugerido)
    const resBase = await fetch(`${this.baseUrl}/rest/v1/solicitudes`, {
      method: 'POST',
      headers: {
        ...this.headersJson(),
        Prefer: 'return=representation,tx=commit',
      },
      body: JSON.stringify({
        usuario_id: usuarioId,
        tipo: 'NINIOS',
        titulo: base.titulo,
        descripcion: base.descripcion,
        direccion_linea: base.ubicacion.direccion_linea,
        lat: base.ubicacion.lat,
        lng: base.ubicacion.lng,
        estado: 'ABIERTA',
        precio_sugerido: base.precio_sugerido ?? null, // ⬅️ NUEVO
      }),
    });
    if (!resBase.ok) throw new BadRequestException(await resBase.text());
    const solicitud = (await resBase.json())[0];

    // 2) Fechas
    if (base.fechas?.length) {
      const fechasPayload = base.fechas.map((f) => ({
        solicitud_id: solicitud.id,
        fecha: f.fecha,
        hora_inicio: f.hora_inicio,
        hora_fin: f.hora_fin,
      }));
      const resFechas = await fetch(
        `${this.baseUrl}/rest/v1/solicitud_fechas`,
        {
          method: 'POST',
          headers: { ...this.headersJson(), Prefer: 'return=minimal' },
          body: JSON.stringify(fechasPayload),
        },
      );
      if (!resFechas.ok) throw new BadRequestException(await resFechas.text());
    }

    // 3) Detalle (tipo de servicio)
    const resDet = await fetch(
      `${this.baseUrl}/rest/v1/solicitud_ninios_detalle`,
      {
        method: 'POST',
        headers: { ...this.headersJson(), Prefer: 'return=minimal' },
        body: JSON.stringify({
          solicitud_id: solicitud.id,
          servicio: payload.servicio,
        }),
      },
    );
    if (!resDet.ok) throw new BadRequestException(await resDet.text());

    // 4) Contacto tutor
    const resTutor = await fetch(
      `${this.baseUrl}/rest/v1/solicitud_contacto_cercano`,
      {
        method: 'POST',
        headers: { ...this.headersJson(), Prefer: 'return=minimal' },
        body: JSON.stringify({
          solicitud_id: solicitud.id,
          nombre: payload.contacto_tutor.nombre,
          relacion: payload.contacto_tutor.relacion,
          telefono_e164: payload.contacto_tutor.telefono_e164,
        }),
      },
    );
    if (!resTutor.ok) throw new BadRequestException(await resTutor.text());

    // 5) Niños + medicamentos
    for (const p of payload.personas) {
      const resP = await fetch(
        `${this.baseUrl}/rest/v1/solicitud_ninios_personas`,
        {
          method: 'POST',
          headers: { ...this.headersJson(), Prefer: 'return=representation' },
          body: JSON.stringify({
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
          }),
        },
      );
      if (!resP.ok) throw new BadRequestException(await resP.text());
      const persona = (await resP.json())[0];

      if (p.medicamentos?.length) {
        const medsPayload = p.medicamentos.map((m) => ({
          persona_id: persona.id,
          nombre: m.nombre,
          frecuencia: m.frecuencia,
          dosis: m.dosis,
        }));
        const resM = await fetch(
          `${this.baseUrl}/rest/v1/solicitud_ninios_medicamentos`,
          {
            method: 'POST',
            headers: { ...this.headersJson(), Prefer: 'return=minimal' },
            body: JSON.stringify(medsPayload),
          },
        );
        if (!resM.ok) throw new BadRequestException(await resM.text());
      }
    }

    return { message: 'Solicitud (Niños) creada', solicitud_id: solicitud.id };
  }
  // POST /solicitudes/mascotas
  @Post('mascotas')
  async createMascotas(
    @Req() req,
    @Body()
    body: { base: CreateSolicitudBaseDto; payload: CreateMascotasPayloadDto },
  ) {
    const usuarioId = (req.userId ?? req.user?.id) as string;
    if (!usuarioId) throw new BadRequestException('Token inválido');

    const { base, payload } = body;

    // 1–3 mascotas
    if (!payload?.animales?.length || payload.animales.length > 3) {
      throw new BadRequestException('Debes registrar entre 1 y 3 mascotas');
    }

    // precio_sugerido opcional pero si viene debe ser >= 0
    if (base.precio_sugerido !== undefined && base.precio_sugerido < 0) {
      throw new BadRequestException('precio_sugerido debe ser >= 0');
    }

    // 1) Base (incluye precio_sugerido)
    const resBase = await fetch(`${this.baseUrl}/rest/v1/solicitudes`, {
      method: 'POST',
      headers: {
        ...this.headersJson(),
        Prefer: 'return=representation,tx=commit',
      },
      body: JSON.stringify({
        usuario_id: usuarioId,
        tipo: 'MASCOTAS',
        titulo: base.titulo,
        descripcion: base.descripcion,
        direccion_linea: base.ubicacion.direccion_linea,
        lat: base.ubicacion.lat,
        lng: base.ubicacion.lng,
        estado: 'ABIERTA',
        precio_sugerido: base.precio_sugerido ?? null, // ⬅️ NUEVO
      }),
    });
    if (!resBase.ok) throw new BadRequestException(await resBase.text());
    const solicitud = (await resBase.json())[0];

    // 2) Fechas (1..n)
    if (base.fechas?.length) {
      const fechasPayload = base.fechas.map((f) => ({
        solicitud_id: solicitud.id,
        fecha: f.fecha,
        hora_inicio: f.hora_inicio,
        hora_fin: f.hora_fin,
      }));
      const resFechas = await fetch(
        `${this.baseUrl}/rest/v1/solicitud_fechas`,
        {
          method: 'POST',
          headers: { ...this.headersJson(), Prefer: 'return=minimal' },
          body: JSON.stringify(fechasPayload),
        },
      );
      if (!resFechas.ok) throw new BadRequestException(await resFechas.text());
    }

    // 3) Detalle (servicio + modalidad)
    const resDet = await fetch(
      `${this.baseUrl}/rest/v1/solicitud_mascotas_detalle`,
      {
        method: 'POST',
        headers: { ...this.headersJson(), Prefer: 'return=minimal' },
        body: JSON.stringify({
          solicitud_id: solicitud.id,
          servicio: payload.servicio,
          modalidad: payload.modalidad,
        }),
      },
    );
    if (!resDet.ok) throw new BadRequestException(await resDet.text());

    // 4) Contacto (tutor/familiar)
    const resCc = await fetch(
      `${this.baseUrl}/rest/v1/solicitud_contacto_cercano`,
      {
        method: 'POST',
        headers: { ...this.headersJson(), Prefer: 'return=minimal' },
        body: JSON.stringify({
          solicitud_id: solicitud.id,
          nombre: payload.contacto.nombre,
          relacion: payload.contacto.relacion,
          telefono_e164: payload.contacto.telefono_e164,
        }),
      },
    );
    if (!resCc.ok) throw new BadRequestException(await resCc.text());

    // 5) Animales (1..3)
    for (const a of payload.animales) {
      const resA = await fetch(
        `${this.baseUrl}/rest/v1/solicitud_mascotas_animales`,
        {
          method: 'POST',
          headers: { ...this.headersJson(), Prefer: 'return=minimal' },
          body: JSON.stringify({
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
          }),
        },
      );
      if (!resA.ok) throw new BadRequestException(await resA.text());
    }

    return {
      message: 'Solicitud (Mascotas) creada',
      solicitud_id: solicitud.id,
    };
  }

  // ---------- LISTAR MIS SOLICITUDES ----------
  @Get()
  async listMine(
    @Req() req,
    @Query('tipo') tipo?: 'ABUELOS' | 'NINIOS' | 'MASCOTAS',
  ) {
    const usuarioId = (req.userId ?? req.user?.id) as string;
    const where = [`usuario_id=eq.${usuarioId}`];
    if (tipo) where.push(`tipo=eq.${tipo}`);

    const url = `${this.baseUrl}/rest/v1/solicitudes?${where.join('&')}&order=creado_en.desc`;
    const r = await fetch(url, {
      headers: {
        apikey: this.serviceKey,
        Authorization: `Bearer ${this.serviceKey}`,
      },
    });
    if (!r.ok) throw new BadRequestException(await r.text());
    return JSON.parse((await r.text()) || '[]');
  }
  // GET /api/solicitudes/abiertas → solo tipos permitidos del cuidador logueado
  // GET /api/solicitudes/abiertas → solo las que el cuidador puede atender
  // GET /api/solicitudes/abiertas → solo las que el cuidador puede atender
  @Get('abiertas')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async abiertas(@Req() req, @Query() q: GetAbiertasQueryDto) {
    const userId = (req.userId ?? req.user?.id) as string;
    if (!userId) throw new BadRequestException('Token inválido');

    // headers locales
    const serviceKey = this.serviceKey;
    const headers = {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
    };

    // 1) Tipos del cuidador
    const cuUrl = `${this.baseUrl}/rest/v1/cuidadores?usuario_id=eq.${userId}&select=tipos_servicio`;
    const cuResp = await fetch(cuUrl, { headers });
    if (!cuResp.ok) throw new BadRequestException(await cuResp.text());
    const cuidador = (await cuResp.json())[0];
    if (!cuidador)
      throw new BadRequestException('Aún no tienes perfil de cuidador');
    const tipos: string[] = Array.isArray(cuidador.tipos_servicio)
      ? cuidador.tipos_servicio
      : [];
    if (tipos.length !== 2)
      throw new BadRequestException(
        'Perfil de cuidador inválido (tipos_servicio)',
      );

    // 2) Obtener IDs de solicitudes ya postuladas por este cuidador (para excluirlas)
    const posUrl = `${this.baseUrl}/rest/v1/postulaciones?cuidador_id=eq.${userId}&select=solicitud_id`;
    const posResp = await fetch(posUrl, { headers });
    if (!posResp.ok) throw new BadRequestException(await posResp.text());
    const yaPostuladas: { solicitud_id: string }[] = await posResp.json();
    const excluidas = yaPostuladas.map((r) => r.solicitud_id);

    // 3) Filtros:
    //   - ABIERTA
    //   - tipo in (mis dos tipos)
    //   - que NO sean mías (usuario_id != userId)
    //   - que NO estén en la lista de ya postuladas
    const andParts = [
      `estado.eq.ABIERTA`,
      `tipo.in.(${tipos.join(',')})`,
      `usuario_id.neq.${userId}`,
    ];

    if (excluidas.length > 0) {
      // formatear not-in: id=not.in.(uuid1,uuid2,...)
      andParts.push(`id.not.in.(${excluidas.join(',')})`);
    }

    // filtro por fecha opcional (YYYY-MM-DD) usando relación embebida
    if (q.fecha) andParts.push(`solicitud_fechas.fecha.eq.${q.fecha}`);

    const and = `and=(${andParts.join(',')})`;

    // 4) Campos públicos (sin dirección / coords)
    const select = [
      'id',
      'tipo',
      'titulo',
      'precio_sugerido',
      'descripcion',
      'creado_en',
      'solicitud_fechas(fecha,hora_inicio,hora_fin)',
    ].join(',');

    const page = q.page ?? 1;
    const limit = q.limit ?? 10;
    const offset = (page - 1) * limit;

    const url =
      `${this.baseUrl}/rest/v1/solicitudes?${and}` +
      `&select=${encodeURIComponent(select)}` +
      `&order=creado_en.desc&limit=${limit}&offset=${offset}`;

    const listResp = await fetch(url, { headers });
    if (!listResp.ok) throw new BadRequestException(await listResp.text());
    const rows = await listResp.json();

    const items = rows.map((r: any) => ({
      id: r.id,
      tipo: r.tipo,
      titulo: r.titulo,
      precio_sugerido: r.precio_sugerido ?? null, // ⬅️
      descripcion: r.descripcion,
      creado_en: r.creado_en,
      fechas: Array.isArray(r.solicitud_fechas) ? r.solicitud_fechas : [],
    }));

    return { page, limit, count: items.length, items };
  }
  // En tu SolicitudesController
  @Get('mias')
  @UseGuards(SupabaseAuthGuard)
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async mias(@Req() req, @Query() q: GetMiasQueryDto) {
    const userId = (req.userId ?? req.user?.id) as string;
    if (!userId) throw new BadRequestException('Token inválido');

    const headers = {
      apikey: this.serviceKey,
      Authorization: `Bearer ${this.serviceKey}`,
    };

    const filters = [`usuario_id=eq.${userId}`];
    if (q.estado) filters.push(`estado=eq.${q.estado}`);

    const page = q.page ?? 1;
    const limit = q.limit ?? 10;
    const offset = (page - 1) * limit;

    const select = [
      'id',
      'tipo',
      'titulo',
      'descripcion',
      'estado',
      'precio_sugerido',
      'creado_en',
      'solicitud_fechas(fecha,hora_inicio,hora_fin)',
      'postulaciones:postulaciones(count)',
    ].join(',');

    const url =
      `${this.baseUrl}/rest/v1/solicitudes?${filters.join('&')}` +
      `&select=${encodeURIComponent(select)}` +
      `&order=creado_en.desc&limit=${limit}&offset=${offset}`;

    const r = await fetch(url, { headers });
    if (!r.ok) throw new BadRequestException(await r.text());
    const rows = await r.json();

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
  @Get('mias/por-estado')
  @UseGuards(SupabaseAuthGuard)
  async miasPorEstado(@Req() req) {
    const userId = (req.userId ?? req.user?.id) as string;
    if (!userId) throw new BadRequestException('Token inválido');

    const headers = {
      apikey: this.serviceKey,
      Authorization: `Bearer ${this.serviceKey}`,
    };

    const select = [
      'id',
      'tipo',
      'titulo',
      'descripcion',
      'estado',
      'precio_sugerido',
      'creado_en',
      'solicitud_fechas(fecha,hora_inicio,hora_fin)',
      'postulaciones:postulaciones(count)',
    ].join(',');

    const url =
      `${this.baseUrl}/rest/v1/solicitudes?usuario_id=eq.${userId}` +
      `&select=${encodeURIComponent(select)}` +
      `&order=creado_en.desc`;

    const r = await fetch(url, { headers });
    if (!r.ok) throw new BadRequestException(await r.text());
    const rows = await r.json();

    const grupos = {
      ABIERTA: [] as any[],
      EN_REVISION: [] as any[],
      ASIGNADA: [] as any[],
      ACTIVA: [] as any[],
      COMPLETADA: [] as any[],
      CANCELADA: [] as any[],
    };

    for (const s of rows) {
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
      if (grupos[s.estado as keyof typeof grupos]) {
        grupos[s.estado as keyof typeof grupos].push(item);
      }
    }

    return grupos;
  }
  // GET /api/solicitudes/:id  → sirve para ABUELOS y NINIOS (y futuro MASCOTAS)
  @Get(':id')
  async getOne(@Param('id') id: string) {
    const select = [
      '*',
      'solicitud_fechas(*)',
      'solicitud_contacto_cercano(*)',

      // ABUELOS
      'solicitud_abuelos_detalle(*)',
      'solicitud_abuelos_personas(*,solicitud_abuelos_medicamentos(*))',

      // NINIOS
      'solicitud_ninios_detalle(*)',
      'solicitud_ninios_personas(*,solicitud_ninios_medicamentos(*))',

      // (Opcional) Mascotas, para cuando lo implementes:
      'solicitud_mascotas_detalle(*)',
      'solicitud_mascotas_animales(*)',
      'solicitud_imagenes(*)',
    ].join(',');

    const url = `${this.baseUrl}/rest/v1/solicitudes?id=eq.${id}&select=${encodeURIComponent(select)}`;
    const r = await fetch(url, {
      headers: {
        apikey: this.serviceKey,
        Authorization: `Bearer ${this.serviceKey}`,
      },
    });
    if (!r.ok) throw new BadRequestException(await r.text());

    const rows = JSON.parse((await r.text()) || '[]');
    if (!rows[0]) throw new BadRequestException('No encontrada');

    const sol = rows[0];

    // Limpieza opcional para devolver solo lo relevante al tipo:
    switch (sol.tipo) {
      case 'ABUELOS':
        delete sol.solicitud_ninios_detalle;
        delete sol.solicitud_ninios_personas;
        // delete sol.solicitud_mascotas_detalle; delete sol.solicitud_mascotas_animales; ...
        break;
      case 'NINIOS':
        delete sol.solicitud_abuelos_detalle;
        delete sol.solicitud_abuelos_personas;
        delete sol.solicitud_abuelos_medicamentos; // por si quedó anidado
        // delete sol.solicitud_mascotas_detalle; delete sol.solicitud_mascotas_animales; ...
        break;
      // case 'MASCOTAS': … (cuando lo tengas)
    }

    return sol;
  }

  // ---------- CANCELAR (soft) ----------
  @Delete(':id')
  async cancel(@Param('id') id: string) {
    const r = await fetch(`${this.baseUrl}/rest/v1/solicitudes?id=eq.${id}`, {
      method: 'PATCH',
      headers: { ...this.headersJson(), Prefer: 'return=representation' },
      body: JSON.stringify({ estado: 'CANCELADA' }),
    });
    if (!r.ok) throw new BadRequestException(await r.text());
    const text = await r.text();
    return { ok: true, solicitud: text ? JSON.parse(text)[0] : null };
  }
}
