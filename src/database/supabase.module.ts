import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from './constants';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: SUPABASE_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        return createClient(
          config.get<string>('SUPABASE_URL')!,
          config.get<string>('SUPABASE_SERVICE_ROLE_KEY')!,
          {
            auth: {
              autoRefreshToken: false,
              persistSession: false,
            },
          },
        );
      },
    },
  ],
  exports: [SUPABASE_CLIENT],
})
export class SupabaseModule {}
