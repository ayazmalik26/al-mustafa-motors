import { Logger } from '@nestjs/common';
import { v2 as cloudinary, type UploadApiOptions, type UploadApiResponse } from 'cloudinary';
import type { StorageProvider, StoredObject } from './storage.provider.js';

export interface CloudinaryCredentials {
  /** `cloudinary://<api_key>:<api_secret>@<cloud_name>` — alternative to the three separate values. */
  url?: string;
  cloudName?: string;
  apiKey?: string;
  apiSecret?: string;
}

/** The two Cloudinary uploader calls this provider needs (injectable for tests). */
export interface CloudinaryUploader {
  upload_stream(options: UploadApiOptions, callback: (error?: unknown, result?: UploadApiResponse) => void): { end(chunk: Buffer): void };
  destroy(publicId: string, options: { resource_type: 'image'; invalidate: boolean }): Promise<{ result?: string }>;
}

export function parseCloudinaryUrl(url: string): Required<Omit<CloudinaryCredentials, 'url'>> {
  const u = new URL(url);
  if (u.protocol !== 'cloudinary:' || !u.username || !u.password || !u.hostname) {
    throw new Error('CLOUDINARY_URL must look like cloudinary://<api_key>:<api_secret>@<cloud_name>');
  }
  return { apiKey: decodeURIComponent(u.username), apiSecret: decodeURIComponent(u.password), cloudName: u.hostname };
}

/**
 * Stores images in Cloudinary. Files are already resized and converted to WebP by MediaService,
 * so they are uploaded as-is under `<folder>/<key>` and served from Cloudinary's CDN.
 * The returned key is the Cloudinary public ID, which is what `delete` needs.
 */
export class CloudinaryStorageProvider implements StorageProvider {
  private readonly logger = new Logger(CloudinaryStorageProvider.name);
  private readonly uploader: CloudinaryUploader;

  constructor(
    credentials: CloudinaryCredentials,
    private readonly folder: string,
    uploader?: CloudinaryUploader,
  ) {
    if (uploader) {
      this.uploader = uploader;
      return;
    }
    const { cloudName, apiKey, apiSecret } = credentials.url ? parseCloudinaryUrl(credentials.url) : (credentials as Required<CloudinaryCredentials>);
    cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret, secure: true });
    this.uploader = cloudinary.uploader as unknown as CloudinaryUploader;
  }

  async put(key: string, body: Buffer, _contentType?: string): Promise<StoredObject> {
    const publicId = [this.folder, key.replace(/\.[a-z0-9]+$/i, '')].filter(Boolean).join('/');
    const result = await new Promise<UploadApiResponse>((resolve, reject) => {
      const stream = this.uploader.upload_stream(
        { public_id: publicId, resource_type: 'image', overwrite: false, unique_filename: false },
        (error, uploaded) => (error || !uploaded ? reject(error ?? new Error('Cloudinary upload failed')) : resolve(uploaded)),
      );
      stream.end(body);
    });
    return { key: result.public_id, url: result.secure_url };
  }

  async delete(key: string): Promise<void> {
    try {
      await this.uploader.destroy(key, { resource_type: 'image', invalidate: true });
    } catch (err) {
      this.logger.warn(`Could not delete ${key} from Cloudinary: ${(err as Error).message}`);
    }
  }
}
