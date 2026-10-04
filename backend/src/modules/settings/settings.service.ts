import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service.js';
import { normalizePhone } from '../../common/utils/phone.js';
import type { Setting } from '../../generated/prisma/client.js';
import { MediaService, type UploadedImageFile } from '../storage/media.service.js';
import { UpdateSettingsDto } from './dto/update-settings.dto.js';

export type PublicSettings = Setting & { siteUrl: string; mapEmbedUrl: string };

/** Google Maps embed URL built from coordinates when set, otherwise from the address. No API key required. */
export function buildMapEmbedUrl(s: Pick<Setting, 'latitude' | 'longitude' | 'address' | 'businessName'>): string {
  const query =
    s.latitude != null && s.longitude != null ? `${s.latitude},${s.longitude}` : `${s.businessName}, ${s.address}`;
  return `https://www.google.com/maps?q=${encodeURIComponent(query)}&z=16&output=embed`;
}

@Injectable()
export class SettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly media: MediaService,
  ) {}

  async get(): Promise<PublicSettings> {
    const settings = await this.prisma.setting.findUnique({ where: { id: 1 } });
    if (!settings) throw new NotFoundException('Business settings have not been configured. Run the database seed.');
    return this.toPublic(settings);
  }

  async update(dto: UpdateSettingsDto): Promise<PublicSettings> {
    const data = { ...dto };
    if (data.phone) data.phone = normalizePhone(data.phone);
    if (data.whatsapp) data.whatsapp = normalizePhone(data.whatsapp);
    const settings = await this.prisma.setting.update({ where: { id: 1 }, data });
    return this.toPublic(settings);
  }

  async uploadHeroImage(file: UploadedImageFile | undefined): Promise<PublicSettings> {
    if (!file) throw new BadRequestException('Choose an image to upload');
    const stored = await this.media.storeImage('site', file, { large: 2400, thumb: 960 });
    return this.update({ heroImageUrl: stored.url });
  }

  private toPublic(settings: Setting): PublicSettings {
    return {
      ...settings,
      siteUrl: this.config.get<string>('FRONTEND_URL', 'http://localhost:4200'),
      mapEmbedUrl: buildMapEmbedUrl(settings),
    };
  }
}
