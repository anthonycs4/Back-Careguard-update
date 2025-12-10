import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseClient } from '@supabase/supabase-js';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import { DeactivateAccountDto } from './dto/deactivate-account.dto';
import { SUPABASE_CLIENT } from '../../database/constants';

@Injectable()
export class AuthService {
  constructor(
    @Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient,
    private readonly config: ConfigService,
  ) {}

  /**
   * Registra un nuevo usuario en Auth y crea su perfil en la tabla 'usuarios'.
   * Realiza login automático al finalizar.
   */
  async register(dto: RegisterDto) {
    const { email, password, name } = dto;

    // 1. Crear usuario en Supabase Auth (admin)
    const { data: authData, error: authError } =
      await this.supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { name },
        app_metadata: { role: 'user' },
      });

    if (authError) throw new BadRequestException(authError.message);

    const user = authData.user;
    if (!user) throw new InternalServerErrorException('No user created');

    // 2. Crear perfil en tabla 'usuarios'
    // Usamos upsert o insert. El controlador original usaba POST /rest/v1/usuarios
    // con 'resolution=merge-duplicates'.
    const { error: profileError, data: profileData } = await this.supabase
      .from('usuarios')
      .upsert(
        {
          id: user.id,
          correo: email,
          nombre_completo: name ?? null,
          telefono_e164: dto.telefono_e164 ?? null,
          pais_iso2: dto.pais_iso2 ?? null,
          genero: dto.genero ?? null,
          foto_url: dto.foto_url ?? null,
          dni: dto.dni ?? null,
        },
        { onConflict: 'id' },
      )
      .select()
      .single();

    if (profileError) {
      // Rollback: borrar usuario si falla perfil
      await this.supabase.auth.admin.deleteUser(user.id);
      throw new BadRequestException(
        `Error creando perfil: ${profileError.message}`,
      );
    }

    // 3. Login automático
    const session = await this.login({ email, password });

    return {
      message: 'Usuario registrado correctamente',
      user: { id: user.id, email },
      profile: profileData,
      session: session.session,
    };
  }

  /**
   * Inicia sesión con email y contraseña.
   * Retorna la sesión y el perfil del usuario.
   */
  async login(dto: LoginDto) {
    const { email, password } = dto;

    // 1. Login usando SDK (signInWithPassword)
    // NOTA: Al usar el cliente con Service Role, esto funciona para verificar credenciales
    // y devolver tokens, aunque sea una operación "admin-ish" o backend-side.
    // Sin embargo, para mayor "pureza" de simular cliente, a veces se usa un cliente anon.
    // Probaremos con el cliente inyectado.
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw new BadRequestException(error.message);
    if (!data.session)
      throw new BadRequestException('No se pudo iniciar sesión');

    // 2. Obtener perfil
    const { data: profile, error: profileError } = await this.supabase
      .from('usuarios')
      .select('*')
      .eq('correo', email)
      .single();

    if (profileError) {
      // No detiene el login, pero avisa
      console.warn('Login exitoso pero sin perfil:', profileError.message);
    }

    return {
      message: 'Inicio de sesión exitoso',
      user: data.user,
      profile: profile,
      session: data.session,
    };
  }

  /**
   * Actualiza datos de la cuenta (Auth) y del perfil (DB).
   */
  async updateAccount(userId: string, dto: UpdateAccountDto) {
    // 1. Actualizar Auth (si aplica)
    if (dto.email || dto.password || dto.name) {
      const { error } = await this.supabase.auth.admin.updateUserById(userId, {
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

    // 2. Actualizar Perfil (DB)
    const updates: any = {};
    if (dto.email !== undefined) updates.correo = dto.email;
    if (dto.name !== undefined) updates.nombre_completo = dto.name;
    if (dto.telefono_e164 !== undefined)
      updates.telefono_e164 = dto.telefono_e164;
    if (dto.pais_iso2 !== undefined) updates.pais_iso2 = dto.pais_iso2;
    if (dto.genero !== undefined) updates.genero = dto.genero;
    if (dto.foto_url !== undefined) updates.foto_url = dto.foto_url;

    let profile = null;
    if (Object.keys(updates).length > 0) {
      const { data, error } = await this.supabase
        .from('usuarios')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();

      if (error)
        throw new BadRequestException(
          `Error actualizando perfil: ${error.message}`,
        );
      profile = data;
    } else {
      // Si no hubo updates, devolvemos el actual
      const { data } = await this.supabase
        .from('usuarios')
        .select('*')
        .eq('id', userId)
        .single();
      profile = data;
    }

    return {
      message: 'Cuenta actualizada correctamente',
      user: { id: userId, email: dto.email }, // Simplificado
      profile,
    };
  }

  async deactivate(userId: string, dto: DeactivateAccountDto) {
    const { data, error } = await this.supabase
      .from('usuarios')
      .update({
        activo: false,
        desactivado_en: new Date().toISOString(),
        desactivado_motivo: dto.reason ?? null,
      })
      .eq('id', userId)
      .select()
      .single();

    if (error)
      throw new BadRequestException(`Error desactivando: ${error.message}`);
    return { ok: true, profile: data };
  }

  async reactivate(userId: string) {
    const { data, error } = await this.supabase
      .from('usuarios')
      .update({
        activo: true,
        desactivado_en: null,
        desactivado_motivo: null,
      })
      .eq('id', userId)
      .select()
      .single();

    if (error)
      throw new BadRequestException(`Error reactivando: ${error.message}`);
    return { ok: true, profile: data };
  }
}
