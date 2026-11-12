import { useId, useMemo, useState, type ReactNode } from 'react';
import './ComponentGallery.css';

/** Look the previews are drawn in. These are drawings, not the real components. */
const SKINS = [
  { id: 'react', label: 'React' },
  { id: 'angular', label: 'Angular' },
  { id: 'tailwind', label: 'Tailwind' },
  { id: 'bootstrap', label: 'Bootstrap' },
] as const;

/** Components that need two columns in the grid. */
const WIDE = new Set(['card', 'alert', 'modal', 'toast', 'table', 'progress', 'app-bar']);

/** Display order. Anything not listed goes last. */
const ORDER = [
  'button', 'input', 'select', 'checkbox', 'radio-group', 'textarea', 'card', 'switch', 'alert', 'tabs',
  'modal', 'badge', 'tooltip', 'toast', 'table', 'pagination', 'chip', 'progress', 'app-bar', 'quantity-stepper',
];

const PREVIEWS: Record<string, ReactNode> = {
  button: (
    <div className="pv-row">
      <span className="pv-btn primary">Primary</span>
      <span className="pv-btn">Secondary</span>
    </div>
  ),
  input: (
    <div className="pv-field">
      <span className="pv-label">Email</span>
      <span className="pv-control muted">name@company.com</span>
    </div>
  ),
  select: (
    <div className="pv-field">
      <span className="pv-label">Country</span>
      <span className="pv-control select">India</span>
    </div>
  ),
  checkbox: (
    <div className="pv-row"><span className="pv-check on">✓</span><span>Remember me</span></div>
  ),
  'radio-group': (
    <div className="pv-field">
      <span className="pv-label">Billing</span>
      <div className="pv-row small"><span className="pv-radio on" /><span>Monthly</span></div>
      <div className="pv-row small"><span className="pv-radio" /><span>Yearly</span></div>
    </div>
  ),
  textarea: (
    <div className="pv-field">
      <span className="pv-label">Notes</span>
      <span className="pv-control tall muted">Add a note</span>
    </div>
  ),
  card: (
    <div className="pv-card">
      <strong>Release notes</strong>
      <span className="pv-sub">Twelve new components and refreshed tokens.</span>
      <span className="pv-link">Read more</span>
    </div>
  ),
  switch: (
    <div className="pv-row"><span className="pv-switch" /><span>Notifications</span></div>
  ),
  alert: (
    <div className="pv-alert">
      <span className="pv-alert-icon">i</span>
      <div><strong>Changes saved</strong><span className="pv-sub">Your settings will apply on next sign-in.</span></div>
    </div>
  ),
  tabs: (
    <div className="pv-tabs"><span className="on">Overview</span><span>Usage</span><span>API</span></div>
  ),
  modal: (
    <div className="pv-modal">
      <strong>Delete file?</strong>
      <span className="pv-sub">This can’t be undone.</span>
      <div className="pv-row end"><span className="pv-btn">Cancel</span><span className="pv-btn danger">Delete</span></div>
    </div>
  ),
  badge: (
    <div className="pv-row small">
      <span className="pv-badge ok">Active</span>
      <span className="pv-badge warn">Pending</span>
      <span className="pv-badge bad">Failed</span>
    </div>
  ),
  tooltip: (
    <div className="pv-tip"><span className="pv-tip-bubble">Copy link</span><span className="pv-icon-btn">⧉</span></div>
  ),
  toast: (
    <div className="pv-toast"><span>Version 0.2.0 published</span><span className="pv-undo">Undo</span></div>
  ),
  table: (
    <div className="pv-table">
      <div className="head"><span>Name</span><span>Role</span></div>
      <div><span>Asha</span><span>Admin</span></div>
      <div><span>Ravi</span><span>Editor</span></div>
    </div>
  ),
  pagination: (
    <div className="pv-row small pv-pages"><span>‹</span><span className="on">1</span><span>2</span><span>3</span><span>›</span></div>
  ),
  chip: (
    <div className="pv-row small"><span className="pv-chip">Angular <i>×</i></span><span className="pv-chip">React <i>×</i></span></div>
  ),
  progress: (
    <div className="pv-progress">
      <div className="pv-progress-top"><span>Uploading assets</span><span>64%</span></div>
      <div className="pv-bar"><span style={{ width: '64%' }} /></div>
    </div>
  ),
  'app-bar': (
    <div className="pv-appbar"><strong>Evoke</strong><span>Home</span><span className="muted">Docs</span><span className="muted">Releases</span><span className="pv-dot" /></div>
  ),
  'quantity-stepper': (
    <div className="pv-stepper"><span>−</span><strong>2</strong><span>+</span></div>
  ),
};

interface Props {
  /** Component names without the "evoke-" prefix. */
  components: string[];
  /** Names that are new in this version (marked "New"). */
  added: Set<string>;
  /** Text under the heading. */
  summary: string;
}

/** Heading, framework tabs, search and a grid of component previews. */
export function ComponentGallery({ components, added, summary }: Props) {
  const [skin, setSkin] = useState<(typeof SKINS)[number]['id']>('react');
  const [query, setQuery] = useState('');
  const searchId = useId();

  const sorted = useMemo(() => {
    const rank = (n: string) => (ORDER.indexOf(n) === -1 ? ORDER.length : ORDER.indexOf(n));
    return [...components].sort((a, b) => rank(a) - rank(b));
  }, [components]);
  const shown = sorted.filter((n) => `evoke-${n}`.includes(query.trim().toLowerCase()));

  return (
    <section className="dcard gallery" data-skin={skin} aria-labelledby={`${searchId}-h`}>
      <h3 id={`${searchId}-h`}>Components</h3>
      <p className="dsub">{summary}</p>

      <div className="gallery-bar">
        <div className="gallery-tabs" role="group" aria-label="Preview style">
          {SKINS.map((s) => (
            <button key={s.id} type="button" aria-pressed={skin === s.id} className={skin === s.id ? 'on' : ''} onClick={() => setSkin(s.id)}>
              {s.label}
            </button>
          ))}
        </div>
        <label className="gallery-search" htmlFor={searchId}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></svg>
          <span className="visually-hidden">Search components</span>
          <input id={searchId} type="search" placeholder="Search components" value={query} onChange={(e) => setQuery(e.target.value)} />
        </label>
      </div>

      {shown.length === 0 ? (
        <p className="dsub gallery-empty">{components.length ? 'No components match your search.' : 'Component list not recorded for this version.'}</p>
      ) : (
        <ul className="gallery-grid">
          {shown.map((n) => (
            <li key={n} className={WIDE.has(n) ? 'wide' : undefined}>
              <div className="gallery-preview" aria-hidden="true">{PREVIEWS[n] ?? <span className="pv-sub">{`<evoke-${n}>`}</span>}</div>
              <div className="gallery-name">
                <code>evoke-{n}</code>
                {added.has(n) && <span className="gallery-new">New</span>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
