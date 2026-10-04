import { parseCloudinaryUrl } from '../modules/storage/cloudinary-storage.provider.js';

/**
 * Validates environment variables at startup so misconfiguration fails fast
 * instead of surfacing as a confusing runtime error.
 */
export type StorageDriver = 'local' | 'cloudinary';

export interface AppEnv {
  NODE_ENV: 'development' | 'production' | 'test';
  PORT: number;
  DATABASE_URL: string;
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  COOKIE_SECURE: boolean;
  FRONTEND_URL: string;
  CORS_ORIGINS: string[];
  STORAGE_DRIVER: StorageDriver;
  UPLOAD_DIR: string;
  PUBLIC_UPLOAD_BASE_URL: string;
  MAX_UPLOAD_MB: number;
  CLOUDINARY_URL?: string;
  CLOUDINARY_CLOUD_NAME?: string;
  CLOUDINARY_API_KEY?: string;
  CLOUDINARY_API_SECRET?: string;
  CLOUDINARY_FOLDER: string;
  RATE_LIMIT_ENABLED: boolean;
  /** Number of reverse proxies in front of the API (0 = none). */
  TRUST_PROXY: number;
}

const STORAGE_DRIVERS: StorageDriver[] = ['local', 'cloudinary'];

const bool = (value: unknown, fallback: boolean) => {
  if (value === undefined || value === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
};

const optional = (value: unknown) => (value === undefined || value === '' ? undefined : String(value));

/** "true" → 1 hop, "false"/empty → 0, or an explicit hop count such as "2" (Netlify edge → Render). */
function proxyHops(value: unknown): number {
  if (value === undefined || value === '') return 0;
  const n = Number(value);
  if (Number.isInteger(n) && n >= 0) return n;
  return bool(value, false) ? 1 : 0;
}

export function validateEnv(raw: Record<string, unknown>): AppEnv {
  const errors: string[] = [];
  const nodeEnv = (raw.NODE_ENV as AppEnv['NODE_ENV']) || 'development';
  const isProd = nodeEnv === 'production';

  const databaseUrl = String(raw.DATABASE_URL ?? '');
  if (!/^postgres(ql)?:\/\//.test(databaseUrl)) errors.push('DATABASE_URL must be a postgresql:// connection string');

  const jwtSecret = String(raw.JWT_SECRET ?? '');
  if (jwtSecret.length < 16) errors.push('JWT_SECRET must be at least 16 characters');
  if (isProd && (jwtSecret.length < 32 || jwtSecret.startsWith('replace-with'))) {
    errors.push('JWT_SECRET must be a random value of at least 32 characters in production');
  }

  // API_PORT wins over the generic PORT, which tools and shells often set for other servers.
  const port = Number(raw.API_PORT ?? raw.PORT ?? 3000);
  if (!Number.isInteger(port) || port <= 0) errors.push('API_PORT (or PORT) must be a positive integer');

  const maxUpload = Number(raw.MAX_UPLOAD_MB ?? 8);
  if (!(maxUpload > 0 && maxUpload <= 50)) errors.push('MAX_UPLOAD_MB must be between 1 and 50');

  const driver = String(raw.STORAGE_DRIVER || 'local') as StorageDriver;
  if (!STORAGE_DRIVERS.includes(driver)) {
    errors.push(`STORAGE_DRIVER "${driver}" is not supported (use: ${STORAGE_DRIVERS.join(', ')})`);
  }

  const cloudinary = {
    url: optional(raw.CLOUDINARY_URL),
    cloudName: optional(raw.CLOUDINARY_CLOUD_NAME),
    apiKey: optional(raw.CLOUDINARY_API_KEY),
    apiSecret: optional(raw.CLOUDINARY_API_SECRET),
  };
  if (driver === 'cloudinary') {
    if (cloudinary.url) {
      try {
        parseCloudinaryUrl(cloudinary.url);
      } catch (err) {
        errors.push((err as Error).message);
      }
    } else if (!cloudinary.cloudName || !cloudinary.apiKey || !cloudinary.apiSecret) {
      errors.push('STORAGE_DRIVER=cloudinary needs CLOUDINARY_URL, or CLOUDINARY_CLOUD_NAME + CLOUDINARY_API_KEY + CLOUDINARY_API_SECRET');
    }
  }

  if (errors.length) {
    throw new Error(`Invalid environment configuration:\n  - ${errors.join('\n  - ')}`);
  }

  return {
    NODE_ENV: nodeEnv,
    PORT: port,
    DATABASE_URL: databaseUrl,
    JWT_SECRET: jwtSecret,
    JWT_EXPIRES_IN: String(raw.JWT_EXPIRES_IN || '12h'),
    COOKIE_SECURE: bool(raw.COOKIE_SECURE, isProd),
    FRONTEND_URL: String(raw.FRONTEND_URL || 'http://localhost:4200').replace(/\/+$/, ''),
    CORS_ORIGINS: String(raw.CORS_ORIGINS ?? '')
      .split(',')
      .map((s) => s.trim().replace(/\/+$/, ''))
      .filter(Boolean),
    STORAGE_DRIVER: driver,
    UPLOAD_DIR: String(raw.UPLOAD_DIR || 'uploads'),
    PUBLIC_UPLOAD_BASE_URL: String(raw.PUBLIC_UPLOAD_BASE_URL || '/uploads').replace(/\/+$/, ''),
    MAX_UPLOAD_MB: maxUpload,
    CLOUDINARY_URL: cloudinary.url,
    CLOUDINARY_CLOUD_NAME: cloudinary.cloudName,
    CLOUDINARY_API_KEY: cloudinary.apiKey,
    CLOUDINARY_API_SECRET: cloudinary.apiSecret,
    CLOUDINARY_FOLDER: String(raw.CLOUDINARY_FOLDER ?? 'al-mustafa-motors').replace(/^\/+|\/+$/g, ''),
    RATE_LIMIT_ENABLED: bool(raw.RATE_LIMIT_ENABLED, true),
    TRUST_PROXY: proxyHops(raw.TRUST_PROXY),
  };
}
