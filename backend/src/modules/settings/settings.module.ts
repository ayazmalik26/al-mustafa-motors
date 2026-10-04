import { Module } from '@nestjs/common';
import { ImageUploadModule } from '../storage/upload.config.js';
import { SettingsController } from './settings.controller.js';
import { SettingsService } from './settings.service.js';

@Module({
  imports: [ImageUploadModule],
  controllers: [SettingsController],
  providers: [SettingsService],
  exports: [SettingsService],
})
export class SettingsModule {}
