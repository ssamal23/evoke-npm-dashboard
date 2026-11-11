import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
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
const find = (list: Entry[], name: string): Entry | undefined => list.find((e) => e.name === name);
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

## Components (${c.components.length})

${c.components.map((x) => `- evoke-${x}`).join('\n') || '- Not recorded'}
${c.notes.length ? `\n## Notes\n\n${c.notes.map((n) => `- ${n}`).join('\n')}\n` : ''}`;
}

function downloadMd(r: Release) {
  const url = URL.createObjectURL(new Blob([changelogMarkdown(r)], { type: 'text/markdown' }));
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

function useReleases() {
  const [releases, setReleases] = useState<Release[]>([]);
  const [state, setState] = useState<'loading' | 'live' | 'error'>('loading');
  useEffect(() => {
    fetch(REGISTRY)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d) => {
        const latest = d['dist-tags']?.latest;
        const list: Release[] = Object.keys(d.versions)
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
  const c = compatOf(current.version);
  return (
    <section className="card summary" aria-label="Current version">
      <div>
        <div className="label">Current version</div>
        <div className="big">{current.version}</div>
        <span className="status current">Current</span>
      </div>
      <div>
        <div className="label">Components</div>
        <div className="big">{c.components.length || '—'}</div>
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

function History({ releases, onOpen }: { releases: Release[]; onOpen: (v: string, el: HTMLElement) => void }) {
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
                  <a className="btn" href={`${NPM_PAGE}/v/${r.version}`} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>
                    Get NPM <Icon name="arrow" />
                  </a>
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

function EntryList({ title, list }: { title: string; list: Entry[] }) {
  return (
    <section className="block">
      <h3>{title}</h3>
      {list.length === 0 ? <p className="muted">No data.</p> : (
        <ul className="entries">
          {list.map((e) => (
            <li key={e.name}>
              <div className="entry-main">
                <strong>{e.name}</strong>
                <span className="entry-ver">{e.version}</span>
                <Pill status={e.status} />
              </div>
              {e.note && <p className="muted small">{e.note}</p>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Drawer({ r, onClose }: { r: Release; onClose: () => void }) {
  const c = compatOf(r.version);
  const ref = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  const onKeyDown = (e: ReactKeyboardEvent) => {
    if (e.key === 'Escape') { e.stopPropagation(); onClose(); return; }
    if (e.key !== 'Tab' || !ref.current) return;
    const f = ref.current.querySelectorAll<HTMLElement>('button, a[href], [tabindex]:not([tabindex="-1"])');
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  };

  return (
    <div className="drawer-root" onKeyDown={onKeyDown}>
      <div className="scrim" onClick={onClose} />
      <aside ref={ref} className="drawer" role="dialog" aria-modal="true" aria-labelledby="drawer-title">
        <header className="drawer-head">
          <div>
            <div className="label">Version</div>
            <h2 id="drawer-title">{r.version} {r.latest && <span className="status current">Current</span>}{r.deprecated && <span className="status deprecated">Deprecated</span>}</h2>
            <div className="sub">{r.date ? `Released ${shortDay(r.date)}` : 'Release date unavailable'}</div>
          </div>
          <button ref={closeRef} className="icon-btn" onClick={onClose} aria-label="Close details"><Icon name="close" /></button>
        </header>

        <div className="drawer-body">
          <pre className="cmd">npm install {PKG}@{r.version}</pre>
          <div className="stats">
            <div><span>Unpacked</span><strong>{kb(r.unpacked)}</strong></div>
            <div><span>Files</span><strong>{r.files ?? '—'}</strong></div>
            <div><span>Stencil</span><strong>{r.stencil ?? '—'}</strong></div>
          </div>
          {r.deprecated && <div className="callout">Deprecated: {r.deprecated}</div>}

          <EntryList title="Frameworks" list={c.frameworks} />
          <EntryList title="Styling libraries" list={c.styling} />

          <section className="block">
            <h3>Components <span className="count">{c.components.length}</span></h3>
            {c.components.length ? (
              <div className="chips">{c.components.map((x) => <span key={x} className="chip">evoke-{x}</span>)}</div>
            ) : <p className="muted">Not recorded.</p>}
            {c.notes.map((n) => <p key={n} className="muted small">• {n}</p>)}
          </section>
        </div>

        <footer className="drawer-foot">
          <button className="btn" onClick={() => downloadMd(r)}><Icon name="download" /> Download .md</button>
          <a className="btn" href={`${NPM_PAGE}/v/${r.version}`} target="_blank" rel="noreferrer">Get NPM <Icon name="arrow" /></a>
        </footer>
      </aside>
    </div>
  );
}

/* ───────────── Other views ───────────── */

function Compare({ releases }: { releases: Release[] }) {
  const [a, setA] = useState(releases[1]?.version ?? releases[0]?.version);
  const [b, setB] = useState(releases[0]?.version);
  const ca = compatOf(a), cb = compatOf(b);
  const added = cb.components.filter((x) => !ca.components.includes(x));
  const removed = ca.components.filter((x) => !cb.components.includes(x));
  const rows = (kind: 'frameworks' | 'styling') =>
    ca[kind].concat(cb[kind].filter((e) => !find(ca[kind], e.name))).map((e) => {
      const x = find(ca[kind], e.name), y = find(cb[kind], e.name);
      const changed = x?.version !== y?.version || x?.status !== y?.status;
      return (
        <tr key={e.name} className={changed ? 'changed' : ''}>
          <td>{e.name}</td>
          <td>{x ? <>{x.version} <Pill status={x.status} /></> : '—'}</td>
          <td>{y ? <>{y.version} <Pill status={y.status} /></> : '—'}</td>
        </tr>
      );
    });
  return (
    <section className="card pad">
      <h2>Compare versions</h2>
      <div className="row">
        <label>From <select value={a} onChange={(e) => setA(e.target.value)}>{releases.map((r) => <option key={r.version}>{r.version}</option>)}</select></label>
        <label>To <select value={b} onChange={(e) => setB(e.target.value)}>{releases.map((r) => <option key={r.version}>{r.version}</option>)}</select></label>
      </div>
      <p><strong>{added.length}</strong> components added, <strong>{removed.length}</strong> removed.</p>
      {added.length > 0 && <div className="chips">{added.map((x) => <span key={x} className="chip add">+ evoke-{x}</span>)}</div>}
      <table className="plain">
        <thead><tr><th>Support</th><th>{a}</th><th>{b}</th></tr></thead>
        <tbody>{rows('frameworks')}{rows('styling')}</tbody>
      </table>
      <p className="muted small">Highlighted rows changed between the two versions.</p>
    </section>
  );
}

function Skills() {
  return (
    <section className="card pad">
      <h2>AI skill files</h2>
      <p className="muted">
        A skill tells an AI assistant to build UI only with this package’s components and styles, and when a different design is needed, to reuse
        the same component and adapt its design instead of replacing it.
      </p>
      <div className="result warn">No skill file has been published yet. When one exists (planned at <code>skills/evoke-ui-design/SKILL.md</code> inside the package), it will be listed here with Copy and Download.</div>
    </section>
  );
}

/* ───────────── App ───────────── */

export default function App() {
  const { releases, state } = useReleases();
  const [view, setView] = useState<'versions' | 'compare' | 'skills'>('versions');
  const [open, setOpen] = useState<string>();
  const trigger = useRef<HTMLElement | null>(null);

  const current = releases.find((r) => r.latest) ?? releases[0];
  const selected = releases.find((r) => r.version === open);

  const openDrawer = (v: string, el: HTMLElement) => { trigger.current = el; setOpen(v); };
  const closeDrawer = () => { setOpen(undefined); setTimeout(() => trigger.current?.focus(), 0); };

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

      <nav className="tabs" aria-label="Sections">
        {(['versions', 'compare', 'skills'] as const).map((v) => (
          <button key={v} className={view === v ? 'on' : ''} aria-current={view === v ? 'page' : undefined} onClick={() => setView(v)}>
            {v === 'versions' ? 'Versions' : v === 'compare' ? 'Compare' : 'AI Skills'}
          </button>
        ))}
      </nav>

      <main>
        {!current ? <p>Loading…</p> : view === 'versions' ? (
          <>
            <Summary current={current} count={releases.length} />
            <History releases={releases} onOpen={openDrawer} />
          </>
        ) : view === 'compare' ? <Compare releases={releases} /> : <Skills />}
      </main>

      {selected && <Drawer r={selected} onClose={closeDrawer} />}
    </div>
  );
}
