/**
 * Compatibility data per released version.
 *
 * npm does NOT store which Angular/React/Vue/Tailwind/Bootstrap versions a package
 * was tested with, so this file is the source of truth for that. Update it at each
 * release (later this can move to a compat.json shipped inside the package).
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
  components: string[];
  notes: string[];
}

const ALL_20 = [
  'button', 'input', 'select', 'checkbox', 'radio-group', 'card', 'alert', 'modal', 'textarea', 'switch',
  'tabs', 'badge', 'tooltip', 'toast', 'table', 'pagination', 'chip', 'progress', 'app-bar', 'quantity-stepper',
];

export const COMPAT: Record<string, Compat> = {
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
    notes: ['20 components, two variants each', 'WCAG: white text on #ff5316 is 3.23:1 (below AA 4.5:1) – see README'],
  },
  '0.1.0': {
    frameworks: [
      { name: 'Angular', version: '—', status: 'unknown' },
      { name: 'React', version: '—', status: 'unknown' },
      { name: 'Vue', version: '—', status: 'unknown' },
      { name: 'Plain HTML', version: '—', status: 'unknown' },
    ],
    styling: [
      { name: 'Plain CSS (default Evoke look)', version: '—', status: 'unknown' },
      { name: 'Tailwind CSS', version: '—', status: 'unknown' },
      { name: 'Bootstrap', version: '—', status: 'unknown' },
      { name: 'Angular Material', version: '—', status: 'unknown' },
    ],
    components: ['button', 'input', 'select', 'checkbox', 'radio-group'],
    notes: ['Early release. Component list is approximate and compatibility was not recorded.'],
  },
};
