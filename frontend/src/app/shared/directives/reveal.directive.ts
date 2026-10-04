import { isPlatformBrowser } from '@angular/common';
import { DestroyRef, Directive, ElementRef, PLATFORM_ID, afterNextRender, inject, input } from '@angular/core';

/**
 * Fades an element in as it scrolls into view. Server-rendered HTML stays fully visible;
 * the effect is only enabled in the browser, and disabled for prefers-reduced-motion.
 */
@Directive({ selector: '[appReveal]' })
export class RevealDirective {
  readonly revealDelay = input(0, { alias: 'appReveal', transform: (v: unknown) => Number(v) || 0 });

  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      if (!this.isBrowser || !('IntersectionObserver' in window)) return;
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      const node = this.el.nativeElement;
      const rect = node.getBoundingClientRect();
      if (rect.top < window.innerHeight * 0.92) return; // already visible on load — don't hide it

      node.classList.add('reveal-ready');
      if (this.revealDelay()) node.style.transitionDelay = `${this.revealDelay()}ms`;
      const observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              node.classList.add('is-visible');
              observer.disconnect();
            }
          }
        },
        { threshold: 0.12, rootMargin: '0px 0px -40px 0px' },
      );
      observer.observe(node);
      destroyRef.onDestroy(() => observer.disconnect());
    });
  }
}
