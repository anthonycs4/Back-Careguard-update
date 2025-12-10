import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { configSchema } from './config/config.schema';
import { SupabaseModule } from './database/supabase.module';
import { HealthModule } from './modules/health/health.module';
import { ProfileModule } from './modules/profile/profile.module';
import { StorageModule } from './modules/storage/storage.module';
import { UsuariosModule } from './modules/users/usuarios.module';
import { AuthModule } from './modules/auth/auth.module';
import { ServiceRequestsModule } from './modules/service-requests/service-requests.module';
import { CaregiversModule } from './modules/caregivers/caregivers.module';
import { ApplicationsModule } from './modules/applications/applications.module';
import { SesionesModule } from './modules/sessions/sesiones.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validationSchema: configSchema }),
    SupabaseModule,
    HealthModule,
    ProfileModule,
    StorageModule,
    UsuariosModule,
    AuthModule,
    ServiceRequestsModule,
    CaregiversModule,
    ApplicationsModule,
    SesionesModule,
  ],
})
export class AppModule {}
