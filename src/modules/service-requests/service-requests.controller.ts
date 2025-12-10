import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { SupabaseAuthGuard } from '../../guards/supabase-auth.guard';
import { ServiceRequestsService } from './service-requests.service';
import { CreateSolicitudBaseDto } from './dto/create-base.dto';
import { CreateGrandparentsPayloadDto } from './dto/create-grandparents.dto';
import { CreateChildrenPayloadDto } from './dto/create-children.dto';

@Controller('service-requests')
@UseGuards(SupabaseAuthGuard)
export class ServiceRequestsController {
  constructor(
    private readonly serviceRequestsService: ServiceRequestsService,
  ) {}

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

  @Post('children')
  async createChildren(
    @Req() req: any,
    @Body()
    body: { base: CreateSolicitudBaseDto; payload: CreateChildrenPayloadDto },
  ) {
    const userId = (req.userId ?? req.user?.id) as string;
    return this.serviceRequestsService.createChildren(userId, body);
  }

  @Get()
  async listMine(@Req() req: any, @Query('type') type?: string) {
    const userId = (req.userId ?? req.user?.id) as string;
    return this.serviceRequestsService.listMine(userId, type);
  }
}
