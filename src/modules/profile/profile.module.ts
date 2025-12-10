import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../../database/constants';
import { ProfileController } from './profile.controller';
import { ProfileService } from './profile.service';

@Module({
  imports: [ConfigModule],
  controllers: [ProfileController],
  providers: [
    ProfileService,
    {
      provide: SUPABASE_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        return createClient(
          config.get<string>('SUPABASE_URL')!,
          config.get<string>('SUPABASE_SERVICE_ROLE_KEY')!,
        );
      },
    },
  ],
  exports: [ProfileService],
})
export class ProfileModule {}
