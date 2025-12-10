import {
  BadRequestException,
  Body,
  Controller,
  Post,
  Get,
  Req,
  UseGuards,
  UsePipes,
  Param,
  ValidationPipe,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseAuthGuard } from '../common/supabase-auth.guard';
import { CreatePostulacionDto } from './dto/create-postulacion.dto';
import { AceptarPostulacionDto } from './dto/aceptar.dto';

@Controller('postulaciones')
@UseGuards(SupabaseAuthGuard)
export class PostulacionesController {
  // TEMP: probar guard en POST también
  @Post('_debug_auth')
  dbgPost(@Req() req) {
    return {
      method: 'POST',
      hasAuthHeader: !!req.headers?.authorization,
      authHeaderStartsWithBearer: (req.headers?.authorization || '').startsWith(
        'Bearer ',
      ),
      userId: req.userId ?? req.user?.id ?? null,
    };
  }

  constructor(private cfg: ConfigService) {}
  private get baseUrl() {
    return this.cfg.get<string>('SUPABASE_URL')!;
  }
  private get serviceKey() {
    return this.cfg.get<string>('SUPABASE_SERVICE_ROLE_KEY')!;
  }
  private headersJson() {
    return {
      apikey: this.serviceKey,
      Authorization: `Bearer ${this.serviceKey}`,
      'Content-Type': 'application/json',
    };
  }

  @Post()
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async crear(@Req() req, @Body() dto: CreatePostulacionDto) {
    const userId = (req.userId ?? req.user?.id) as string;
    if (!userId) throw new BadRequestException('Token inválido');
    if (!dto.solicitud_id)
      throw new BadRequestException('solicitud_id es requerido');

    const r = await fetch(`${this.baseUrl}/rest/v1/postulaciones`, {
      method: 'POST',
      headers: {
        ...this.headersJson(),
        // 👇 fuerza a PostgREST a devolver la fila insertada
        Prefer: 'return=representation',
      },
      body: JSON.stringify({
        solicitud_id: dto.solicitud_id,
        cuidador_id: userId,
        mensaje: dto.mensaje ?? null,
        tarifa_propuesta: dto.tarifa_propuesta ?? null, // DB ajusta/valida
        estado: 'POSTULADO',
      }),
    });

    const txt = await r.text();

    if (!r.ok) {
      if (
        txt.includes('duplicate key') ||
        txt.includes('postulaciones_unicas_activas')
      ) {
        throw new BadRequestException(
          'Ya te postulaste a esta solicitud (o está seleccionada).',
        );
      }
      // mensajes levantados desde triggers/constraints
      throw new BadRequestException(txt || `HTTP ${r.status}`);
    }

    // 👇 parseo seguro (PostgREST puede devolver [] o {} según config)
    let row: any = null;
    if (txt) {
      try {
        const parsed = JSON.parse(txt);
        row = Array.isArray(parsed) ? parsed[0] : parsed;
      } catch {
        // si por algo vino texto no-JSON
        throw new BadRequestException(
          `Respuesta inesperada de Supabase: ${txt}`,
        );
      }
    }

    // fallback ultra defensivo (no debería ocurrir con return=representation)
    if (!row) {
      // podrías leer por PK si necesitas, pero normalmente no hace falta
      return {
        message: 'Postulación creada',
        detalle: 'Insert OK (sin cuerpo)',
      };
    }

    return { message: 'Postulación creada', postulacion: row };
  }
  // GET /postulaciones/solicitud/:id
  @Get('solicitud/:id')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async getBySolicitud(@Req() req, @Param('id') solicitudId: string) {
    const userId = (req.userId ?? req.user?.id) as string;
    if (!userId) throw new BadRequestException('Token inválido');
    if (!solicitudId)
      throw new BadRequestException('ID de solicitud requerido');

    // 1️⃣ Verifica que la solicitud pertenece al usuario autenticado
    const solUrl = `${this.baseUrl}/rest/v1/solicitudes?id=eq.${solicitudId}&select=usuario_id`;
    const solResp = await fetch(solUrl, { headers: this.headersJson() });
    const solRows = solResp.ok ? await solResp.json() : [];
    const solicitud = solRows[0];
    if (!solicitud) throw new BadRequestException('Solicitud no encontrada');
    if (solicitud.usuario_id !== userId)
      throw new BadRequestException(
        'No puedes ver postulaciones de otra solicitud',
      );

    // 2️⃣ Obtener postulaciones con info del cuidador + usuario
    const select = [
      'id',
      'mensaje',
      'tarifa_propuesta',
      'precio_solicitante',
      'estado',
      'creado_en',
      'cuidador:cuidadores!postulaciones_cuidador_id_fkey(' +
        'usuario_id, bio, anios_experiencia, rating_promedio, tipos_servicio, ' +
        'usuario:usuarios!cuidadores_usuario_id_fkey(nombre_completo,correo,foto_url)' +
        ')',
    ].join(',');

    const url = `${this.baseUrl}/rest/v1/postulaciones?solicitud_id=eq.${solicitudId}&select=${encodeURIComponent(select)}&order=creado_en.desc`;
    const r = await fetch(url, { headers: this.headersJson() });

    if (!r.ok) throw new BadRequestException(await r.text());
    const rows = await r.json();

    return {
      solicitud_id: solicitudId,
      total: rows.length,
      postulaciones: rows.map((p: any) => ({
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
      })),
    };
  }
  // ✅ Aceptar (match) una postulación con precio final
  @Post(':postulacionId/aceptar')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async aceptar(
    @Req() req,
    @Param('postulacionId') postulacionId: string,
    @Body() body: AceptarPostulacionDto,
  ) {
    const actorId = (req.userId ?? req.user?.id) as string;
    if (!actorId) throw new BadRequestException('Token inválido');
    if (body?.tarifa_acordada == null) {
      throw new BadRequestException('tarifa_acordada es requerida');
    }

    const r = await fetch(
      `${this.baseUrl}/rest/v1/rpc/rpc_seleccionar_postulacion`,
      {
        method: 'POST',
        headers: this.headersJson(),
        body: JSON.stringify({
          p_postulacion_id: postulacionId,
          p_actor_id: actorId,
          p_tarifa_acordada: body.tarifa_acordada, // ← OBLIGATORIO
        }),
      },
    );

    const txt = await r.text();
    if (!r.ok) throw new BadRequestException(txt || `HTTP ${r.status}`);

    return {
      message: 'Postulación aceptada',
      result: txt ? JSON.parse(txt) : null,
    };
  }
}
