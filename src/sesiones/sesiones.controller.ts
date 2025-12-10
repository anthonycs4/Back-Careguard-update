// src/sesiones/sesiones.controller.ts
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseAuthGuard } from '../common/supabase-auth.guard';
import { CrearDesdeAsignacionDto } from './dto/crear-desde-asignacion.dto';
import { CheckInProponerDto } from './dto/checkin.dto';
import { CheckOutProponerDto, CheckOutConfirmarDto } from './dto/checkout.dto';
import { CrearResenaDto } from './dto/resena.dto';
import type { Sesion } from './types';

@UseGuards(SupabaseAuthGuard)
@Controller('sesiones')
export class SesionesController {
  constructor(private cfg: ConfigService) {}

  private get baseUrl() {
    return this.cfg.get<string>('SUPABASE_URL')!;
  }
  private get svcKey() {
    return this.cfg.get<string>('SUPABASE_SERVICE_ROLE_KEY')!;
  }
  private headersJson() {
    return {
      apikey: this.svcKey,
      Authorization: `Bearer ${this.svcKey}`,
      'Content-Type': 'application/json',
    };
  }
  private headers() {
    return { apikey: this.svcKey, Authorization: `Bearer ${this.svcKey}` };
  }

  // ───────────────────────────────
  // Crear sesión desde asignación
  // ───────────────────────────────
  @Post('desde-asignacion')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async crearDesdeAsignacion(@Req() req, @Body() dto: CrearDesdeAsignacionDto) {
    const actor = (req.userId ?? req.user?.id) as string;
    const r = await fetch(
      `${this.baseUrl}/rest/v1/rpc/rpc_sesion_crear_desde_asignacion`,
      {
        method: 'POST',
        headers: this.headersJson(),
        body: JSON.stringify({
          p_asignacion_id: dto.asignacion_id,
          p_actor_id: actor,
        }),
      },
    );
    const txt = await r.text();
    if (!r.ok) throw new BadRequestException(txt || `HTTP ${r.status}`);
    return JSON.parse(txt) as Sesion;
  }

  // ───────────────────────────────
  // Check-in / Check-out
  // ───────────────────────────────
  @Post(':id/check-in/proponer')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async checkInProponer(
    @Req() req,
    @Param('id') id: string,
    @Body() b: CheckInProponerDto,
  ) {
    const actor = (req.userId ?? req.user?.id) as string;
    const r = await fetch(
      `${this.baseUrl}/rest/v1/rpc/rpc_sesion_check_in_proponer_simple`,
      {
        method: 'POST',
        headers: this.headersJson(),
        body: JSON.stringify({
          p_sesion_id: id,
          p_actor_id: actor,
          p_notas: b?.notas ?? null,
        }),
      },
    );
    const txt = await r.text();
    if (!r.ok) throw new BadRequestException(txt || `HTTP ${r.status}`);
    return JSON.parse(txt) as Sesion;
  }

  @Post(':id/check-in/confirmar')
  async checkInConfirmar(@Req() req, @Param('id') id: string) {
    const actor = (req.userId ?? req.user?.id) as string;
    const r = await fetch(
      `${this.baseUrl}/rest/v1/rpc/rpc_sesion_check_in_confirmar_simple`,
      {
        method: 'POST',
        headers: this.headersJson(),
        body: JSON.stringify({ p_sesion_id: id, p_actor_id: actor }),
      },
    );
    const txt = await r.text();
    if (!r.ok) throw new BadRequestException(txt || `HTTP ${r.status}`);
    return JSON.parse(txt) as Sesion;
  }

  @Post(':id/check-out/proponer')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async checkOutProponer(
    @Req() req,
    @Param('id') id: string,
    @Body() b: CheckOutProponerDto,
  ) {
    const actor = (req.userId ?? req.user?.id) as string;
    const r = await fetch(
      `${this.baseUrl}/rest/v1/rpc/rpc_sesion_check_out_proponer_simple`,
      {
        method: 'POST',
        headers: this.headersJson(),
        body: JSON.stringify({
          p_sesion_id: id,
          p_actor_id: actor,
          p_resumen: b?.resumen ?? null,
        }),
      },
    );
    const txt = await r.text();
    if (!r.ok) throw new BadRequestException(txt || `HTTP ${r.status}`);
    return JSON.parse(txt) as Sesion;
  }

  @Post(':id/check-out/confirmar')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async checkOutConfirmar(
    @Req() req,
    @Param('id') id: string,
    @Body() b: CheckOutConfirmarDto,
  ) {
    const actor = (req.userId ?? req.user?.id) as string;
    const r = await fetch(
      `${this.baseUrl}/rest/v1/rpc/rpc_sesion_check_out_confirmar_simple`,
      {
        method: 'POST',
        headers: this.headersJson(),
        body: JSON.stringify({
          p_sesion_id: id,
          p_actor_id: actor,
          p_resumen: b?.resumen ?? null,
        }),
      },
    );
    const txt = await r.text();
    if (!r.ok) throw new BadRequestException(txt || `HTTP ${r.status}`);
    return JSON.parse(txt) as Sesion;
  }

  // ───────────────────────────────
  // Reseñas (ambos lados)
  // ───────────────────────────────
  @Post(':id/resenas')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async crearResena(
    @Req() req,
    @Param('id') sesionId: string,
    @Body() dto: CrearResenaDto,
  ) {
    const actor = (req.userId ?? req.user?.id) as string;

    // Resolver destinatario via join (cuidador vs solicitante)
    const joinUrl =
      `${this.baseUrl}/rest/v1/sesiones?` +
      `id=eq.${sesionId}&select=cuidador_id,solicitud:solicitudes!sesiones_solicitud_id_fkey(usuario_id)`;

    const j = await fetch(joinUrl, { headers: this.headers() });
    if (!j.ok) throw new BadRequestException(await j.text());
    const s = (await j.json())?.[0];
    if (!s) throw new BadRequestException('Sesión no encontrada');

    let toUser: string | null = null;
    let rolFrom: 'SOLICITANTE' | 'CUIDADOR' = 'CUIDADOR';

    if (dto.para === 'CUIDADOR') {
      if (s.solicitud?.usuario_id !== actor)
        throw new BadRequestException(
          'Solo el dueño puede reseñar al cuidador',
        );
      toUser = s.cuidador_id;
      rolFrom = 'SOLICITANTE';
    } else {
      if (s.cuidador_id !== actor)
        throw new BadRequestException(
          'Solo el cuidador puede reseñar al usuario',
        );
      toUser = s.solicitud?.usuario_id;
      rolFrom = 'CUIDADOR';
    }

    const ins = await fetch(`${this.baseUrl}/rest/v1/sesiones_resenas`, {
      method: 'POST',
      headers: { ...this.headersJson(), Prefer: 'return=representation' },
      body: JSON.stringify({
        sesion_id: sesionId,
        from_user_id: actor,
        to_user_id: toUser,
        rol_from: rolFrom,
        rating: dto.rating,
        comentario: dto.comentario ?? null,
      }),
    });

    const txt = await ins.text();
    if (!ins.ok) throw new BadRequestException(txt || `HTTP ${ins.status}`);
    return { message: 'Reseña registrada', resena: JSON.parse(txt)[0] };
  }

  // ───────────────────────────────
  // Get detalle sesión (para UI)
  // ───────────────────────────────
  @Get(':id')
  async getOne(@Req() req, @Param('id') id: string) {
    const sel = '*';
    const url = `${this.baseUrl}/rest/v1/sesiones?id=eq.${id}&select=${encodeURIComponent(sel)}`;
    const r = await fetch(url, { headers: this.headers() });
    const txt = await r.text();
    if (!r.ok) throw new BadRequestException(txt || `HTTP ${r.status}`);
    const row = JSON.parse(txt)[0];
    if (!row) throw new BadRequestException('Sesión no encontrada');
    return row as Sesion;
  }

  // ───────────────────────────────
  // Listado por rol (mis sesiones)
  // ───────────────────────────────
  @Get()
  async listMine(
    @Req() req,
    @Query('rol') rol: 'CUIDADOR' | 'SOLICITANTE' = 'CUIDADOR',
  ) {
    const me = (req.userId ?? req.user?.id) as string;
    const select = '*';
    let url = '';

    if (rol === 'CUIDADOR') {
      url = `${this.baseUrl}/rest/v1/sesiones?cuidador_id=eq.${me}&select=${encodeURIComponent(select)}&order=creado_en.desc`;
    } else {
      // via join por solicitud
      url =
        `${this.baseUrl}/rest/v1/sesiones?select=${encodeURIComponent(select)},` +
        `solicitud:solicitudes!sesiones_solicitud_id_fkey(usuario_id)&` +
        `solicitud.usuario_id=eq.${me}&order=creado_en.desc`;
    }

    const r = await fetch(url, { headers: this.headers() });
    const txt = await r.text();
    if (!r.ok) throw new BadRequestException(txt || `HTTP ${r.status}`);
    return JSON.parse(txt) as Sesion[];
  }
}
