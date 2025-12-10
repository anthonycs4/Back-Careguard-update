import {
  Inject,
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../../database/constants';
import { UpdateCuidadorDto } from './dto/update-cuidador.dto';

@Injectable()
export class CaregiversService {
  constructor(
    @Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient,
  ) {}

  async getMyProfile(userId: string) {
    // Obtenemos perfil de cuidador y datos de usuario
    const { data, error } = await this.supabase
      .from('cuidadores')
      .select('*, usuario:usuarios!cuidadores_usuario_id_fkey(*)')
      .eq('usuario_id', userId)
      .single();

    if (error || !data) {
      throw new BadRequestException('Aún no tienes perfil de cuidador');
    }

    return data;
  }

  async getPublicProfile(id: string) {
    const select =
      'usuario_id, bio, anios_experiencia, horas_acumuladas, rating_promedio, tipos_servicio, tarifa_hora, usuario:usuarios!cuidadores_usuario_id_fkey(nombre_completo, foto_url)';

    const { data, error } = await this.supabase
      .from('cuidadores')
      .select(select)
      .eq('usuario_id', id)
      .single();

    if (error || !data) {
      throw new NotFoundException('Cuidador no encontrado');
    }

    return data;
  }

  async updateMyProfile(userId: string, dto: UpdateCuidadorDto) {
    // Verificar existencia
    const { count, error: countError } = await this.supabase
      .from('cuidadores')
      .select('*', { count: 'exact', head: true })
      .eq('usuario_id', userId);

    if (countError || count === 0) {
      throw new BadRequestException('Aún no tienes perfil de cuidador');
    }

    // Construir update payload
    const updates: any = {};
    if (dto.bio !== undefined) updates.bio = dto.bio;
    if (dto.anios_experiencia !== undefined)
      updates.anios_experiencia = dto.anios_experiencia;
    if (dto.tarifa_hora !== undefined) updates.tarifa_hora = dto.tarifa_hora;

    const { data, error } = await this.supabase
      .from('cuidadores')
      .update(updates)
      .eq('usuario_id', userId)
      .select()
      .single();

    if (error) {
      throw new BadRequestException(
        `Error actualizando perfil: ${error.message}`,
      );
    }

    return { message: 'Perfil actualizado', cuidador: data };
  }
}
