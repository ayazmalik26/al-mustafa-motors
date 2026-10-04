/**
 * Storage abstraction. The rest of the application only talks to this interface,
 * so switching from local disk to S3 / Cloudflare R2 / Cloudinary means adding one
 * class that implements it and selecting it in StorageModule via STORAGE_DRIVER.
 */
export interface StoredObject {
  /** Provider-specific key, used later to delete the object. */
  key: string;
  /** Public URL (absolute, or root-relative when served by this API). */
  url: string;
}

export interface StorageProvider {
  put(key: string, body: Buffer, contentType: string): Promise<StoredObject>;
  delete(key: string): Promise<void>;
}

export const STORAGE_PROVIDER = Symbol('STORAGE_PROVIDER');
