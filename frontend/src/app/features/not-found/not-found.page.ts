import { ChangeDetectionStrategy, Component, RESPONSE_INIT, effect, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18nService } from '../../core/i18n/i18n.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { SeoService } from '../../core/services/seo.service';

@Component({
  selector: 'app-not-found-page',
  imports: [RouterLink, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="container-x grid min-h-[70vh] place-items-center py-20 text-center">
      <div>
        <p class="font-serif text-[clamp(5rem,18vw,11rem)] leading-none text-white/10 ltr-nums">404</p>
        <h1 class="display-3 -mt-6">{{ 'notFound.title' | t }}</h1>
        <p class="mx-auto mt-4 max-w-md text-sm text-muted">{{ 'notFound.body' | t }}</p>
        <div class="mt-8 flex flex-wrap justify-center gap-2">
          <a routerLink="/" class="btn btn-gold">{{ 'notFound.home' | t }}</a>
          <a routerLink="/inventory" class="btn btn-ghost">{{ 'nav.browseCars' | t }}</a>
        </div>
      </div>
    </section>
  `,
})
export class NotFoundPage {
  constructor() {
    const response = inject(RESPONSE_INIT, { optional: true });
    if (response) response.status = 404;
    const seo = inject(SeoService);
    const i18n = inject(I18nService);
    effect(() => seo.set({ title: i18n.t('seo.notFound.title'), path: '/404', noindex: true }));
  }
}
