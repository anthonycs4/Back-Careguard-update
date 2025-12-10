import { Body, Controller, Get, Put, Req, UseGuards } from '@nestjs/common';
import { SupabaseAuthGuard } from '../common/supabase-auth.guard';
import { SupabaseService } from '../common/supabase.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { parseOrThrow } from '../common/types';

@UseGuards(SupabaseAuthGuard)
@Controller('profile')
export class ProfileController {
  constructor(private sb: SupabaseService) {}

  @Get('me')
  async me(@Req() req) {
    const { userToken, user } = req;
    const r = await this.sb.asUser(
      userToken,
      `/usuarios?select=*&id=eq.${user.sub}`,
    );
    const data = await parseOrThrow(r);
    // PostgREST devuelve array si no usas single()
    return Array.isArray(data) ? data[0] : data;
  }

  @Put()
  async update(@Req() req, @Body() dto: UpdateProfileDto) {
    const { userToken, user } = req;
    const r = await this.sb.asUser(userToken, `/usuarios?id=eq.${user.sub}`, {
      method: 'PATCH',
      body: JSON.stringify(dto),
    });
    return parseOrThrow(r);
  }
}
