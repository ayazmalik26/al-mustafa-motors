import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { Paginated } from '../../common/http/api-response.js';
import { pageParams } from '../../common/dto/pagination-query.dto.js';
import { normalizePhone, phoneSearchFragment } from '../../common/utils/phone.js';
import type { Prisma } from '../../generated/prisma/client.js';
import { MediaService, type StoredImage, type UploadedImageFile } from '../storage/media.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { CreateSellRequestDto, QuerySellRequestsDto, UpdateSellRequestDto } from './dto/sell-request.dto.js';

const PUBLIC_IMAGE = { select: { id: true, url: true, thumbUrl: true, createdAt: true } } as const;

@Injectable()
export class SellRequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly media: MediaService,
    private readonly notifications: NotificationsService,
  ) {}

  async create(dto: CreateSellRequestDto, files: UploadedImageFile[] = []) {
    const { website: _honeypot, ...fields } = dto;
    const created = await this.prisma.sellRequest.create({ data: { ...fields, phone: normalizePhone(fields.phone) } });

    const stored: StoredImage[] = [];
    try {
      for (const file of files.slice(0, 6)) {
        stored.push(await this.media.storeImage(`sell-requests/${created.id}`, file, { large: 1600, thumb: 480 }));
      }
    } catch (err) {
      // Roll back so a bad photo does not leave a half-saved request.
      await this.media.remove(stored.flatMap((s) => s.storageKeys));
      await this.prisma.sellRequest.delete({ where: { id: created.id } });
      throw err;
    }
    if (stored.length) {
      await this.prisma.sellRequestImage.createMany({
        data: stored.map((s) => ({ sellRequestId: created.id, url: s.url, thumbUrl: s.thumbUrl, storageKeys: s.storageKeys })),
      });
    }

    this.notifications.notify({
      type: 'sell-request',
      id: created.id,
      name: created.name,
      phone: created.phone,
      vehicle: `${created.vehicleMake} ${created.vehicleModel} ${created.vehicleYear}`,
      intent: created.intent,
    });

    return { id: created.id, status: created.status, intent: created.intent, createdAt: created.createdAt, imageCount: stored.length };
  }

  async list(query: QuerySellRequestsDto) {
    const { page, pageSize, skip, take } = pageParams(query, 20);
    const where: Prisma.SellRequestWhereInput = {
      ...(query.status && { status: query.status }),
      ...(query.intent && { intent: query.intent }),
      ...(query.q && {
        OR: [
          { name: { contains: query.q, mode: 'insensitive' } },
          ...(phoneSearchFragment(query.q) ? [{ phone: { contains: phoneSearchFragment(query.q)! } }] : []),
          { vehicleMake: { contains: query.q, mode: 'insensitive' } },
          { vehicleModel: { contains: query.q, mode: 'insensitive' } },
        ],
      }),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.sellRequest.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take, include: { images: PUBLIC_IMAGE } }),
      this.prisma.sellRequest.count({ where }),
    ]);
    return Paginated.of(items, total, page, pageSize);
  }

  async findOne(id: string) {
    const request = await this.prisma.sellRequest.findUnique({ where: { id }, include: { images: PUBLIC_IMAGE } });
    if (!request) throw new NotFoundException('Sell request not found');
    return request;
  }

  async update(id: string, dto: UpdateSellRequestDto) {
    await this.findOne(id);
    return this.prisma.sellRequest.update({ where: { id }, data: dto, include: { images: PUBLIC_IMAGE } });
  }
}
