import { Inject, Injectable, BadRequestException } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../../database/constants';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class ProfileService {
  constructor(
    @Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient,
  ) {}

  async getProfile(userId: string) {
    const { data, error } = await this.supabase
      .from('usuarios')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      throw new BadRequestException(
        `Error al obtener perfil: ${error.message}`,
      );
    }
    return data;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    // build payload
    const updates: any = {};

    if (dto.nombre_completo !== undefined)
      updates.nombre_completo = dto.nombre_completo;
    if (dto.telefono_e164 !== undefined)
      updates.telefono_e164 = dto.telefono_e164;
    if (dto.pais_iso2 !== undefined) updates.pais_iso2 = dto.pais_iso2;
    if (dto.genero !== undefined) updates.genero = dto.genero;
    if (dto.foto_url !== undefined) updates.foto_url = dto.foto_url;
    // DTO does not have dni or email according to view_file result

    if (Object.keys(updates).length === 0) {
      return this.getProfile(userId);
    }

    const { data, error } = await this.supabase
      .from('usuarios')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      throw new BadRequestException(
        `Error al actualizar perfil: ${error.message}`,
      );
    }
    return data;
  }
}
