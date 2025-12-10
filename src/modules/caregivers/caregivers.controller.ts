import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Req,
  UseGuards,
  UsePipes,
  ValidationPipe,
  BadRequestException,
} from '@nestjs/common';
import { SupabaseAuthGuard } from '../../guards/supabase-auth.guard';
import { UpdateCuidadorDto } from './dto/update-cuidador.dto';
import { CaregiversService } from './caregivers.service';

@Controller('caregivers')
@UseGuards(SupabaseAuthGuard)
export class CaregiversController {
  constructor(private readonly service: CaregiversService) {}

  // A) Ver MI perfil (privado)
  @Get('me')
  async me(@Req() req: any) {
    const userId = (req.userId ?? req.user?.id) as string;
    if (!userId) throw new BadRequestException('Token inválido');

    return this.service.getMyProfile(userId);
  }

  // B) Ver perfil PÚBLICO por usuario_id (para familias)
  @Get(':id')
  async publicById(@Param('id') id: string) {
    return this.service.getPublicProfile(id);
  }

  // C) Actualizar MI perfil (bio, años, tarifa)
  @Patch('me')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async updateMe(@Req() req: any, @Body() dto: UpdateCuidadorDto) {
    const userId = (req.userId ?? req.user?.id) as string;
    if (!userId) throw new BadRequestException('Token inválido');

    return this.service.updateMyProfile(userId, dto);
  }
}
