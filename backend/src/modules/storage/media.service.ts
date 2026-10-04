import { BadRequestException, Inject, Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import sharp, { type Metadata } from 'sharp';
import { STORAGE_PROVIDER, type StorageProvider } from './storage.provider.js';

export const ALLOWED_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
const ALLOWED_FORMATS = new Set(['jpeg', 'png', 'webp', 'avif', 'heif']);

export interface StoredImage {
  url: string;
  thumbUrl: string;
  storageKeys: string[];
  width: number;
  height: number;
}

export interface UploadedImageFile {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  size: number;
}

/**
 * Validates and processes uploaded images, then stores them through the configured provider.
 * Every upload is decoded and re-encoded with sharp, which:
 *  - rejects files that are not real images (regardless of the declared MIME type)
 *  - applies EXIF orientation and strips metadata (including GPS location)
 *  - produces a large (≤1600px) and a thumbnail (≤640px) WebP variant for responsive images
 */
@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);

  constructor(@Inject(STORAGE_PROVIDER) private readonly storage: StorageProvider) {}

  async storeImage(folder: string, file: UploadedImageFile, opts: { large?: number; thumb?: number } = {}): Promise<StoredImage> {
    const largeWidth = opts.large ?? 1600;
    const thumbWidth = opts.thumb ?? 640;

    if (!ALLOWED_IMAGE_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException('Only JPEG, PNG, WebP or AVIF images are allowed');
    }

    let meta: Metadata;
    try {
      meta = await sharp(file.buffer, { limitInputPixels: 60_000_000 }).metadata();
    } catch {
      throw new BadRequestException(`"${file.originalname}" is not a valid image`);
    }
    if (!meta.format || !ALLOWED_FORMATS.has(meta.format)) {
      throw new BadRequestException(`"${file.originalname}" is not a supported image format`);
    }

    const base = sharp(file.buffer, { limitInputPixels: 60_000_000 }).rotate();
    const [large, thumb] = await Promise.all([
      base.clone().resize({ width: largeWidth, height: largeWidth, fit: 'inside', withoutEnlargement: true }).webp({ quality: 82 }).toBuffer({ resolveWithObject: true }),
      base.clone().resize({ width: thumbWidth, height: thumbWidth, fit: 'inside', withoutEnlargement: true }).webp({ quality: 78 }).toBuffer(),
    ]);

    const id = randomUUID();
    const largeObj = await this.storage.put(`${folder}/${id}-lg.webp`, large.data, 'image/webp');
    const thumbObj = await this.storage.put(`${folder}/${id}-sm.webp`, thumb, 'image/webp');

    return {
      url: largeObj.url,
      thumbUrl: thumbObj.url,
      storageKeys: [largeObj.key, thumbObj.key],
      width: large.info.width,
      height: large.info.height,
    };
  }

  async remove(keys: string[]): Promise<void> {
    await Promise.all(keys.map((key) => this.storage.delete(key)));
  }
}
