import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../common/supabase.service';
import { CreateUsuarioDto, UpdateUsuarioDto } from './dto';
import { parseOrThrow } from '../common/types';

@Injectable()
export class UsuariosService {
  constructor(private sb: SupabaseService) {}

  async findAll(userToken: string) {
    const res = await this.sb.asUser(userToken, '/usuarios?select=*');
    return parseOrThrow(res);
  }

  async findOne(userToken: string, id: string) {
    const res = await this.sb.asUser(
      userToken,
      `/usuarios?select=*&id=eq.${id}`,
    );
    const data = await parseOrThrow(res);
    return Array.isArray(data) ? data[0] : data;
  }

  async create(userToken: string, dto: CreateUsuarioDto) {
    const res = await this.sb.asUser(userToken, '/usuarios', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
    return parseOrThrow(res);
  }

  async update(userToken: string, id: string, dto: UpdateUsuarioDto) {
    const res = await this.sb.asUser(userToken, `/usuarios?id=eq.${id}`, {
      method: 'PATCH',
      body: JSON.stringify(dto),
    });
    return parseOrThrow(res);
  }

  async remove(userToken: string, id: string) {
    const res = await this.sb.asUser(userToken, `/usuarios?id=eq.${id}`, {
      method: 'DELETE',
    });
    return parseOrThrow(res);
  }
}
