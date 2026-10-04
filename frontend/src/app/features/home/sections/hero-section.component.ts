import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { I18nService } from '../../../core/i18n/i18n.service';
import { SettingsService } from '../../../core/services/settings.service';
import { imageSrcset } from '../../../core/utils/images';
import { IconComponent } from '../../../shared/ui/icon.component';
import { HOME_IMAGES } from '../home-images';

@Component({
  selector: 'app-hero-section',
  imports: [RouterLink, TranslatePipe, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="relative flex min-h-[640px] items-end overflow-hidden bg-ink-850 sm:min-h-[720px] lg:min-h-[min(860px,100svh)]" aria-labelledby="hero-title">
      <div class="absolute inset-0">
        <img
          [src]="heroImage().url"
          [attr.srcset]="heroSrcset()"
          sizes="100vw"
          alt=""
          fetchpriority="high"
          decoding="async"
          class="hero-img size-full object-cover object-[62%_center] [filter:saturate(.78)] sm:object-[center_52%]"
        />
        <div class="absolute inset-0 bg-[linear-gradient(90deg,rgba(5,8,7,.93)_0%,rgba(5,8,7,.66)_42%,rgba(5,8,7,.16)_74%,rgba(5,8,7,.5)),linear-gradient(0deg,rgba(5,8,7,.9),transparent_55%)] rtl:bg-[linear-gradient(270deg,rgba(5,8,7,.93)_0%,rgba(5,8,7,.66)_42%,rgba(5,8,7,.16)_74%,rgba(5,8,7,.5)),linear-gradient(0deg,rgba(5,8,7,.9),transparent_55%)]"></div>
      </div>

      <div class="container-x relative z-10 pb-16 pt-32 sm:pb-24">
        <p class="kicker page-enter mb-5 !text-[#c9cec9]">{{ 'home.hero.kicker' | t }}</p>
        <h1 id="hero-title" class="display-1 page-enter max-w-[15ch] rtl:max-w-[24ch] [animation-delay:80ms]">
          @if (customTitle(); as title) {
            {{ title.lead }} <em class="accent">{{ title.accent }}</em>
          } @else {
            {{ 'home.hero.titleLead' | t }} <em class="accent">{{ 'home.hero.titleAccent' | t }}</em>
          }
        </h1>
        <p class="page-enter mt-7 max-w-[34rem] text-[15px] leading-relaxed text-[#c3c9c5] [animation-delay:160ms] sm:text-base">
          {{ settings.heroSubtitle() || ('home.hero.subtitle' | t) }}
        </p>
        <div class="page-enter mt-8 flex flex-wrap gap-2.5 [animation-delay:240ms]">
          <a routerLink="/inventory" class="btn btn-gold btn-lg" data-testid="hero-browse">
            {{ 'home.hero.browse' | t }} <app-icon name="arrow-right" [size]="16" class="flip-rtl" />
          </a>
          @if (settings.whatsappUrl(); as wa) {
            <a [href]="wa" target="_blank" rel="noopener" class="btn btn-ghost btn-lg backdrop-blur-md" data-testid="hero-whatsapp">
              <app-icon name="whatsapp" [size]="17" /> {{ 'home.hero.whatsapp' | t }}
            </a>
          }
        </div>
      </div>

      <div class="absolute bottom-9 end-6 z-10 hidden text-[10px] uppercase tracking-[0.18em] text-[#c5cac7] [writing-mode:vertical-rl] lg:block" aria-hidden="true">
        {{ 'home.hero.scroll' | t }}
      </div>
    </section>
  `,
  styles: `
    .hero-img { animation: hero-zoom 2.4s var(--ease-premium) both; }
    @keyframes hero-zoom { from { transform: scale(1.06); } to { transform: none; } }
  `,
})
export class HeroSectionComponent {
  protected readonly settings = inject(SettingsService);
  private readonly i18n = inject(I18nService);

  protected readonly heroImage = computed(() => {
    const url = this.settings.settings()?.heroImageUrl;
    return url ? { url } : HOME_IMAGES.heroFallback;
  });
  protected readonly heroSrcset = computed(() => imageSrcset(this.heroImage(), [800, 1280, 1920, 2400]));

  /** Admin-provided headline (the last word gets the gold accent). */
  protected readonly customTitle = computed(() => {
    this.i18n.lang();
    const title = this.settings.heroTitle()?.trim();
    if (!title) return null;
    const words = title.split(/\s+/);
    if (words.length < 2) return { lead: '', accent: title };
    return { lead: words.slice(0, -1).join(' '), accent: words.at(-1)! };
  });
}
