import { useEffect, useRef, useState } from 'react';
import { SlideOver } from './components/SlideOver';
import { GetNpmDialog } from './GetNpmDialog';
import { ComponentGallery } from './ComponentGallery';
import { loadRegistrations } from './registrations';
import './VersionDetails.css';
import { COMPAT, type Compat, type Entry, type Status } from './data/compat';

const PKG = '@evoke-tech/stencil-ui-kit';
const REGISTRY = `https://registry.npmjs.org/${PKG.replace('/', '%2F')}`;
const NPM_PAGE = `https://www.npmjs.com/package/${PKG}`;

interface Release {
  version: string;
  date: string;
  unpacked?: number;
  files?: number;
  stencil?: string;
  latest: boolean;
  deprecated?: string;
}

const LABEL: Record<Status, string> = { tested: 'Tested', expected: 'Expected', unknown: 'Unknown' };

const empty: Compat = { frameworks: [], styling: [], components: [], notes: ['No compatibility data recorded for this version.'] };
const compatOf = (v: string): Compat => COMPAT[v] ?? empty;
const kb = (n?: number) => (n ? `${(n / 1024).toFixed(0)} KB` : '—');
const shortDay = (d: string) =>
  d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }) : '—';

function cmpVersion(a: string, b: string) {
  const pa = a.split(/[.-]/).map((x) => parseInt(x, 10) || 0);
  const pb = b.split(/[.-]/).map((x) => parseInt(x, 10) || 0);
  for (let i = 0; i < 3; i++) if ((pa[i] ?? 0) !== (pb[i] ?? 0)) return (pa[i] ?? 0) - (pb[i] ?? 0);
  return 0;
}

/** Tested framework names, e.g. ["Angular", "Vue"] */
const testedFrameworks = (v: string) => compatOf(v).frameworks.filter((f) => f.status === 'tested').map((f) => f.name);

function changelogMarkdown(r: Release): string {
  const c = compatOf(r.version);
  const rows = (list: Entry[]) =>
    list.length ? list.map((e) => `| ${e.name} | ${e.version} | ${LABEL[e.status]} | ${e.note ?? ''} |`).join('\n') : '| — | — | — | No data |';
  return `# ${PKG} ${r.version}

- Released: ${r.date ? new Date(r.date).toISOString().slice(0, 10) : 'unknown'}
- Install: \`npm install ${PKG}@${r.version}\`
- Unpacked size: ${kb(r.unpacked)} (${r.files ?? '—'} files)
- Built with Stencil ${r.stencil ?? '—'}
${r.deprecated ? `- **Deprecated:** ${r.deprecated}\n` : ''}
## Frameworks

| Name | Version | Status | Notes |
| --- | --- | --- | --- |
${rows(c.frameworks)}

## Styling libraries

| Name | Version | Status | Notes |
| --- | --- | --- | --- |
${rows(c.styling)}

## Components (${componentsOf(r.version).length})

${componentsOf(r.version).map((x) => `- evoke-${x}`).join('\n') || '- Not recorded'}
${c.notes.length ? `\n## Notes\n\n${c.notes.map((n) => `- ${n}`).join('\n')}\n` : ''}`;
}

/**
 * Hand-written release notes: every changelogs/<version>.md file is bundled at build time.
 * The file name (without .md) must equal the npm version, e.g. changelogs/0.3.0.md.
 */
const NOTE_FILES = import.meta.glob('../changelogs/*.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
const NOTES: Record<string, string> = Object.fromEntries(
  Object.entries(NOTE_FILES).map(([path, text]) => [path.split('/').pop()!.replace(/\.md$/, ''), text]),
);

/** Your own file if there is one, otherwise a summary generated from the dashboard data. */
const markdownFor = (r: Release) => NOTES[r.version] ?? changelogMarkdown(r);

function downloadMd(r: Release) {
  const url = URL.createObjectURL(new Blob([markdownFor(r)], { type: 'text/markdown' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `evoke-ui-kit-${r.version}.md`;
  a.click();
  URL.revokeObjectURL(url);
}

function Icon({ name }: { name: 'download' | 'arrow' | 'close' }) {
  const d = {
    download: 'M12 3v12m0 0l-4-4m4 4l4-4M5 21h14',
    arrow: 'M5 12h14m0 0l-6-6m6 6l-6 6',
    close: 'M6 6l12 12M18 6L6 18',
  }[name];
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

function Pill({ status }: { status: Status }) {
  return <span className={`pill ${status}`}>{LABEL[status]}</span>;
}

/**
 * Component list read from the published package itself, so a new component shows up
 * as soon as the version is on npm. Falls back to src/data/compat.ts when unpkg is unreachable.
 * Each package ships dist/types/components.d.ts, which lists every tag in HTMLElementTagNameMap.
 */
const liveComponents: Record<string, string[]> = {};
const componentsOf = (v: string) => liveComponents[v] ?? compatOf(v).components;

async function fetchComponents(version: string): Promise<string[]> {
  const res = await fetch(`https://unpkg.com/${PKG}@${version}/dist/types/components.d.ts`);
  if (!res.ok) throw new Error(String(res.status));
  const text = await res.text();
  const block = text.match(/interface HTMLElementTagNameMap\s*\{([\s\S]*?)\n\s*\}/)?.[1] ?? '';
  const names = [...block.matchAll(/"evoke-([a-z0-9-]+)"\s*:/g)].map((m) => m[1]);
  if (!names.length) throw new Error('no components found');
  return names;
}

/** Loads the component list of every release once. Returns a counter that changes when data arrives. */
function useLiveComponents(releases: Release[]) {
  const [loaded, setLoaded] = useState(0);
  useEffect(() => {
    let cancelled = false;
    for (const r of releases) {
      if (liveComponents[r.version]) continue;
      fetchComponents(r.version)
        .then((names) => { liveComponents[r.version] = names; if (!cancelled) setLoaded((n) => n + 1); })
        .catch(() => { /* keep the local fallback for this version */ });
    }
    return () => { cancelled = true; };
  }, [releases]);
  return loaded;
}

function useReleases() {
  const [releases, setReleases] = useState<Release[]>([]);
  const [state, setState] = useState<'loading' | 'live' | 'error'>('loading');
  useEffect(() => {
    fetch(REGISTRY)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d) => {
        const latest = d['dist-tags']?.latest;
        const list: Release[] = Object.keys(d.versions)
          .filter((v) => !v.includes('-')) // hide pre-release builds such as 0.0.0-stage
          .map((v) => ({
            version: v,
            date: d.time?.[v] ?? '',
            unpacked: d.versions[v].dist?.unpackedSize,
            files: d.versions[v].dist?.fileCount,
            stencil: d.versions[v].devDependencies?.['@stencil/core'],
            latest: v === latest,
            deprecated: d.versions[v].deprecated,
          }))
          .sort((a, b) => cmpVersion(b.version, a.version));
        setReleases(list);
        setState('live');
      })
      .catch(() => {
        // Offline fallback: show the versions we have compatibility data for.
        setReleases(Object.keys(COMPAT).sort((a, b) => cmpVersion(b, a)).map((v, i) => ({ version: v, date: '', latest: i === 0 })));
        setState('error');
      });
  }, []);
  return { releases, state };
}

/* ───────────── Summary + history ───────────── */

function Summary({ current, count }: { current: Release; count: number }) {
  const components = componentsOf(current.version);
  return (
    <section className="card summary" aria-label="Current version">
      <div>
        <div className="label">Current version</div>
        <div className="big">{current.version}</div>
        <span className="status current">Current</span>
      </div>
      <div>
        <div className="label">Components</div>
        <div className="big">{components.length || '—'}</div>
        <div className="sub">evoke-* web components</div>
      </div>
      <div>
        <div className="label">Markdown file</div>
        <button className="btn" onClick={() => downloadMd(current)}>
          <Icon name="download" /> Download .md
        </button>
        <div className="sub">Changelog for {current.version}</div>
      </div>
      <span className="visually-hidden">{count} releases published</span>
    </section>
  );
}

function History({ releases, onOpen, onGetNpm }: { releases: Release[]; onOpen: (v: string, el: HTMLElement) => void; onGetNpm: (v: string, el: HTMLElement) => void }) {
  return (
    <section className="card history">
      <div className="history-head">
        <h2>Version history</h2>
        <span className="sub">{releases.length} releases · click a row for details</span>
      </div>
      <table>
        <thead>
          <tr>
            <th>Version</th>
            <th>Status</th>
            <th>Released</th>
            <th className="center">Download .md</th>
            <th className="center">Get NPM</th>
            <th>Tested with</th>
          </tr>
        </thead>
        <tbody>
          {releases.map((r) => {
            const tested = testedFrameworks(r.version);
            const status = r.deprecated ? ['deprecated', 'Deprecated'] : r.latest ? ['current', 'Current'] : ['previous', 'Previous'];
            return (
              <tr
                key={r.version}
                className={r.latest ? 'row current-row' : 'row'}
                onClick={(e) => onOpen(r.version, e.currentTarget.querySelector<HTMLElement>('.ver-link') ?? e.currentTarget)}
              >
                <td className="ver">
                  <button type="button" className="ver-link" onClick={(e) => { e.stopPropagation(); onOpen(r.version, e.currentTarget); }}>
                    {r.version}
                  </button>
                </td>
                <td><span className={`status ${status[0]}`}>{status[1]}</span></td>
                <td className="muted">{shortDay(r.date)}</td>
                <td className="center">
                  <button className="icon-btn" aria-label={`Download changelog for ${r.version}`} onClick={(e) => { e.stopPropagation(); downloadMd(r); }}>
                    <Icon name="download" />
                  </button>
                </td>
                <td className="center">
                  <button type="button" className="btn" aria-haspopup="dialog" onClick={(e) => { e.stopPropagation(); onGetNpm(r.version, e.currentTarget); }}>
                    Get NPM <Icon name="arrow" />
                  </button>
                </td>
                <td>{tested.length ? tested.join(', ') : <span className="muted">Not recorded</span>}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}

/* ───────────── Right-side drawer ───────────── */

/** Theme file each styling library uses, from the package's src/themes folder. */
const THEME_FILE: Record<string, string> = {
  'Plain CSS (default Evoke look)': 'themes/tokens.css',
  'Tailwind CSS': 'themes/tailwind.css',
  Bootstrap: 'themes/bootstrap.css',
  'Angular Material': 'themes/material.css',
};

const dash = (s: string) => (s && s !== '—' ? s : '—');

/** Entries that carry a note, shown under their table so nothing recorded is lost. */
function Notes({ list }: { list: Entry[] }) {
  const noted = list.filter((e) => e.note);
  if (!noted.length) return null;
  return (
    <ul className="dnotes" aria-label="Notes">
      {noted.map((e) => <li key={e.name}><strong>{e.name}:</strong> {e.note}</li>)}
    </ul>
  );
}

/** Details of one release, shown inside the reusable SlideOver panel. */
function VersionDetails({ r, releases, onClose, onGetNpm, returnFocusTo }: {
  r: Release;
  releases: Release[];
  onClose: () => void;
  onGetNpm: (v: string, el: HTMLElement) => void;
  returnFocusTo?: HTMLElement | null;
}) {
  const c = compatOf(r.version);

  // Newest older release we have component data for, to work out what is new here.
  const components = componentsOf(r.version);
  const previous = releases.find((x) => cmpVersion(x.version, r.version) < 0 && componentsOf(x.version).length);
  const before = new Set(previous ? componentsOf(previous.version) : []);
  const added = new Set(previous ? components.filter((n) => !before.has(n)) : []);
  const live = !!liveComponents[r.version];

  // Read on every render so a registration made from the Get NPM dialog shows up straight away.
  const clients = loadRegistrations()
    .filter((x) => x.version === r.version)
    .filter((x, i, all) => all.findIndex((y) => y.client === x.client && y.project === x.project) === i);

  const summary = (!components.length
    ? 'No component list recorded for this version.'
    : previous
      ? `${components.length} components · ${added.size} new since ${previous.version}, marked New.`
      : `${components.length} components.`) + (components.length && !live ? ' From local data: could not read the published package.' : '');

  return (
    <SlideOver
      className="details-panel"
      width="600px"
      onClose={onClose}
      returnFocusTo={returnFocusTo}
      closeLabel="Close details"
      eyebrow="Version details"
      title={<>v{r.version} {r.latest && <span className="status current">Current</span>}{r.deprecated && <span className="status deprecated">Deprecated</span>}</>}
    >
      <div className="details">
        <section className="dcard" aria-label="Release summary">
          <div className="dmeta">
            <dl>
              <div><dt>Released</dt><dd>{shortDay(r.date)}</dd></div>
              <div><dt>Projects using</dt><dd>{clients.length}</dd></div>
              <div><dt>Status</dt><dd>{r.deprecated ? 'Deprecated' : r.latest ? 'Current' : 'Previous'}</dd></div>
            </dl>
            <div className="dmeta-actions">
              <button type="button" className="dbtn" onClick={() => downloadMd(r)}><Icon name="download" /> Download .md</button>
              <button type="button" className="dbtn primary" aria-haspopup="dialog" onClick={(e) => onGetNpm(r.version, e.currentTarget)}>
                Get NPM <Icon name="arrow" />
              </button>
            </div>
          </div>
          {r.deprecated && <div className="dcallout">Deprecated: {r.deprecated}</div>}
        </section>

        <section className="dcard" aria-labelledby="d-frameworks">
          <h3 id="d-frameworks">Frameworks</h3>
          <p className="dsub">Framework versions this release was tested with.</p>
          <table className="dtable">
            <thead><tr><th>Framework</th><th>Tested with</th><th>Status</th></tr></thead>
            <tbody>
              {c.frameworks.map((e) => (
                <tr key={e.name}><td>{e.name}</td><td className={e.version === '—' ? 'dmuted' : undefined}>{dash(e.version)}</td><td><Pill status={e.status} /></td></tr>
              ))}
            </tbody>
          </table>
          {!c.frameworks.length && <p className="dsub">No data.</p>}
          <div className="dlegend">
            <span><span className="pill tested">Tested</span> Run in a real app</span>
            <span><span className="pill expected">Expected</span> Web component, not yet tested</span>
          </div>
          <Notes list={c.frameworks} />
        </section>

        <section className="dcard" aria-labelledby="d-styling">
          <h3 id="d-styling">Styling libraries</h3>
          <p className="dsub">Theme files shipped and the library versions they map to.</p>
          <table className="dtable">
            <thead><tr><th>Library</th><th>Theme file</th><th>Version</th><th>Status</th></tr></thead>
            <tbody>
              {c.styling.map((e) => (
                <tr key={e.name}>
                  <td>{e.name.replace(' (default Evoke look)', '')}</td>
                  <td>{THEME_FILE[e.name] ? <code>{THEME_FILE[e.name]}</code> : <span className="dmuted">—</span>}</td>
                  <td className={e.version === '—' ? 'dmuted' : undefined}>{dash(e.version)}</td>
                  <td><Pill status={e.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          {!c.styling.length && <p className="dsub">No data.</p>}
          <Notes list={c.styling} />
        </section>

        <section className="dcard" aria-labelledby="d-clients">
          <h3 id="d-clients">Clients / projects using this version</h3>
          {clients.length ? (
            <ul className="dclients">
              {clients.map((x) => <li key={`${x.client}|${x.project}`}><strong>{x.client}</strong><span>{x.project}</span></li>)}
            </ul>
          ) : (
            <p className="dsub dclients-empty">No one has registered yet. Use Get NPM to add a client and project. Entries are saved in this browser only.</p>
          )}
        </section>

        <ComponentGallery components={components} added={added} summary={summary} />
        {c.notes.length > 0 && (
          <ul className="dnotes" aria-label="Release notes">
            {c.notes.map((n) => <li key={n}>{n}</li>)}
          </ul>
        )}
      </div>
    </SlideOver>
  );
}

/* ───────────── App ───────────── */

export default function App() {
  const { releases, state } = useReleases();
  useLiveComponents(releases); // re-renders the app when a version's component list arrives
  const [open, setOpen] = useState<string>();
  const trigger = useRef<HTMLElement | null>(null);

  const current = releases.find((r) => r.latest) ?? releases[0];
  const selected = releases.find((r) => r.version === open);

  const [npmFor, setNpmFor] = useState<string>();
  const npmTrigger = useRef<HTMLElement | null>(null);
  const openGetNpm = (v: string, el: HTMLElement) => { npmTrigger.current = el; setNpmFor(v); };

  const openDrawer = (v: string, el: HTMLElement) => { trigger.current = el; setOpen(v); };
  const closeDrawer = () => setOpen(undefined);

  return (
    <div className="page">
      <header className="top">
        <div>
          <div className="eyebrow">Version control</div>
          <h1>Evoke UI Kit</h1>
        </div>
        <div className="top-meta">
          {current?.date && <div>Last published {shortDay(releases.reduce((m, r) => (r.date > m ? r.date : m), ''))}</div>}
          <div className={`source ${state}`}>
            {state === 'loading' && 'Loading from npm…'}
            {state === 'live' && 'Live data from the npm registry'}
            {state === 'error' && 'Could not reach npm. Showing local data only.'}
          </div>
        </div>
      </header>

      <main>
        {!current ? <p>Loading…</p> : (
          <>
            <Summary current={current} count={releases.length} />
            <History releases={releases} onOpen={openDrawer} onGetNpm={openGetNpm} />
          </>
        )}
      </main>

      {selected && <VersionDetails r={selected} releases={releases} onClose={closeDrawer} onGetNpm={openGetNpm} returnFocusTo={trigger.current} />}

      {/* After the drawer so it stacks on top when opened from inside it. */}
      {npmFor && (
        <GetNpmDialog
          version={npmFor}
          packageName={PKG}
          npmUrl={`${NPM_PAGE}/v/${npmFor}`}
          onClose={() => setNpmFor(undefined)}
          returnFocusTo={npmTrigger.current}
        />
      )}
    </div>
  );
}
