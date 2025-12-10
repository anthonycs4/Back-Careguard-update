// src/storage/storage.controller.ts
import {
  Body,
  BadRequestException,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { SupabaseAuthGuard } from '../../guards/supabase-auth.guard';
import { Inject } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { StorageService } from './storage.service';

import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Express } from 'express';

@UseGuards(SupabaseAuthGuard)
@Controller('storage')
export class StorageController {
  constructor(
    @Inject('SB_ADMIN') private sb: SupabaseClient,
    private readonly storageService: StorageService,
  ) {}

  // ---------- 1) Avatar ----------

  @Post('avatar')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  async uploadAvatar(@Req() req, @UploadedFile() file: any) {
    console.log('REQ USER =>', req.user);
    const userId = req.user.id as string; // 👈 AQUÍ EL CAMBIO
    console.log('USER ID =>', userId);
    return this.storageService.uploadAvatar(userId, file);
  }

  // ---------- 2) Imagen de solicitud/postulación ----------

  @Post('request-image')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  async uploadRequestImage(
    @UploadedFile() file: any,
    @Body('requestId') requestId: string,
    @Body('sujetoIndex') sujetoIndexRaw?: string,
  ) {
    console.log('BODY =>', requestId, sujetoIndexRaw); // solo para probar

    const sujetoIndex = sujetoIndexRaw ? Number(sujetoIndexRaw) : null;

    return this.storageService.uploadRequestImage(requestId, file, sujetoIndex);
  }

  // ---------- 3) Imagen de sesión ----------

  @Post('session-image')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  async uploadSessionImage(@Req() req, @UploadedFile() file: any) {
    const sessionId =
      (req.body.sessionId as string) || (req.query.sessionId as string);

    return this.storageService.uploadSessionImage(sessionId, file);
  }

  // ---------- Lo que ya tenías ----------

  @Get('sign-avatar-upload')
  async signAvatarUpload(@Req() req, @Query('filename') filename: string) {
    const userId = req.user.sub as string;
    const path = `avatars/${userId}/${Date.now()}_${filename}`;
    return { path, bucket: 'avatars' };
  }

  @Get('signed-url')
  async signedUrl(
    @Query('bucket') bucket: string,
    @Query('path') path: string,
  ) {
    const { data, error } = await this.sb.storage
      .from(bucket)
      .createSignedUrl(path, 60 * 10);

    if (error) throw new BadRequestException(error.message);
    return data;
  }
}
