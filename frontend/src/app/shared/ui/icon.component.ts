import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/** Stroke icons (24×24). Filled icons are marked with `fill: true`. */
const ICONS: Record<string, { d: string; fill?: boolean }> = {
  whatsapp: {
    fill: true,
    d: 'M12 2a10 10 0 00-8.6 15.1L2 22l5-1.3A10 10 0 1012 2zm5.3 14.2c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.3-.7-2.8-1.1-4.5-3.9-4.7-4.1-.1-.2-1.1-1.5-1.1-2.9s.7-2.1 1-2.4c.3-.3.6-.3.8-.3h.6c.2 0 .4 0 .6.5l.8 2c.1.2.1.4 0 .5l-.3.5-.4.4c-.1.2-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.3 2.4 1.5.3.1.5.1.6-.1l.9-1.1c.2-.3.4-.2.6-.1l1.9.9c.3.1.5.2.5.3.1.2.1.7-.1 1.2z',
  },
  phone: { d: 'M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2' },
  'arrow-right': { d: 'M5 12h14M13 6l6 6-6 6' },
  'arrow-left': { d: 'M19 12H5M11 18l-6-6 6-6' },
  'arrow-up-right': { d: 'M7 17L17 7M8 7h9v9' },
  'arrow-up': { d: 'M12 19V5M6 11l6-6 6 6' },
  'chevron-down': { d: 'M6 9l6 6 6-6' },
  'chevron-left': { d: 'M15 18l-6-6 6-6' },
  'chevron-right': { d: 'M9 6l6 6-6 6' },
  heart: { d: 'M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0016.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 002 8.5c0 2.3 1.5 4.05 3 5.5l7 7z' },
  'heart-filled': { fill: true, d: 'M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0016.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 002 8.5c0 2.3 1.5 4.05 3 5.5l7 7z' },
  share: { d: 'M4 12v7a1 1 0 001 1h14a1 1 0 001-1v-7M16 6l-4-4-4 4M12 2v13' },
  search: { d: 'M11 19a8 8 0 100-16 8 8 0 000 16zM21 21l-4.3-4.3' },
  sliders: { d: 'M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0M14 4v4M8 10v4M16 16v4' },
  x: { d: 'M18 6L6 18M6 6l12 12' },
  menu: { d: 'M4 7h16M4 12h16M4 17h16' },
  'map-pin': { d: 'M12 22s7-6.5 7-12a7 7 0 10-14 0c0 5.5 7 12 7 12zM12 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z' },
  clock: { d: 'M12 21a9 9 0 100-18 9 9 0 000 18zM12 7v5l3 2' },
  mail: { d: 'M4 6h16v12H4zM4 7l8 6 8-6' },
  facebook: { fill: true, d: 'M14 8h3V4h-3c-2.8 0-5 2.2-5 5v2H7v4h2v9h4v-9h3l1-4h-4V9c0-.6.4-1 1-1z' },
  instagram: { d: 'M7 3h10a4 4 0 014 4v10a4 4 0 01-4 4H7a4 4 0 01-4-4V7a4 4 0 014-4zM12 16a4 4 0 100-8 4 4 0 000 8zM17.5 6.5h0' },
  expand: { d: 'M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5' },
  car: { d: 'M3 15l2-6c.5-1.4 1.5-2 3-2h8c1.5 0 2.5.6 3 2l2 6M2 15h20v4H2zM6 19v2M18 19v2M6.5 17h0M17.5 17h0' },
  key: { d: 'M15 7a4 4 0 11-3.9 4.9L3 20v-3h3v-3h3l2.1-2.1A4 4 0 0115 7zM16 8h0' },
  swap: { d: 'M4 8h14l-4-4M20 16H6l4 4' },
  wrench: { d: 'M14.7 6.3a4 4 0 015 5L17 14l-7 7-3-3 7-7 2.7-2.7zM5 19l-2 2' },
  check: { d: 'M5 12l5 5 9-10' },
  camera: { d: 'M4 8h3l2-3h6l2 3h3v11H4zM12 17a4 4 0 100-8 4 4 0 000 8z' },
  upload: { d: 'M12 16V4M7 9l5-5 5 5M4 16v4h16v-4' },
  trash: { d: 'M4 7h16M10 11v6M14 11v6M5 7l1 13h12l1-13M9 7V4h6v3' },
  star: { d: 'M12 3l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.4 6.8 19.1l1-5.8L3.5 9.2l5.9-.9z' },
  'star-filled': { fill: true, d: 'M12 2.5l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.3l-5.8 3.1 1.1-6.5L2.6 9.3l6.5-.9z' },
  edit: { d: 'M4 20h4L19 9l-4-4L4 16zM14 6l4 4' },
  eye: { d: 'M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12zM12 15a3 3 0 100-6 3 3 0 000 6z' },
  grid: { d: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z' },
  inbox: { d: 'M4 13l2-8h12l2 8v6H4zM4 13h5l1 2h4l1-2h5' },
  tag: { d: 'M3 12V4h8l10 10-8 8zM7.5 8.5h0' },
  settings: {
    d: 'M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z',
  },
  logout: { d: 'M15 4h4v16h-4M10 17l5-5-5-5M15 12H3' },
  external: { d: 'M14 4h6v6M20 4l-9 9M18 14v6H4V6h6' },
  info: { d: 'M12 21a9 9 0 100-18 9 9 0 000 18zM12 11v6M12 7.5h0' },
  alert: { d: 'M12 3l10 18H2zM12 10v5M12 18h0' },
  calendar: { d: 'M4 6h16v15H4zM4 10h16M9 3v4M15 3v4' },
  gauge: { d: 'M4 17a8 8 0 1116 0M12 17l4-6M7 17h0M17 17h0' },
  fuel: { d: 'M4 21V5a2 2 0 012-2h6a2 2 0 012 2v16M3 21h12M4 10h10M14 8h2a2 2 0 012 2v6a2 2 0 004 0V9l-3-3' },
  gear: { d: 'M5 4v16M12 4v16M19 4v8M5 12h14' },
  plus: { d: 'M12 5v14M5 12h14' },
  grip: { d: 'M9 6h0M9 12h0M9 18h0M15 6h0M15 12h0M15 18h0' },
  refresh: { d: 'M20 11a8 8 0 10-2.3 5.7M20 4v7h-7' },
  user: { d: 'M12 12a4 4 0 100-8 4 4 0 000 8zM4 21a8 8 0 0116 0' },
  globe: { d: 'M12 21a9 9 0 100-18 9 9 0 000 18zM3 12h18M12 3c2.5 2.7 3.8 5.7 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-5.7-3.8-9S9.5 5.7 12 3z' },
  document: { d: 'M7 3h7l5 5v13H7zM14 3v5h5M10 13h6M10 17h6' },
};

export type IconName = keyof typeof ICONS;

@Component({
  selector: 'app-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-flex shrink-0', 'aria-hidden': 'true' },
  template: `
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      [attr.width]="size()"
      [attr.height]="size()"
      [attr.fill]="icon().fill ? 'currentColor' : 'none'"
      [attr.stroke]="icon().fill ? 'none' : 'currentColor'"
      [attr.stroke-width]="strokeWidth()"
      stroke-linecap="round"
      stroke-linejoin="round"
      focusable="false"
    >
      <path [attr.d]="icon().d" />
    </svg>
  `,
})
export class IconComponent {
  readonly name = input.required<string>();
  readonly size = input<number | string>(18);
  readonly strokeWidth = input<number>(1.7);
  protected readonly icon = computed(() => ICONS[this.name()] ?? ICONS['info']);
}
