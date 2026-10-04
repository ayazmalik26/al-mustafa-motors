import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import type { TranslationKey } from '../../../core/i18n/translations/en';
import { RevealDirective } from '../../../shared/directives/reveal.directive';
import { IconComponent } from '../../../shared/ui/icon.component';

/** "How it works" — describes the process only; no unverified claims (years, customers, reviews). */
@Component({
  selector: 'app-trust-section',
  imports: [TranslatePipe, RevealDirective, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="bg-ink-850 py-20 sm:py-24" aria-labelledby="trust-title">
      <div class="container-x">
        <p class="kicker">{{ 'home.trust.kicker' | t }}</p>
        <h2 id="trust-title" class="display-2 mt-3 mb-10">{{ 'home.trust.titleLead' | t }} <em class="accent">{{ 'home.trust.titleAccent' | t }}</em></h2>
        <ol class="grid border-y border-white/10 sm:grid-cols-2 lg:grid-cols-4">
          @for (item of items; track item.n; let i = $index) {
            <li class="border-white/10 px-1 py-8 sm:px-6 [&:not(:last-child)]:border-b sm:[&:nth-child(odd)]:border-e lg:[&:not(:last-child)]:border-e lg:border-b-0" [appReveal]="i * 80">
              <div class="flex items-center justify-between">
                <span class="font-serif text-4xl text-[#e9ebe8]">{{ item.n }}</span>
                <span class="text-gold"><app-icon [name]="item.icon" [size]="22" /></span>
              </div>
              <h3 class="mt-5 font-serif text-2xl">{{ item.title | t }}</h3>
              <p class="mt-2 text-sm text-muted-2">{{ item.text | t }}</p>
            </li>
          }
        </ol>
      </div>
    </section>
  `,
})
export class TrustSectionComponent {
  protected readonly items: { n: string; icon: string; title: TranslationKey; text: TranslationKey }[] = [
    { n: '01', icon: 'search', title: 'home.trust.1.title', text: 'home.trust.1.text' },
    { n: '02', icon: 'whatsapp', title: 'home.trust.2.title', text: 'home.trust.2.text' },
    { n: '03', icon: 'swap', title: 'home.trust.3.title', text: 'home.trust.3.text' },
    { n: '04', icon: 'map-pin', title: 'home.trust.4.title', text: 'home.trust.4.text' },
  ];
}
