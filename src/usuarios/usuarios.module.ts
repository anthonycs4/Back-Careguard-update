import { Module } from '@nestjs/common';
import { UsuariosService } from './usuarios.service';
import { UsuariosController } from './usuarios.controller';
import { SupabaseService } from '../common/supabase.service';

@Module({
  controllers: [UsuariosController],
  providers: [UsuariosService, SupabaseService],
})
export class UsuariosModule {}
