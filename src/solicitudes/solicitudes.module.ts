import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SolicitudesController } from './solicitudes.controller';

@Module({
  imports: [ConfigModule],
  controllers: [SolicitudesController],
})
export class SolicitudesModule {}
