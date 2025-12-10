import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  private supabase;
  constructor(private cfg: ConfigService) {
    this.supabase = createClient(
      cfg.get<string>('SUPABASE_URL')!,
      cfg.get<string>('SUPABASE_ANON_KEY')!,
    );
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    console.log('canActivate!!!!');
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'];
    if (!authHeader)
      throw new UnauthorizedException('Missing Authorization header');
    const token = authHeader.replace('Bearer ', '').trim();

    const { data, error } = await this.supabase.auth.getUser(token);
    if (error || !data?.user)
      throw new UnauthorizedException('Invalid or expired token');
    request.user = data.user;
    return true;
  }
}
