import { Injectable, computed, inject, signal } from '@angular/core';
import { BrowserStorage } from './browser-storage.service';

const KEY = 'am-saved-vehicles';
const MAX = 60;

/**
 * Saved/favourite vehicles, stored on this device (localStorage).
 * Kept behind a service so it can later sync to customer accounts without touching components.
 */
@Injectable({ providedIn: 'root' })
export class FavoritesService {
  private readonly storage = inject(BrowserStorage);
  readonly ids = signal<string[]>(this.read());
  readonly count = computed(() => this.ids().length);

  isSaved(id: string): boolean {
    return this.ids().includes(id);
  }

  /** Returns true when the vehicle is now saved. */
  toggle(id: string): boolean {
    const saved = this.isSaved(id);
    this.write(saved ? this.ids().filter((x) => x !== id) : [id, ...this.ids()].slice(0, MAX));
    return !saved;
  }

  remove(ids: string[]) {
    this.write(this.ids().filter((x) => !ids.includes(x)));
  }

  clear() {
    this.write([]);
  }

  private read(): string[] {
    const value = this.storage.getJson<unknown>(KEY, []);
    return Array.isArray(value) ? value.filter((x): x is string => typeof x === 'string').slice(0, MAX) : [];
  }

  private write(ids: string[]) {
    this.ids.set(ids);
    this.storage.setJson(KEY, ids);
  }
}
