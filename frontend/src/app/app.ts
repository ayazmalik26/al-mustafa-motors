import { isPlatformBrowser } from '@angular/common';
import { Component, PLATFORM_ID, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  template: `<router-outlet />`,
})
export class App {
  constructor() {
    // Scroll to the top when the page changes, but not when only query params change
    // (e.g. inventory filters, sorting and pagination keep the user's place).
    if (!isPlatformBrowser(inject(PLATFORM_ID))) return;
    const router = inject(Router);
    let lastPath = '';
    router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe((e) => {
        const path = e.urlAfterRedirects.split(/[?#]/)[0];
        if (lastPath && path !== lastPath) window.scrollTo({ top: 0, behavior: 'instant' });
        lastPath = path;
      });
  }
}
