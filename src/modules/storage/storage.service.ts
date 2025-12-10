// src/storage/storage.service.ts
import { Inject, Injectable, BadRequestException } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { v4 as uuid } from 'uuid';
import { Express } from 'express';

@Injectable()
export class StorageService {
  constructor(@Inject('SB_ADMIN') private readonly sb: SupabaseClient) {}

  // --- helper genérico ---
  private async uploadInternal(
    bucket: string,
    path: string,
    file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    const { error } = await this.sb.storage
      .from(bucket)
      .upload(path, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (error) {
      throw new BadRequestException(error.message);
    }

    const { data: pub } = this.sb.storage.from(bucket).getPublicUrl(path);

    return {
      bucket,
      path,
      publicUrl: pub.publicUrl,
    };
  }

  // --- 1) Avatar: avatars/{userId}/{uuid}.{ext} ---
  async uploadAvatar(userId: string, file: Express.Multer.File) {
    const ext = file.originalname.split('.').pop() || 'jpg';
    const fileName = `${uuid()}.${ext}`;
    const path = `avatars/${userId}/${fileName}`;
    return this.uploadInternal('avatars', path, file);
  }

  // --- 2) Imagen para solicitud/postulación ---
  // path: requests/{requestId}/{uuid}.{ext}
  // --- REQUEST IMAGES: guarda también en BD ---
  async uploadRequestImage(
    requestId: string,
    file: Express.Multer.File,
    sujetoIndex?: number | null,
  ) {
    if (!requestId) {
      throw new BadRequestException('requestId is required');
    }

    const ext = file.originalname.split('.').pop() || 'jpg';
    const fileName = `${uuid()}.${ext}`;
    const path = `${requestId}/${fileName}`; // 👈 carpeta por solicitud

    const upload = await this.uploadInternal('requests', path, file);

    // Guardar registro en tabla solicitud_imagenes
    const { data, error } = await this.sb
      .from('solicitud_imagenes')
      .insert({
        solicitud_id: requestId,
        sujeto_index: sujetoIndex ?? null,
        bucket: upload.bucket,
        path: upload.path,
        url: upload.publicUrl,
      })
      .select()
      .single();

    if (error) {
      throw new BadRequestException(error.message);
    }

    return data; // devuelves el registro completo
  }
  // --- 3) Imagen para sesión ---
  // path: sessions/{sessionId}/{uuid}.{ext}
  async uploadSessionImage(sessionId: string, file: Express.Multer.File) {
    if (!sessionId) {
      throw new BadRequestException('sessionId is required');
    }
    const ext = file.originalname.split('.').pop() || 'jpg';
    const fileName = `${uuid()}.${ext}`;
    const path = `sessions/${sessionId}/${fileName}`;
    return this.uploadInternal('sessions', path, file);
  }
}
