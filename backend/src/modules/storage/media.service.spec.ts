import { BadRequestException } from '@nestjs/common';
import sharp from 'sharp';
import { MediaService } from './media.service.js';
import type { StorageProvider } from './storage.provider.js';

class MemoryStorage implements StorageProvider {
  files = new Map<string, Buffer>();
  async put(key: string, body: Buffer) {
    this.files.set(key, body);
    return { key, url: `/files/${key}` };
  }
  async delete(key: string) {
    this.files.delete(key);
  }
}

const file = (buffer: Buffer, mimetype = 'image/jpeg') => ({ buffer, mimetype, originalname: 'photo.jpg', size: buffer.length });

describe('MediaService', () => {
  it('stores a large and a thumbnail WebP variant', async () => {
    const storage = new MemoryStorage();
    const media = new MediaService(storage);
    const jpeg = await sharp({ create: { width: 3000, height: 2000, channels: 3, background: '#335544' } }).jpeg().toBuffer();

    const stored = await media.storeImage('vehicles/v1', file(jpeg));

    expect(stored.storageKeys).toHaveLength(2);
    expect(stored.url).toMatch(/^\/files\/vehicles\/v1\/.+-lg\.webp$/);
    expect(stored.thumbUrl).toMatch(/-sm\.webp$/);
    expect(stored.width).toBe(1600);
    const thumbMeta = await sharp(storage.files.get(stored.storageKeys[1])!).metadata();
    expect(thumbMeta.format).toBe('webp');
    expect(thumbMeta.width).toBe(640);
  });

  it('rejects files that are not real images even with an image MIME type', async () => {
    const media = new MediaService(new MemoryStorage());
    await expect(media.storeImage('x', file(Buffer.from('<script>alert(1)</script>')))).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects disallowed MIME types', async () => {
    const media = new MediaService(new MemoryStorage());
    await expect(media.storeImage('x', file(Buffer.from('%PDF'), 'application/pdf'))).rejects.toThrow('Only JPEG');
  });

  it('removes stored objects', async () => {
    const storage = new MemoryStorage();
    storage.files.set('a', Buffer.from('1'));
    await new MediaService(storage).remove(['a']);
    expect(storage.files.size).toBe(0);
  });
});
