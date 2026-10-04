import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, inject, provideAppInitializer, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideClientHydration, withEventReplay, withHttpTransferCacheOptions } from '@angular/platform-browser';
import { provideRouter, withComponentInputBinding, withRouterConfig } from '@angular/router';
import { routes } from './app.routes';
import { apiUrlInterceptor, authErrorInterceptor } from './core/http/interceptors';
import { SettingsService } from './core/services/settings.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding(), withRouterConfig({ paramsInheritanceStrategy: 'always' })),
    provideHttpClient(withFetch(), withInterceptors([apiUrlInterceptor, authErrorInterceptor])),
    // GET responses made during SSR are transferred to the browser, so hydration doesn't refetch them.
    provideClientHydration(withEventReplay(), withHttpTransferCacheOptions({ includePostRequests: false })),
    // Business settings (WhatsApp number, address, map…) are needed by almost every page.
    provideAppInitializer(() => inject(SettingsService).load()),
  ],
};
