// src/sesiones/sesiones.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SesionesController } from './sesiones.controller';

@Module({
  imports: [ConfigModule],
  controllers: [SesionesController],
})
export class SesionesModule {}
