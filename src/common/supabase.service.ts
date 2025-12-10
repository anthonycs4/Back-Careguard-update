// ❌ BORRA esta línea
// import fetch, { RequestInit } from 'node-fetch';

// ✅ Deja así:
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SupabaseService {
  private rest: string;
  private anon: string;
  private service: string;

  constructor(private config: ConfigService) {
    this.rest = this.config.get<string>('SUPABASE_REST_URL')!;
    this.anon = this.config.get<string>('SUPABASE_ANON_KEY')!;
    this.service = this.config.get<string>('SUPABASE_SERVICE_ROLE_KEY')!;
  }

  async asUser(userToken: string, path: string, init: RequestInit = {}) {
    const res = await fetch(`${this.rest}${path}`, {
      ...init,
      headers: {
        apikey: this.anon,
        Authorization: `Bearer ${userToken}`,
        'Content-Type': 'application/json',
        ...(init.headers || {}),
      },
    });
    return res;
  }

  async asService(path: string, init: RequestInit = {}) {
    const res = await fetch(`${this.rest}${path}`, {
      ...init,
      headers: {
        apikey: this.service,
        Authorization: `Bearer ${this.service}`,
        'Content-Type': 'application/json',
        ...(init.headers || {}),
      },
    });
    return res;
  }
}
