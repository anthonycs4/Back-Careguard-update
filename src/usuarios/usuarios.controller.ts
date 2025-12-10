import {
  BadRequestException,
  Controller,
  Get,
  Inject,
  Param,
  Req,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseAuthGuard } from '../common/supabase-auth.guard';

function isUUID(v: string) {
  return /^[0-9a-fA-F-]{36}$/.test(v);
}

// qué campos son públicos
const PUBLIC_COLUMNS = [
  'id',
  'nombre_completo',
  'foto_url',
  'genero',
  // agrega aquí otros que sean OK mostrar
];

@Controller('usuarios')
export class UsuariosController {
  constructor(private cfg: ConfigService) {}

  // 1) Mi perfil (privado, todos los campos)
  @UseGuards(SupabaseAuthGuard)
  @Get('me')
  async me(@Req() req) {
    const userId = (req.userId ?? req.user?.id ?? req.user?.sub) as string;
    if (!isUUID(userId)) throw new BadRequestException('User id inválido');

    const baseUrl = this.cfg.get<string>('SUPABASE_URL')!;
    const serviceKey = this.cfg.get<string>('SUPABASE_SERVICE_ROLE_KEY')!;

    const url = `${baseUrl}/rest/v1/usuarios?id=eq.${userId}&select=*`;
    const r = await fetch(url, {
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
    });
    if (!r.ok) throw new BadRequestException(await r.text());
    const arr = JSON.parse((await r.text()) || '[]');
    const profile = Array.isArray(arr) ? arr[0] : arr;
    if (!profile) throw new BadRequestException('Perfil no encontrado');

    return { profile };
  }

  // 2) Perfil público por id (solo campos públicos)
  @UseGuards(SupabaseAuthGuard)
  @Get(':id')
  async getPublicById(@Param('id') id: string) {
    if (!isUUID(id)) throw new BadRequestException('Id inválido');

    const baseUrl = this.cfg.get<string>('SUPABASE_URL')!;
    const serviceKey = this.cfg.get<string>('SUPABASE_SERVICE_ROLE_KEY')!;

    // Solo columnas públicas + solo cuentas activas
    const select = PUBLIC_COLUMNS.join(',');
    const url = `${baseUrl}/rest/v1/usuarios?id=eq.${id}&activo=eq.true&select=${select}`;
    const r = await fetch(encodeURI(url), {
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
    });
    if (!r.ok) throw new BadRequestException(await r.text());
    const arr = JSON.parse((await r.text()) || '[]');
    const profile = Array.isArray(arr) ? arr[0] : arr;

    // si no hay perfil o está inactivo, devuelve 404-like
    if (!profile)
      throw new BadRequestException('Usuario no encontrado o inactivo');

    return { profile };
  }
}
