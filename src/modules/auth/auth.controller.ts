import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Put,
  Req,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { SupabaseAuthGuard } from '../../guards/supabase-auth.guard';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import { DeactivateAccountDto } from './dto/deactivate-account.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @UseGuards(SupabaseAuthGuard)
  @Put('me')
  async updateAccount(@Req() req: any, @Body() dto: UpdateAccountDto) {
    const userId = (req.userId ?? req.user?.id ?? req.user?.sub) as string;
    if (!userId || !/^[0-9a-fA-F-]{36}$/.test(userId)) {
      throw new BadRequestException('User id inválido o ausente en el token');
    }
    return this.authService.updateAccount(userId, dto);
  }

  @UseGuards(SupabaseAuthGuard)
  @Put('me/deactivate')
  async deactivateMe(@Req() req: any, @Body() dto: DeactivateAccountDto) {
    const userId = (req.userId ?? req.user?.id ?? req.user?.sub) as string;
    if (!userId) {
      throw new BadRequestException('User id inválido');
    }
    return this.authService.deactivate(userId, dto);
  }

  @UseGuards(SupabaseAuthGuard)
  @Put('me/reactivate')
  async reactivateMe(@Req() req: any) {
    const userId = (req.userId ?? req.user?.id ?? req.user?.sub) as string;
    if (!userId) {
      throw new BadRequestException('User id inválido');
    }
    return this.authService.reactivate(userId);
  }
}
