import {
  Body,
  Controller,
  Post,
  BadRequestException,
  Inject,
  HttpCode,
  HttpStatus,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseClient } from '@supabase/supabase-js';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import { SupabaseAuthGuard } from 'src/common/supabase-auth.guard';
import { DeactivateAccountDto } from './dto/deactivate-account.dto';

// helper para obtener token al registrarse o loguearse
async function supabasePasswordLogin(
  baseUrl: string,
  anonKey: string,
  email: string,
  password: string,
) {
  const res = await fetch(`${baseUrl}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: anonKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const json = await res.json();
  if (!res.ok)
    throw new BadRequestException(
      json?.error_description || json?.error || `HTTP ${res.status}`,
    );
  return json; // { access_token, user, ... }
}

@Controller('auth')
export class AuthController {
  private baseUrl: string;
  private anonKey: string;

  constructor(
    @Inject('SB_ADMIN') private sbAdmin: SupabaseClient,
    private cfg: ConfigService,
  ) {
    this.baseUrl = this.cfg.get<string>('SUPABASE_URL')!;
    this.anonKey = this.cfg.get<string>('SUPABASE_ANON_KEY')!;
  }

  // 🧩 REGISTRO
  @Post('register')
  async register(@Body() dto: RegisterDto) {
    const { email, password, name } = dto;

    // 1️⃣ Crear usuario en Supabase Auth
    const { data, error } = await this.sbAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name },
      app_metadata: { role: 'user' },
    });
    if (error) throw new BadRequestException(error.message);

    const user = data.user!;
    const userId = user.id;

    // 2️⃣ Crear perfil en tu tabla "usuarios"
    const restUrl = `${this.baseUrl}/rest/v1/usuarios`;
    const resProfile = await fetch(restUrl, {
      method: 'POST',
      headers: {
        apikey: this.anonKey,
        Authorization: `Bearer ${this.cfg.get<string>('SUPABASE_SERVICE_ROLE_KEY')}`,
        'Content-Type': 'application/json',
        // 👇 cambio importante: merge duplicates
        Prefer: 'resolution=merge-duplicates,return=representation',
      },
      body: JSON.stringify({
        id: userId,
        correo: email,
        nombre_completo: name ?? null,
        telefono_e164: dto.telefono_e164 ?? null,
        pais_iso2: dto.pais_iso2 ?? null,
        genero: dto.genero ?? null,
        foto_url: dto.foto_url ?? null,
        dni: dto.dni ?? null,
      }),
    });

    if (!resProfile.ok) {
      const msg = await resProfile.text();
      await this.sbAdmin.auth.admin.deleteUser(userId);
      throw new BadRequestException(`Error creando perfil: ${msg}`);
    }

    const perfil = await resProfile.json();

    // 3️⃣ Login automático
    const session = await supabasePasswordLogin(
      this.baseUrl,
      this.anonKey,
      email,
      password,
    );

    return {
      message: 'Usuario registrado correctamente',
      user: { id: userId, email },
      profile: Array.isArray(perfil) ? perfil[0] : perfil,
      session, // incluye access_token
    };
  }

  // 🧩 LOGIN
  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(@Body() dto: LoginDto) {
    const { email, password } = dto;

    // 1️⃣ Iniciar sesión en Supabase Auth
    const session = await supabasePasswordLogin(
      this.baseUrl,
      this.anonKey,
      email,
      password,
    );

    // 2️⃣ Buscar perfil del usuario en tu tabla `usuarios`
    const serviceKey = this.cfg.get<string>('SUPABASE_SERVICE_ROLE_KEY')!;
    const restUrl = `${this.baseUrl}/rest/v1/usuarios?correo=eq.${email}&select=*`;

    const resProfile = await fetch(restUrl, {
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
      },
    });

    const perfil = await resProfile.json();

    return {
      message: 'Inicio de sesión exitoso',
      user: session.user,
      profile: Array.isArray(perfil) ? perfil[0] : perfil,
      session, // contiene access_token, refresh_token, expires_in, etc.
    };
  }
  @UseGuards(SupabaseAuthGuard)
  @Put('me')
  async updateAccount(@Req() req, @Body() dto: UpdateAccountDto) {
    const userId = (req.userId ?? req.user?.id ?? req.user?.sub) as string;
    if (!userId || !/^[0-9a-fA-F-]{36}$/.test(userId)) {
      throw new BadRequestException('User id inválido o ausente en el token');
    }

    const serviceKey = this.cfg.get<string>('SUPABASE_SERVICE_ROLE_KEY')!;
    const baseUrl = this.baseUrl;

    // 1) Actualiza Auth si hay email/password/name
    if (dto.email || dto.password || dto.name) {
      const { error } = await this.sbAdmin.auth.admin.updateUserById(userId, {
        email: dto.email,
        password: dto.password,
        email_confirm: dto.email ? true : undefined,
        user_metadata: dto.name ? { name: dto.name } : undefined,
      });
      if (error)
        throw new BadRequestException(
          `Error actualizando en Auth: ${error.message}`,
        );
    }

    // 2) Construye payload de perfil solo con campos definidos (sin undefined)
    const patchPayload = Object.fromEntries(
      Object.entries({
        correo: dto.email,
        nombre_completo: dto.name,
        telefono_e164: dto.telefono_e164,
        pais_iso2: dto.pais_iso2,
        genero: dto.genero,
        foto_url: dto.foto_url,
      }).filter(([, v]) => v !== undefined),
    );

    let perfil: any = null;

    // Aplica PATCH solo si hay algo que actualizar del perfil
    if (Object.keys(patchPayload).length > 0) {
      const resProfile = await fetch(
        `${baseUrl}/rest/v1/usuarios?id=eq.${userId}`,
        {
          method: 'PATCH',
          headers: {
            apikey: serviceKey,
            Authorization: `Bearer ${serviceKey}`,
            'Content-Type': 'application/json',
            // 👇 clave para que devuelva la fila en el cuerpo (no 204)
            Prefer: 'return=representation',
          },
          body: JSON.stringify(patchPayload),
        },
      );

      if (!resProfile.ok) {
        const msg = await resProfile.text();
        throw new BadRequestException(`Error actualizando perfil: ${msg}`);
      }

      // parseo seguro (por si algún proxy igual devuelve 204)
      const text = await resProfile.text();
      perfil = text ? JSON.parse(text) : null;
      if (Array.isArray(perfil)) perfil = perfil[0];
    } else {
      // Si no hubo PATCH, trae el perfil actual para responder algo útil
      const resGet = await fetch(
        `${baseUrl}/rest/v1/usuarios?id=eq.${userId}&select=*`,
        {
          headers: {
            apikey: serviceKey,
            Authorization: `Bearer ${serviceKey}`,
          },
        },
      );
      const text = await resGet.text();
      const arr = text ? JSON.parse(text) : [];
      perfil = Array.isArray(arr) ? arr[0] : arr;
    }

    return {
      message: 'Cuenta actualizada correctamente',
      user: { id: userId, email: dto.email ?? req.user?.email },
      profile: perfil,
    };
  }
  @UseGuards(SupabaseAuthGuard)
  @Put('me/deactivate')
  async deactivateMe(@Req() req, @Body() dto: DeactivateAccountDto) {
    const userId = (req.userId ?? req.user?.id ?? req.user?.sub) as string;
    if (!userId || !/^[0-9a-fA-F-]{36}$/.test(userId)) {
      throw new BadRequestException('User id inválido o ausente en el token');
    }

    const baseUrl = this.baseUrl;
    const serviceKey = this.cfg.get<string>('SUPABASE_SERVICE_ROLE_KEY')!;

    const res = await fetch(`${baseUrl}/rest/v1/usuarios?id=eq.${userId}`, {
      method: 'PATCH',
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify({
        activo: false,
        desactivado_en: new Date().toISOString(),
        desactivado_motivo: dto.reason ?? null,
      }),
    });

    if (!res.ok) {
      const msg = await res.text();
      throw new BadRequestException(`No se pudo desactivar: ${msg}`);
    }

    const text = await res.text();
    const perfil = text ? JSON.parse(text) : null;
    return { ok: true, profile: Array.isArray(perfil) ? perfil[0] : perfil };
  }

  @UseGuards(SupabaseAuthGuard)
  @Put('me/reactivate')
  async reactivateMe(@Req() req) {
    const userId = (req.userId ?? req.user?.id ?? req.user?.sub) as string;
    if (!userId || !/^[0-9a-fA-F-]{36}$/.test(userId)) {
      throw new BadRequestException('User id inválido o ausente en el token');
    }

    const baseUrl = this.baseUrl;
    const serviceKey = this.cfg.get<string>('SUPABASE_SERVICE_ROLE_KEY')!;

    const res = await fetch(`${baseUrl}/rest/v1/usuarios?id=eq.${userId}`, {
      method: 'PATCH',
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify({
        activo: true,
        desactivado_en: null,
        desactivado_motivo: null,
      }),
    });

    if (!res.ok) {
      const msg = await res.text();
      throw new BadRequestException(`No se pudo reactivar: ${msg}`);
    }

    const text = await res.text();
    const perfil = text ? JSON.parse(text) : null;
    return { ok: true, profile: Array.isArray(perfil) ? perfil[0] : perfil };
  }
}
