import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Req,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseAuthGuard } from '../common/supabase-auth.guard';
import { UpdateCuidadorDto } from './dto/update-cuidador.dto';

@Controller('cuidadores')
@UseGuards(SupabaseAuthGuard)
export class CuidadoresController {
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

  private async fetchJson<T = any>(
    url: string,
    init?: RequestInit,
  ): Promise<T> {
    const r = await fetch(url, init);
    const text = await r.text();
    if (!r.ok) throw new BadRequestException(text || `HTTP ${r.status}`);
    return text ? (JSON.parse(text) as T) : (undefined as unknown as T);
  }

  // A) Ver MI perfil (privado)
  @Get('me')
  async me(@Req() req) {
    const userId = (req.userId ?? req.user?.id) as string;
    if (!userId) throw new BadRequestException('Token inválido');

    // cuidadores +
    // (opcional) datos públicos del usuario para mostrar nombre/foto en tu app
    const cuUrl = `${this.baseUrl}/rest/v1/cuidadores?usuario_id=eq.${userId}&select=*`;
    const cuRows = await this.fetchJson<any[]>(cuUrl, {
      headers: this.headersJson(),
    });
    const cuidador = cuRows?.[0];
    if (!cuidador)
      throw new BadRequestException('Aún no tienes perfil de cuidador');

    const uUrl = `${this.baseUrl}/rest/v1/usuarios?id=eq.${userId}&select=nombre_completo,foto_url`;
    const uRows = await this.fetchJson<any[]>(uUrl, {
      headers: this.headersJson(),
    });
    const usuario = uRows?.[0] ?? null;

    return { ...cuidador, usuario };
  }

  // B) Ver perfil PÚBLICO por usuario_id (para familias)
  @Get(':id')
  async publicById(@Param('id') id: string) {
    const select =
      'usuario_id,bio,anios_experiencia,horas_acumuladas,rating_promedio,tipos_servicio,tarifa_hora';
    const cuUrl = `${this.baseUrl}/rest/v1/cuidadores?usuario_id=eq.${id}&select=${encodeURIComponent(select)}`;
    const cuRows = await this.fetchJson<any[]>(cuUrl, {
      headers: this.headersJson(),
    });
    const cuidador = cuRows?.[0];
    if (!cuidador) throw new BadRequestException('Cuidador no encontrado');

    // Enriquecer con nombre/foto públicos
    const uUrl = `${this.baseUrl}/rest/v1/usuarios?id=eq.${id}&select=nombre_completo,foto_url`;
    const uRows = await this.fetchJson<any[]>(uUrl, {
      headers: this.headersJson(),
    });
    const usuario = uRows?.[0] ?? null;

    return { ...cuidador, usuario };
  }

  // C) Actualizar MI perfil (bio, años, tarifa)
  @Patch('me')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async updateMe(@Req() req, @Body() dto: UpdateCuidadorDto) {
    const userId = (req.userId ?? req.user?.id) as string;
    if (!userId) throw new BadRequestException('Token inválido');

    // Verifica que exista perfil
    const existsUrl = `${this.baseUrl}/rest/v1/cuidadores?usuario_id=eq.${userId}&select=usuario_id`;
    const rows = await this.fetchJson<any[]>(existsUrl, {
      headers: this.headersJson(),
    });
    if (!rows?.[0])
      throw new BadRequestException('Aún no tienes perfil de cuidador');

    const patchUrl = `${this.baseUrl}/rest/v1/cuidadores?usuario_id=eq.${userId}`;
    const res = await this.fetchJson<any[]>(patchUrl, {
      method: 'PATCH',
      headers: this.headersJson(),
      body: JSON.stringify({
        ...(dto.bio !== undefined ? { bio: dto.bio } : {}),
        ...(dto.anios_experiencia !== undefined
          ? { anios_experiencia: dto.anios_experiencia }
          : {}),
        ...(dto.tarifa_hora !== undefined
          ? { tarifa_hora: dto.tarifa_hora }
          : {}),
      }),
    });

    // PostgREST con `return=representation` sería ideal, pero también puedes devolver OK simple
    return { message: 'Perfil actualizado', cuidador: res?.[0] ?? null };
  }
}
