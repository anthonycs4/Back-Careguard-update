import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { createClient } from '@supabase/supabase-js';

import { AuthService } from './auth.service';

@Module({
  imports: [ConfigModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    {
      provide: 'SB_ADMIN',
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        return createClient(
          config.get<string>('SUPABASE_URL')!,
          config.get<string>('SUPABASE_SERVICE_ROLE_KEY')!,
        );
      },
    },
  ],
  exports: ['SB_ADMIN', AuthService],
})
export class AuthModule {}
