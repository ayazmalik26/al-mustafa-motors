import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { resolve } from 'node:path';
import type { StorageDriver } from '../../config/env.validation.js';
import { CloudinaryStorageProvider } from './cloudinary-storage.provider.js';
import { LocalStorageProvider } from './local-storage.provider.js';
import { MediaService } from './media.service.js';
import { STORAGE_PROVIDER, type StorageProvider } from './storage.provider.js';

@Global()
@Module({
  providers: [
    {
      provide: STORAGE_PROVIDER,
      inject: [ConfigService],
      useFactory: (config: ConfigService): StorageProvider => {
        // Add new drivers here (e.g. 's3' → new S3StorageProvider(...)) and allow them in env.validation.ts.
        const driver = config.get<StorageDriver>('STORAGE_DRIVER', 'local');
        switch (driver) {
          case 'cloudinary':
            return new CloudinaryStorageProvider(
              {
                url: config.get<string>('CLOUDINARY_URL'),
                cloudName: config.get<string>('CLOUDINARY_CLOUD_NAME'),
                apiKey: config.get<string>('CLOUDINARY_API_KEY'),
                apiSecret: config.get<string>('CLOUDINARY_API_SECRET'),
              },
              config.get<string>('CLOUDINARY_FOLDER', 'al-mustafa-motors'),
            );
          case 'local':
          default:
            return new LocalStorageProvider(
              resolve(process.cwd(), config.get<string>('UPLOAD_DIR', 'uploads')),
              config.get<string>('PUBLIC_UPLOAD_BASE_URL', '/uploads'),
            );
        }
      },
    },
    MediaService,
  ],
  exports: [STORAGE_PROVIDER, MediaService],
})
export class StorageModule {}
