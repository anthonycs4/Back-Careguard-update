import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { SupabaseAuthGuard } from '../../guards/supabase-auth.guard';
import { ServiceRequestsService } from './service-requests.service';
import { CreateSolicitudBaseDto } from './dto/create-base.dto';
import { CreateGrandparentsPayloadDto } from './dto/create-grandparents.dto';
import { CreateChildrenPayloadDto } from './dto/create-children.dto';
import { CreateMascotasPayloadDto } from './dto/create-pets.dto';
import { GetAbiertasQueryDto } from './dto/get-open-requests.dto';
import { GetMiasQueryDto } from './dto/get-my-requests.dto';


@Controller('service-requests') // /api/service-requests
@UseGuards(SupabaseAuthGuard)
export class ServiceRequestsController {
  constructor(
    private readonly serviceRequestsService: ServiceRequestsService,
  ) {}

  // POST /api/service-requests/grandparents
  @Post('grandparents')
  async createGrandparents(
    @Req() req: any,
    @Body()
    body: {
      base: CreateSolicitudBaseDto;
      payload: CreateGrandparentsPayloadDto;
    },
  ) {
    const userId = (req.userId ?? req.user?.id) as string;
    return this.serviceRequestsService.createGrandparents(userId, body);
  }

  // POST /api/service-requests/children
  @Post('children')
  async createChildren(
    @Req() req: any,
    @Body()
    body: { base: CreateSolicitudBaseDto; payload: CreateChildrenPayloadDto },
  ) {
    const userId = (req.userId ?? req.user?.id) as string;
    return this.serviceRequestsService.createChildren(userId, body);
  }

  // POST /api/service-requests/pets  (antes /solicitudes/mascotas)
  @Post('pets')
  async createPets(
    @Req() req: any,
    @Body()
    body: { base: CreateSolicitudBaseDto; payload: CreatePetsPayloadDto },
  ) {
    const userId = (req.userId ?? req.user?.id) as string;
    return this.serviceRequestsService.createPets(userId, body);
  }

  // GET /api/service-requests?type=ABUELOS|NINIOS|MASCOTAS
  // Equivale a tu antiguo GET /solicitudes
  @Get()
  async listMine(@Req() req: any, @Query('type') type?: string) {
    const userId = (req.userId ?? req.user?.id) as string;
    return this.serviceRequestsService.listMine(userId, type);
  }

  // GET /api/service-requests/open → antes: /solicitudes/abiertas
  @Get('open')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async listOpen(@Req() req: any, @Query() q: GetAbiertasQueryDto) {
    const userId = (req.userId ?? req.user?.id) as string;
    return this.serviceRequestsService.listOpenForCaregiver(userId, q);
  }

  // GET /api/service-requests/mine → antes: /solicitudes/mias
  @Get('mine')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async mine(@Req() req: any, @Query() q: GetMiasQueryDto) {
    const userId = (req.userId ?? req.user?.id) as string;
    return this.serviceRequestsService.listMinePaged(userId, q);
  }

  // GET /api/service-requests/mine/by-status → antes: /solicitudes/mias/por-estado
  @Get('mine/by-status')
  async mineByStatus(@Req() req: any) {
    const userId = (req.userId ?? req.user?.id) as string;
    return this.serviceRequestsService.listMineGroupedByStatus(userId);
  }

  // GET /api/service-requests/:id → antes: /solicitudes/:id
  @Get(':id')
  async getOne(@Param('id') id: string) {
    return this.serviceRequestsService.getById(id);
  }

  // DELETE /api/service-requests/:id → antes: DELETE /solicitudes/:id
  @Delete(':id')
  async cancel(@Param('id') id: string) {
    return this.serviceRequestsService.cancel(id);
  }
}
