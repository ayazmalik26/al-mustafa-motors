import { RequestMethod } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { resolve } from 'node:path';
import { AllExceptionsFilter } from './common/http/all-exceptions.filter.js';
import { ResponseInterceptor } from './common/http/response.interceptor.js';
import { createValidationPipe } from './common/http/validation.pipe.js';

/** Shared HTTP configuration for the real server and the API test suite. */
export function configureApp(app: NestExpressApplication): NestExpressApplication {
  const config = app.get(ConfigService);

  // Number of proxies in front of the API (e.g. 2 for Netlify edge → Render), so req.ip is the visitor's IP.
  const proxyHops = config.get<number>('TRUST_PROXY', 0);
  if (proxyHops) app.set('trust proxy', proxyHops);
  app.disable('x-powered-by');

  app.use(
    helmet({
      // Uploaded images may be displayed by the website on another origin (e.g. a CDN or separate domain).
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );
  app.use(cookieParser());
  app.useBodyParser('json', { limit: '200kb' });
  app.useBodyParser('urlencoded', { limit: '200kb', extended: false });

  const origins = [config.get<string>('FRONTEND_URL'), ...(config.get<string[]>('CORS_ORIGINS') ?? [])].filter(Boolean) as string[];
  app.enableCors({
    origin: origins,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    maxAge: 600,
  });

  app.setGlobalPrefix('api', {
    exclude: [
      { path: 'sitemap.xml', method: RequestMethod.GET },
      { path: 'robots.txt', method: RequestMethod.GET },
    ],
  });
  app.useGlobalPipes(createValidationPipe());
  app.useGlobalInterceptors(new ResponseInterceptor(app.get(Reflector)));
  app.useGlobalFilters(new AllExceptionsFilter());

  if (config.get<string>('STORAGE_DRIVER', 'local') === 'local') {
    app.useStaticAssets(resolve(process.cwd(), config.get<string>('UPLOAD_DIR', 'uploads')), {
      prefix: config.get<string>('PUBLIC_UPLOAD_BASE_URL', '/uploads'),
      index: false,
      dotfiles: 'deny',
      fallthrough: false,
      // File names are random UUIDs and never reused, so they can be cached aggressively.
      maxAge: '365d',
      immutable: true,
    });
  }

  app.enableShutdownHooks();
  return app;
}
