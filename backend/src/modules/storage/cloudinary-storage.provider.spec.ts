import type { UploadApiOptions, UploadApiResponse } from 'cloudinary';
import { validateEnv } from '../../config/env.validation.js';
import { CloudinaryStorageProvider, parseCloudinaryUrl, type CloudinaryUploader } from './cloudinary-storage.provider.js';

function fakeUploader(overrides: Partial<{ fail: boolean }> = {}) {
  const uploads: { options: UploadApiOptions; bytes: number }[] = [];
  const destroyed: string[] = [];
  const uploader: CloudinaryUploader = {
    upload_stream(options, callback) {
      return {
        end(chunk: Buffer) {
          uploads.push({ options, bytes: chunk.length });
          if (overrides.fail) callback(new Error('quota exceeded'));
          else callback(undefined, { public_id: options.public_id, secure_url: `https://res.cloudinary.com/demo/image/upload/v1/${options.public_id}.webp` } as UploadApiResponse);
        },
      };
    },
    async destroy(publicId) {
      destroyed.push(publicId);
      return { result: 'ok' };
    },
  };
  return { uploader, uploads, destroyed };
}

describe('CloudinaryStorageProvider', () => {
  it('uploads under the configured folder and returns the CDN URL and public ID', async () => {
    const { uploader, uploads } = fakeUploader();
    const provider = new CloudinaryStorageProvider({}, 'al-mustafa-motors', uploader);

    const stored = await provider.put('vehicles/v1/abc-lg.webp', Buffer.from('image-bytes'), 'image/webp');

    expect(uploads[0].options).toMatchObject({ public_id: 'al-mustafa-motors/vehicles/v1/abc-lg', resource_type: 'image', overwrite: false });
    expect(uploads[0].bytes).toBe(11);
    expect(stored).toEqual({
      key: 'al-mustafa-motors/vehicles/v1/abc-lg',
      url: 'https://res.cloudinary.com/demo/image/upload/v1/al-mustafa-motors/vehicles/v1/abc-lg.webp',
    });
  });

  it('propagates upload failures so MediaService can roll back', async () => {
    const provider = new CloudinaryStorageProvider({}, 'x', fakeUploader({ fail: true }).uploader);
    await expect(provider.put('a.webp', Buffer.from('1'), 'image/webp')).rejects.toThrow('quota exceeded');
  });

  it('deletes by public ID and never throws on delete errors', async () => {
    const { uploader, destroyed } = fakeUploader();
    const provider = new CloudinaryStorageProvider({}, 'x', uploader);
    await provider.delete('x/vehicles/v1/abc-lg');
    expect(destroyed).toEqual(['x/vehicles/v1/abc-lg']);

    uploader.destroy = async () => {
      throw new Error('network');
    };
    await expect(provider.delete('x/y')).resolves.toBeUndefined();
  });

  it('parses CLOUDINARY_URL', () => {
    expect(parseCloudinaryUrl('cloudinary://123:s3cr%2Bet@my-cloud')).toEqual({ apiKey: '123', apiSecret: 's3cr+et', cloudName: 'my-cloud' });
    expect(() => parseCloudinaryUrl('https://example.com')).toThrow('CLOUDINARY_URL');
  });
});

describe('storage & proxy configuration', () => {
  const base = { DATABASE_URL: 'postgresql://u:p@localhost:5432/db', JWT_SECRET: 'x'.repeat(40) };

  it('requires Cloudinary credentials when the cloudinary driver is selected', () => {
    expect(() => validateEnv({ ...base, STORAGE_DRIVER: 'cloudinary' })).toThrow(/CLOUDINARY_URL/);
    expect(validateEnv({ ...base, STORAGE_DRIVER: 'cloudinary', CLOUDINARY_URL: 'cloudinary://k:s@c' }).STORAGE_DRIVER).toBe('cloudinary');
    expect(
      validateEnv({ ...base, STORAGE_DRIVER: 'cloudinary', CLOUDINARY_CLOUD_NAME: 'c', CLOUDINARY_API_KEY: 'k', CLOUDINARY_API_SECRET: 's' }).CLOUDINARY_FOLDER,
    ).toBe('al-mustafa-motors');
  });

  it('rejects unknown storage drivers', () => {
    expect(() => validateEnv({ ...base, STORAGE_DRIVER: 'ftp' })).toThrow(/not supported/);
  });

  it('reads TRUST_PROXY as a hop count', () => {
    expect(validateEnv({ ...base }).TRUST_PROXY).toBe(0);
    expect(validateEnv({ ...base, TRUST_PROXY: 'true' }).TRUST_PROXY).toBe(1);
    expect(validateEnv({ ...base, TRUST_PROXY: '2' }).TRUST_PROXY).toBe(2);
    expect(validateEnv({ ...base, TRUST_PROXY: 'false' }).TRUST_PROXY).toBe(0);
  });

  it('prefers API_PORT over a generic PORT', () => {
    expect(validateEnv({ ...base, PORT: '4200', API_PORT: '3000' }).PORT).toBe(3000);
    expect(validateEnv({ ...base, PORT: '10000' }).PORT).toBe(10000);
  });
});
