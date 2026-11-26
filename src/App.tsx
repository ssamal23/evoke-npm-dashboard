import { useEffect, useRef, useState } from 'react';
import logoUrl from './assets/evoke-logo-white.svg';
import { SlideOver } from './components/SlideOver';
import { GetNpmDialog, type SaveResult } from './GetNpmDialog';
import { ComponentGallery } from './ComponentGallery';
import { loadRegistrations, saveRegistration } from './registrations';
import { addProject, appliesTo, fetchProjects, type ProjectRow } from './projectsApi';
import { CLIENTS_ALL, CLIENTS_BY_VERSION } from './data/clients';
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

function Icon({ name }: { name: 'download' | 'arrow' | 'close' | 'box' }) {
  const d = {
    download: 'M12 3v12m0 0l-4-4m4 4l4-4M5 21h14',
    box: 'M21 8l-9-5-9 5 9 5 9-5zM3 8v8l9 5 9-5V8M12 13v8',
    arrow: 'M5 12h14m0 0l-6-6m6 6l-6 6',
    close: 'M6 6l12 12M18 6L6 18',
  }[name];
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
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

/**
 * The shared clients/projects list (a JSON file in Vercel Blob, through /api/projects).
 * 'error' means it could not be reached; the drawer then falls back to src/data/clients.ts.
 */
interface SharedProjects { status: 'loading' | 'ready' | 'error'; rows: ProjectRow[] }

function useSharedProjects() {
  const [shared, setShared] = useState<SharedProjects>({ status: 'loading', rows: [] });
  const reload = () => {
    fetchProjects()
      .then((rows) => setShared({ status: 'ready', rows }))
      .catch(() => setShared((s) => ({ status: s.status === 'ready' ? 'ready' : 'error', rows: s.rows })));
  };
  useEffect(reload, []); // eslint-disable-line react-hooks/exhaustive-deps
  return { shared, reload };
}

/**
 * Clients/projects listed for one version, or for all versions when `version` is left out.
 * Source: the shared list (an empty version or "*" means every version), or the built-in list in
 * src/data/clients.ts while the shared list cannot be loaded; plus the entries kept in this browser.
 * The same client + project is counted once.
 */
function projectsFor(shared: SharedProjects, version?: string): { client: string; project: string }[] {
  const base = shared.status === 'ready'
    ? shared.rows.filter((x) => version === undefined || appliesTo(x.version, version))
    : version === undefined
      ? [...CLIENTS_ALL, ...Object.values(CLIENTS_BY_VERSION).flat()]
      : [...CLIENTS_ALL, ...(CLIENTS_BY_VERSION[version] ?? [])];
  const mine = loadRegistrations().filter((x) => version === undefined || x.version === version);
  return [...base, ...mine].filter(
    (x, i, all) => all.findIndex((y) => y.client.toLowerCase() === x.client.toLowerCase() && y.project.toLowerCase() === x.project.toLowerCase()) === i,
  );
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

function Summary({ current, count, shared, onOpen, onGetNpm }: { current: Release; count: number; shared: SharedProjects; onOpen: (v: string, el: HTMLElement) => void; onGetNpm: (v: string, el: HTMLElement) => void }) {
  const loading = shared.status === 'loading';
  return (
    <section className="card summary" aria-label="Current version">
      <div>
        <div className="label">Current version</div>
        {/* The latest release is not in the table below, so this is the way to open its details. */}
        <div className="big">
          <button type="button" className="ver-link big-link" title="View version details" onClick={(e) => onOpen(current.version, e.currentTarget)}>
            {current.version}
          </button>
        </div>
        <span className="status current">Current</span>
      </div>
      <div>
        <div className="label">Projects using</div>
        <div className="big">{loading ? '—' : projectsFor(shared, current.version).length}</div>
        <div className="sub">{loading ? 'Loading…' : `${projectsFor(shared).length} across all versions`}</div>
      </div>
      <div>
        <div className="label">Download Skill</div>
        <button className="btn" onClick={() => downloadMd(current)}>
          <Icon name="download" /> Download .md
        </button>
        <div className="sub">Changelog for {current.version}</div>
      </div>
      <div>
        <div className="label">Get NPM</div>
        <button type="button" className="btn" aria-haspopup="dialog" onClick={(e) => onGetNpm(current.version, e.currentTarget)}>
          <Icon name="box" /> Get NPM link
        </button>
        <div className="sub">Install link for {current.version}</div>
      </div>
      <span className="visually-hidden">{count} releases published</span>
    </section>
  );
}

function History({ releases: all, shared, onOpen, onGetNpm }: { releases: Release[]; shared: SharedProjects; onOpen: (v: string, el: HTMLElement) => void; onGetNpm: (v: string, el: HTMLElement) => void }) {
  // The latest release is shown in the summary card above, so the table lists the earlier ones.
  const releases = all.filter((r) => !r.latest);
  return (
    <section className="card history">
      <div className="history-head">
        <h2>Version history</h2>
        <span className="sub">
          {releases.length === 0
            ? 'No earlier releases yet'
            : `${releases.length} earlier ${releases.length === 1 ? 'release' : 'releases'} · click a row to see version details`}
        </span>
      </div>
      <table>
        <thead>
          <tr>
            <th>Version</th>
            <th>Status</th>
            <th>Released</th>
            <th className="center">Download Skill</th>
            <th className="center">Get NPM</th>
            <th>Projects</th>
          </tr>
        </thead>
        <tbody>
          {releases.map((r) => {
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
                <td className="num">{shared.status === 'loading' ? <span className="muted">—</span> : projectsFor(shared, r.version).length}</td>
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
function VersionDetails({ r, releases, shared, onClose, onGetNpm, returnFocusTo }: {
  r: Release;
  releases: Release[];
  shared: SharedProjects;
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

  const clients = projectsFor(shared, r.version);

  // The two buttons sit in the summary card. Once that card has scrolled out of view they also appear in the
  // panel's header, so they stay within reach while reading further down.
  const summaryCard = useRef<HTMLElement>(null);
  const [summaryHidden, setSummaryHidden] = useState(false);
  useEffect(() => {
    const el = summaryCard.current;
    const scroller = el?.closest('.slideover-body');
    if (!el || !scroller) return;
    // Hidden once the card's bottom edge has moved above the top of the scrolling area.
    const check = () => setSummaryHidden(el.getBoundingClientRect().bottom <= scroller.getBoundingClientRect().top);
    check();
    scroller.addEventListener('scroll', check, { passive: true });
    window.addEventListener('resize', check);
    return () => {
      scroller.removeEventListener('scroll', check);
      window.removeEventListener('resize', check);
    };
  }, []);

  const actionButtons = (
    <>
      <button type="button" className="dbtn" onClick={() => downloadMd(r)}><Icon name="download" /> Download .md</button>
      <button type="button" className="dbtn primary" aria-haspopup="dialog" onClick={(e) => onGetNpm(r.version, e.currentTarget)}>
        Get NPM <Icon name="arrow" />
      </button>
    </>
  );

  const summary = (!components.length
    ? 'No component list recorded for this version.'
    : previous
      ? `${components.length} components · ${added.size} new since ${previous.version}, marked New.`
      : `${components.length} components.`) + (components.length && !live ? ' From local data: could not read the published package.' : '');

  return (
    <SlideOver
      className="details-panel"
      width="700px"
      onClose={onClose}
      returnFocusTo={returnFocusTo}
      closeLabel="Close details"
      eyebrow="Version details"
      title={<>v{r.version} {r.latest && <span className="status current">Current</span>}{r.deprecated && <span className="status deprecated">Deprecated</span>}</>}
      actions={summaryHidden ? <div className="dhead-actions">{actionButtons}</div> : undefined}
    >
      <div className="details">
        <section className="dcard" aria-label="Release summary" ref={summaryCard}>
          <div className="dmeta">
            <dl>
              <div><dt>Released</dt><dd>{shortDay(r.date)}</dd></div>
              <div><dt>Projects using</dt><dd>{clients.length}</dd></div>
              <div><dt>Status</dt><dd>{r.deprecated ? 'Deprecated' : r.latest ? 'Current' : 'Previous'}</dd></div>
            </dl>
            <div className="dmeta-actions">{actionButtons}</div>
          </div>
          {r.deprecated && <div className="dcallout">Deprecated: {r.deprecated}</div>}
        </section>

        <section className="dcard" aria-labelledby="d-frameworks">
          <h3 id="d-frameworks">Frameworks</h3>
          <p className="dsub">Framework versions this release was tested with.</p>
          <table className="dtable">
            <thead><tr><th>Framework</th><th>Version</th></tr></thead>
            <tbody>
              {c.frameworks.map((e) => (
                <tr key={e.name}><td>{e.name}</td><td className={e.version === '—' ? 'dmuted' : undefined}>{dash(e.version)}</td></tr>
              ))}
            </tbody>
          </table>
          {!c.frameworks.length && <p className="dsub">No data.</p>}
          <Notes list={c.frameworks} />
        </section>

        <section className="dcard" aria-labelledby="d-styling">
          <h3 id="d-styling">Styling libraries</h3>
          <p className="dsub">Theme files shipped and the library versions they map to.</p>
          <table className="dtable">
            <thead><tr><th>Library</th><th>Theme file</th><th>Version</th></tr></thead>
            <tbody>
              {c.styling.map((e) => (
                <tr key={e.name}>
                  <td>{e.name.replace(' (default Evoke look)', '')}</td>
                  <td>{THEME_FILE[e.name] ? <code>{THEME_FILE[e.name]}</code> : <span className="dmuted">—</span>}</td>
                  <td className={e.version === '—' ? 'dmuted' : undefined}>{dash(e.version)}</td>
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
            <ul className="dclients" aria-label="Clients and projects">
              {clients.map((x) => (
                <li key={`${x.client}|${x.project}`} className="dchip">
                  <strong>{x.client}</strong>
                  <span className="dchip-sep" aria-hidden="true">·</span>
                  <span className="dchip-project">{x.project}</span>
                </li>
              ))}
            </ul>
          ) : shared.status === 'loading' ? (
            <p className="dsub dclients-empty" role="status">Loading the shared list…</p>
          ) : (
            <p className="dsub dclients-empty">No clients listed for this version yet. Use Get NPM to add a client and project.</p>
          )}
          {shared.status === 'error' && <p className="dsub">The shared list could not be loaded, so the built-in list is shown.</p>}
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
  const { shared, reload: reloadShared } = useSharedProjects();
  const [open, setOpen] = useState<string>();

  /** Saves a client/project to the shared list; if that fails, keeps it in this browser instead. */
  const registerProject = async (entry: { version: string; client: string; project: string }): Promise<SaveResult> => {
    try {
      await addProject(entry);
      reloadShared();
      return 'shared';
    } catch {
      saveRegistration(entry);
      return 'failed';
    }
  };
  const trigger = useRef<HTMLElement | null>(null);

  const current = releases.find((r) => r.latest) ?? releases[0];
  const selected = releases.find((r) => r.version === open);

  const [npmFor, setNpmFor] = useState<string>();
  const npmTrigger = useRef<HTMLElement | null>(null);
  const openGetNpm = (v: string, el: HTMLElement) => { npmTrigger.current = el; setNpmFor(v); };

  const openDrawer = (v: string, el: HTMLElement) => { trigger.current = el; setOpen(v); };
  const closeDrawer = () => setOpen(undefined);

  return (
    <>
    <div className="site-header">
      <img className="site-logo" src={logoUrl} alt="Evoke Technologies" />
      <span className="site-title">Design System</span>
    </div>
    <div className="page">
      <header className="top">
        <div>
          <div className="eyebrow">Version control</div>
          <h1>Design System</h1>
        </div>
        <div className="top-meta">
          {current?.date && <div>Last published {shortDay(releases.reduce((m, r) => (r.date > m ? r.date : m), ''))}</div>}
          {/* Only shown when something is wrong or still loading. */}
          {state !== 'live' && (
            <div className={`source ${state}`}>
              {state === 'loading' && 'Loading from npm…'}
              {state === 'error' && 'Could not reach npm. Showing local data only.'}
            </div>
          )}
        </div>
      </header>

      <main>
        {!current ? <p>Loading…</p> : (
          <>
            <Summary current={current} count={releases.length} shared={shared} onOpen={openDrawer} onGetNpm={openGetNpm} />
            <History releases={releases} shared={shared} onOpen={openDrawer} onGetNpm={openGetNpm} />
          </>
        )}
      </main>

      {selected && <VersionDetails r={selected} releases={releases} shared={shared} onClose={closeDrawer} onGetNpm={openGetNpm} returnFocusTo={trigger.current} />}

      {/* After the drawer so it stacks on top when opened from inside it. */}
      {npmFor && (
        <GetNpmDialog
          version={npmFor}
          onRegister={registerProject}
          packageName={PKG}
          npmUrl={`${NPM_PAGE}/v/${npmFor}`}
          onClose={() => setNpmFor(undefined)}
          returnFocusTo={npmTrigger.current}
        />
      )}
    </div>
    </>
  );
}
