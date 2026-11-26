/**
 * Compatibility data per released version.
 *
 * npm does NOT store which Angular/React/Vue/Tailwind/Bootstrap versions a package
 * was tested with. From 0.3.1 on each release ships that in its own compat.json, which the
 * dashboard reads (see App.tsx). This file is only the record for releases before that:
 * do not add new versions here.
 *
 * status:
 *   tested   = actually run in a real app
 *   expected = should work (web components + CSS variables) but NOT run yet
 *   unknown  = nobody checked
 */
export type Status = 'tested' | 'expected' | 'unknown';

export interface Entry {
  name: string;
  version: string; // version(s) tested or expected, '—' if none
  status: Status;
  note?: string;
}

export interface Compat {
  frameworks: Entry[];
  styling: Entry[];
  /** Offline fallback only. The dashboard reads the real list from the published package (see App.tsx). */
  components: string[];
  notes: string[];
}

const ALL_20 = [
  'button', 'input', 'select', 'checkbox', 'radio-group', 'card', 'alert', 'modal', 'textarea', 'switch',
  'tabs', 'badge', 'tooltip', 'toast', 'table', 'pagination', 'chip', 'progress', 'app-bar', 'quantity-stepper',
];

const ALL_34 = [
  ...ALL_20,
  'divider', 'list', 'button-toggle', 'expansion', 'menu', 'slider', 'sidenav', 'stepper',
  'bottom-sheet', 'grid-list', 'icon', 'datepicker', 'timepicker', 'tree',
];

export const COMPAT: Record<string, Compat> = {
  '0.3.0': {
    frameworks: [
      { name: 'Angular', version: '22.3', status: 'tested', note: 'Built with the Angular CLI (strict templates, zoneless). Use defineCustomElements() from the loader; $event.detail is typed' },
      { name: 'React', version: '19.3', status: 'tested', note: 'Vite production build. Register each component from @evoke-tech/stencil-ui-kit/components/<name>.js (the loader does not work in Vite builds). Events: onevokeChange' },
      { name: 'React', version: '18.3', status: 'tested', note: 'Same registration as React 19. Object props and events need a ref (setting properties and addEventListener), see the README' },
      { name: 'Vue', version: '3.5', status: 'tested', note: 'Vite production build. The /vue wrappers need no setup. Raw tags need isCustomElement, per-component registration and addEventListener for events' },
      { name: 'Plain HTML', version: 'Chromium', status: 'tested', note: '86 checks across all 34 components' },
    ],
    styling: [
      { name: 'Plain CSS (default Evoke look)', version: '—', status: 'tested', note: 'No theme file needed' },
      { name: 'Tailwind CSS', version: '4.1', status: 'expected', note: 'Tested in 0.2.0. Not re-run for the 14 new components' },
      { name: 'Bootstrap', version: '5.3.8', status: 'expected', note: 'Tested in 0.2.0. Not re-run for the 14 new components' },
      { name: 'Angular Material', version: '22.2 (M3)', status: 'expected', note: 'Tested in 0.2.0. Not re-run for the 14 new components' },
    ],
    components: ALL_34,
    notes: [
      '14 new components, 34 in total',
      'Fixed: the Vue wrappers now work in Vite and Rollup production builds',
      'Not tested: TypeScript React (JSX types for evoke-* tags), webpack, Next.js, Nuxt',
    ],
  },
  '0.2.0': {
    frameworks: [
      { name: 'Angular', version: '22.2', status: 'tested', note: 'Run in a real Angular 22 + Tailwind 4 app' },
      { name: 'React', version: '18 / 19', status: 'expected', note: 'Not run yet. Call defineCustomElements() once at startup' },
      { name: 'Vue', version: '3.5', status: 'tested', note: 'Run with Vite + Tailwind 4 and Bootstrap 5.3. Mark evoke-* as custom elements. 0.2.0 raw tags: dynamic text directly inside evoke-button removes its inner button (wrap it in a <span>). Fixed in the next release by the /vue wrappers' },
      { name: 'Plain HTML', version: 'Chromium', status: 'tested' },
    ],
    styling: [
      { name: 'Plain CSS (default Evoke look)', version: '—', status: 'tested', note: 'Orange #ff5316 / navy #0b1560, no theme file needed' },
      { name: 'Tailwind CSS', version: '4.1', status: 'tested', note: 'Works without importing themes/tailwind.css; theme file is optional' },
      { name: 'Bootstrap', version: '5.3.8', status: 'tested', note: 'Run in an Angular 22 app: button colors match .btn-primary. Core components checked, not every one' },
      { name: 'Angular Material', version: '22.2 (M3)', status: 'tested', note: 'Colors match mat-flat-button. 0.2.0 has two cosmetic issues (pill-shaped cards/alerts, serif font without Roboto), fixed in the next release' },
    ],
    components: ALL_20,
    notes: ['Two variants per component','WCAG: white text on #ff5316 is 3.23:1 (below AA 4.5:1) – see README'],
  },
  '0.1.0': {
    frameworks: [
      { name: 'Angular', version: '—', status: 'tested', note: 'Recorded by the maintainer; exact version not kept' },
      { name: 'React', version: '—', status: 'unknown' },
      { name: 'Vue', version: '—', status: 'tested', note: 'Recorded by the maintainer; exact version not kept' },
      { name: 'Plain HTML', version: '—', status: 'tested', note: 'Recorded by the maintainer; exact version not kept' },
    ],
    styling: [
      { name: 'Plain CSS (default Evoke look)', version: '—', status: 'unknown' },
      { name: 'Tailwind CSS', version: '—', status: 'unknown' },
      { name: 'Bootstrap', version: '—', status: 'unknown' },
      { name: 'Angular Material', version: '—', status: 'unknown' },
    ],
    components: ['button', 'input', 'select', 'checkbox', 'radio-group', 'card', 'alert', 'modal'],
    notes: ['Early release. Compatibility was not recorded.'],
  },
};
