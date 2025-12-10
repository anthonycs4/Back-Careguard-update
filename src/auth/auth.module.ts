import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { createClient } from '@supabase/supabase-js';

@Module({
  imports: [ConfigModule],
  controllers: [AuthController],
  providers: [
    {
      provide: 'SB_ADMIN',
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) =>
        createClient(
          cfg.get<string>('SUPABASE_URL')!,
          cfg.get<string>('SUPABASE_SERVICE_ROLE_KEY')!, // ⚠️ solo backend
        ),
    },
  ],
})
export class AuthModule {}
