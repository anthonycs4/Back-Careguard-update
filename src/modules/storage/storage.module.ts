// src/storage/storage.module.ts
import { Module } from '@nestjs/common';
import { StorageController } from './storage.controller';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { createClient } from '@supabase/supabase-js';
import { StorageService } from './storage.service';

@Module({
  imports: [ConfigModule],
  controllers: [StorageController],
  providers: [
    StorageService,
    {
      provide: 'SB_ADMIN',
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) =>
        createClient(
          cfg.get<string>('SUPABASE_URL')!,
          cfg.get<string>('SUPABASE_SERVICE_ROLE_KEY')!,
        ),
    },
  ],
})
export class StorageModule {}
