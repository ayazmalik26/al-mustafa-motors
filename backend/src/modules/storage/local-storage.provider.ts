import { Logger } from '@nestjs/common';
import { mkdir, rm, rmdir, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, relative, resolve } from 'node:path';
import type { StorageProvider, StoredObject } from './storage.provider.js';

/** Stores files on local disk under `rootDir`; they are served by the API at `publicBaseUrl`. */
export class LocalStorageProvider implements StorageProvider {
  private readonly logger = new Logger(LocalStorageProvider.name);

  constructor(
    private readonly rootDir: string,
    private readonly publicBaseUrl: string,
  ) {}

  async put(key: string, body: Buffer): Promise<StoredObject> {
    const path = this.resolveKey(key);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, body);
    return { key, url: `${this.publicBaseUrl}/${key}` };
  }

  async delete(key: string): Promise<void> {
    try {
      const path = this.resolveKey(key);
      await rm(path, { force: true });
      // Tidy up the per-vehicle folder once its last file is gone (fails harmlessly if not empty).
      await rmdir(dirname(path)).catch(() => undefined);
    } catch (err) {
      this.logger.warn(`Could not delete ${key}: ${(err as Error).message}`);
    }
  }

  /** Prevents path traversal: the resolved path must stay inside rootDir. */
  private resolveKey(key: string): string {
    const path = resolve(this.rootDir, key);
    const rel = relative(this.rootDir, path);
    if (!rel || rel.startsWith('..') || isAbsolute(rel)) throw new Error(`Invalid storage key: ${key}`);
    return path;
  }
}
