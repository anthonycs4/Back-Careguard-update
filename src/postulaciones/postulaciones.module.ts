// src/postulaciones/postulaciones.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PostulacionesController } from './postulaciones.controller';

@Module({
  imports: [ConfigModule],
  controllers: [PostulacionesController],
})
export class PostulacionesModule {}
