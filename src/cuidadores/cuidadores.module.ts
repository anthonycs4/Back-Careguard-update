// src/cuidadores/cuidadores.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CuidadoresController } from './cuidadores.controller';

@Module({
  imports: [ConfigModule],
  controllers: [CuidadoresController],
})
export class CuidadoresModule {}
