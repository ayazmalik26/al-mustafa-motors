import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject } from '@angular/core';

/** localStorage wrapper that is safe during SSR and in privacy modes where storage throws. */
@Injectable({ providedIn: 'root' })
export class BrowserStorage {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  get(key: string): string | null {
    if (!this.isBrowser) return null;
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  set(key: string, value: string): void {
    if (!this.isBrowser) return;
    try {
      localStorage.setItem(key, value);
    } catch {
      /* storage unavailable — preference simply won't persist */
    }
  }

  getJson<T>(key: string, fallback: T): T {
    const raw = this.get(key);
    if (!raw) return fallback;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  }

  setJson(key: string, value: unknown): void {
    this.set(key, JSON.stringify(value));
  }
}
