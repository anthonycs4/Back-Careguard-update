import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { configSchema } from './common/config.schema';
import { HealthModule } from './health/health.module';
import { ProfileModule } from './profile/profile.module';
import { StorageModule } from './storage/storage.module';
import { UsuariosModule } from './usuarios/usuarios.module';
import { AuthModule } from './auth/auth.module';
import { SolicitudesModule } from './solicitudes/solicitudes.module';
import { CuidadoresModule } from './cuidadores/cuidadores.module';
import { PostulacionesModule } from './postulaciones/postulaciones.module';
import { SesionesModule } from './sesiones/sesiones.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validationSchema: configSchema }),
    HealthModule,
    ProfileModule,
    StorageModule,
    UsuariosModule,
    AuthModule,
    SolicitudesModule,
    CuidadoresModule,
    PostulacionesModule,
    SesionesModule,
  ],
})
export class AppModule {}
