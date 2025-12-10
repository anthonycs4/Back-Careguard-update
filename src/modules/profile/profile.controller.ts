import {
  Body,
  Controller,
  Get,
  Patch,
  Req,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { SupabaseAuthGuard } from '../../guards/supabase-auth.guard';
import { ProfileService } from './profile.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Controller('profile')
@UseGuards(SupabaseAuthGuard)
export class ProfileController {
  constructor(private readonly service: ProfileService) {}

  @Get('me')
  async getProfile(@Req() req: any) {
    const userId = (req.userId ?? req.user?.id) as string;
    if (!userId) {
      throw new BadRequestException('Usuario no autenticado');
    }
    return this.service.getProfile(userId);
  }

  @Patch('me')
  async updateProfile(@Req() req: any, @Body() dto: UpdateProfileDto) {
    const userId = (req.userId ?? req.user?.id) as string;
    if (!userId) {
      throw new BadRequestException('Usuario no autenticado');
    }
    return this.service.updateProfile(userId, dto);
  }
}
