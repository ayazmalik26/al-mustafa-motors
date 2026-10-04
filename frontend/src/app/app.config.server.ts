import { ApplicationConfig, mergeApplicationConfig } from '@angular/core';
import { provideServerRendering, withRoutes } from '@angular/ssr';
import { appConfig } from './app.config';
import { serverRoutes } from './app.routes.server';
import { API_INTERNAL_ORIGIN } from './core/http/interceptors';
import { readServerEnv } from './core/http/server-env';

const serverConfig: ApplicationConfig = {
  providers: [
    provideServerRendering(withRoutes(serverRoutes)),
    // During SSR the app talks to the API directly instead of through the public /api proxy.
    { provide: API_INTERNAL_ORIGIN, useFactory: () => readServerEnv('API_INTERNAL_URL') || 'http://localhost:3000' },
  ],
};

export const config = mergeApplicationConfig(appConfig, serverConfig);
