import { Body, Controller, Get, Patch, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Public, Roles } from '../../common/decorators/auth.decorators.js';
import { Role } from '../../generated/prisma/enums.js';
import type { UploadedImageFile } from '../storage/media.service.js';
import { UpdateSettingsDto } from './dto/update-settings.dto.js';
import { SettingsService } from './settings.service.js';

@Controller('settings')
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Public()
  @Get()
  get() {
    return this.settings.get();
  }

  @Roles(Role.ADMIN)
  @Patch()
  update(@Body() dto: UpdateSettingsDto) {
    return this.settings.update(dto);
  }

  @Roles(Role.ADMIN)
  @Post('hero-image')
  @UseInterceptors(FileInterceptor('image'))
  uploadHero(@UploadedFile() file?: UploadedImageFile) {
    return this.settings.uploadHeroImage(file);
  }
}
