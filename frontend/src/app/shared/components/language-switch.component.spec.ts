import { TestBed } from '@angular/core/testing';
import { I18nService } from '../../core/i18n/i18n.service';
import { LanguageSwitchComponent } from './language-switch.component';
import { pageWindow } from '../ui/pagination.component';

describe('LanguageSwitchComponent', () => {
  beforeEach(() => localStorage.clear());

  it('switches language and reflects the pressed state', async () => {
    const fixture = TestBed.createComponent(LanguageSwitchComponent);
    await fixture.whenStable();
    const el: HTMLElement = fixture.nativeElement;
    const [en, ur] = Array.from(el.querySelectorAll('button'));
    expect(en.getAttribute('aria-pressed')).toBe('true');

    ur.click();
    await fixture.whenStable();
    expect(TestBed.inject(I18nService).lang()).toBe('ur');
    expect(document.documentElement.dir).toBe('rtl');
    expect(ur.getAttribute('aria-pressed')).toBe('true');
    expect(el.querySelector('[role="group"]')!.getAttribute('aria-label')).toBe('زبان');

    en.click();
    await fixture.whenStable();
    expect(document.documentElement.dir).toBe('ltr');
  });
});

describe('pagination window', () => {
  it('shows all pages when there are few', () => {
    expect(pageWindow(2, 5)).toEqual([1, 2, 3, 4, 5]);
  });

  it('collapses distant pages with ellipses', () => {
    expect(pageWindow(6, 12)).toEqual([1, '…', 5, 6, 7, '…', 12]);
    expect(pageWindow(1, 12)).toEqual([1, 2, '…', 12]);
  });
});
