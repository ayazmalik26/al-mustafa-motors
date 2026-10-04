import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ALLOWED_IMAGE_MIME_TYPES } from './media.service.js';

/**
 * Multer configuration shared by every module that accepts image uploads.
 * Files are kept in memory (bounded by MAX_UPLOAD_MB) and validated again by MediaService.
 */
export const ImageUploadModule = MulterModule.registerAsync({
  inject: [ConfigService],
  useFactory: (config: ConfigService) => ({
    storage: memoryStorage(),
    limits: {
      fileSize: config.get<number>('MAX_UPLOAD_MB', 8) * 1024 * 1024,
      files: 12,
      fields: 40,
      fieldSize: 64 * 1024,
    },
    fileFilter: (_req, file, cb) => {
      if (!ALLOWED_IMAGE_MIME_TYPES.includes(file.mimetype)) {
        cb(new BadRequestException('Only JPEG, PNG, WebP or AVIF images are allowed'), false);
        return;
      }
      cb(null, true);
    },
  }),
});
