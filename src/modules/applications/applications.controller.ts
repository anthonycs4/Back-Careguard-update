import {
  Body,
  Controller,
  Post,
  Get,
  Req,
  UseGuards,
  UsePipes,
  Param,
  ValidationPipe,
  BadRequestException,
} from '@nestjs/common';
import { SupabaseAuthGuard } from '../../guards/supabase-auth.guard';
import { CreatePostulacionDto } from './dto/create-postulacion.dto';
import { AceptarPostulacionDto } from './dto/aceptar.dto';
import { ApplicationsService } from './applications.service';

@Controller('applications')
@UseGuards(SupabaseAuthGuard)
export class ApplicationsController {
  constructor(private readonly service: ApplicationsService) {}

  // CREATE application
  @Post()
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async crear(@Req() req: any, @Body() dto: CreatePostulacionDto) {
    const userId = (req.userId ?? req.user?.id) as string;
    if (!userId) throw new BadRequestException('Token inválido');
    return this.service.crear(userId, dto);
  }

  // GET applications by request ID
  @Get('request/:id')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async getBySolicitud(@Req() req: any, @Param('id') solicitudId: string) {
    const userId = (req.userId ?? req.user?.id) as string;
    if (!userId) throw new BadRequestException('Token inválido');
    return this.service.getBySolicitud(userId, solicitudId);
  }

  // ACCEPT application (final match)
  @Post(':postulacionId/accept')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async aceptar(
    @Req() req: any,
    @Param('postulacionId') postulacionId: string,
    @Body() body: AceptarPostulacionDto,
  ) {
    const actorId = (req.userId ?? req.user?.id) as string;
    if (!actorId) throw new BadRequestException('Token inválido');
    return this.service.aceptar(actorId, postulacionId, body);
  }
}
