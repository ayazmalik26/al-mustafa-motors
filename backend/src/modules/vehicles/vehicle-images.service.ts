import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { MediaService, type UploadedImageFile } from '../storage/media.service.js';
import { sortImages, vehicleTitle } from './vehicle.mapper.js';
import type { UpdateImageDto } from './dto/vehicle.dto.js';

const MAX_IMAGES_PER_VEHICLE = 30;

@Injectable()
export class VehicleImagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly media: MediaService,
  ) {}

  async list(vehicleId: string) {
    const images = await this.prisma.vehicleImage.findMany({ where: { vehicleId }, orderBy: { sortOrder: 'asc' } });
    return images.map(({ storageKeys: _keys, ...img }) => img);
  }

  async upload(vehicleId: string, files: UploadedImageFile[]) {
    if (!files?.length) throw new BadRequestException('Choose at least one image to upload');
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id: vehicleId },
      include: { images: { select: { sortOrder: true, isPrimary: true } } },
    });
    if (!vehicle) throw new NotFoundException('Vehicle not found');
    if (vehicle.images.length + files.length > MAX_IMAGES_PER_VEHICLE) {
      throw new BadRequestException(`A vehicle can have at most ${MAX_IMAGES_PER_VEHICLE} images`);
    }

    // Process everything first so a bad file does not leave a half-finished upload behind.
    const stored = [];
    try {
      for (const file of files) stored.push(await this.media.storeImage(`vehicles/${vehicleId}`, file));
    } catch (err) {
      await this.media.remove(stored.flatMap((s) => s.storageKeys));
      throw err;
    }

    let nextOrder = vehicle.images.reduce((max, img) => Math.max(max, img.sortOrder + 1), 0);
    const hasPrimary = vehicle.images.some((img) => img.isPrimary);
    const title = `${vehicleTitle(vehicle)} ${vehicle.year}`;

    await this.prisma.vehicleImage.createMany({
      data: stored.map((s, i) => ({
        vehicleId,
        ...s,
        alt: `${title} — photo ${nextOrder + 1}`,
        sortOrder: nextOrder++,
        isPrimary: !hasPrimary && i === 0,
      })),
    });
    await this.touch(vehicleId);
    return this.list(vehicleId);
  }

  async reorder(vehicleId: string, imageIds: string[]) {
    const images = await this.prisma.vehicleImage.findMany({ where: { vehicleId }, select: { id: true } });
    const existing = new Set(images.map((i) => i.id));
    if (imageIds.length !== existing.size || new Set(imageIds).size !== imageIds.length || imageIds.some((id) => !existing.has(id))) {
      throw new BadRequestException('imageIds must list every image of this vehicle exactly once');
    }
    await this.prisma.$transaction(
      imageIds.map((id, index) => this.prisma.vehicleImage.update({ where: { id }, data: { sortOrder: index } })),
    );
    await this.touch(vehicleId);
    return this.list(vehicleId);
  }

  async update(vehicleId: string, imageId: string, dto: UpdateImageDto) {
    await this.findImage(vehicleId, imageId);
    await this.prisma.$transaction(async (tx) => {
      if (dto.isPrimary) {
        await tx.vehicleImage.updateMany({ where: { vehicleId }, data: { isPrimary: false } });
      }
      await tx.vehicleImage.update({
        where: { id: imageId },
        data: {
          ...(dto.alt !== undefined && { alt: dto.alt }),
          ...(dto.isPrimary && { isPrimary: true }),
        },
      });
    });
    await this.touch(vehicleId);
    return this.list(vehicleId);
  }

  async remove(vehicleId: string, imageId: string) {
    const image = await this.findImage(vehicleId, imageId);
    await this.prisma.vehicleImage.delete({ where: { id: imageId } });
    await this.media.remove(image.storageKeys);

    if (image.isPrimary) {
      const remaining = sortImages(await this.prisma.vehicleImage.findMany({ where: { vehicleId } }));
      if (remaining[0]) await this.prisma.vehicleImage.update({ where: { id: remaining[0].id }, data: { isPrimary: true } });
    }
    await this.touch(vehicleId);
    return this.list(vehicleId);
  }

  private async findImage(vehicleId: string, imageId: string) {
    const image = await this.prisma.vehicleImage.findFirst({ where: { id: imageId, vehicleId } });
    if (!image) throw new NotFoundException('Image not found');
    return image;
  }

  /** Bumps updatedAt so caches/sitemaps see the change. */
  private touch(vehicleId: string) {
    return this.prisma.vehicle.update({ where: { id: vehicleId }, data: { updatedAt: new Date() } });
  }
}
