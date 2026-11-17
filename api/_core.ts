/**
 * Logic of the shared "Clients / projects using this version" list, kept free of Vercel Blob so it can be tested.
 * api/projects.ts connects it to the real Blob store. (Files starting with "_" in /api are not deployed as endpoints.)
 */
export interface Row {
  /** "0.2.0", "0.2.0, 0.2.1", or empty / "*" for every version */
  version: string;
  client: string;
  project: string;
  addedAt?: string;
}

export interface Store {
  /** The saved rows, or null when nothing has been saved yet. */
  read(): Promise<Row[] | null>;
  write(rows: Row[]): Promise<void>;
}

/**
 * Shown until the first project is added, and used as the starting point of the saved file.
 * An empty version means "every version". Keep in step with src/data/clients.ts (the offline fallback).
 */
export const DEFAULTS: Row[] = [
  { version: '', client: 'ui practise', project: 'dashboard' },
  { version: '', client: 'CSC', project: 'LMS' },
  { version: '', client: 'Clopay', project: 'mydore' },
  { version: '', client: 'Axalta', project: 'colordata' },
];

const MAX_TEXT = 100;
const MAX_VERSION = 40;
const MAX_ROWS = 2000;
const MAX_BODY = 2000;

const reply = (status: number, body: unknown, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...extra },
  });

/** Trim and drop control characters. */
const clean = (v: unknown) => (typeof v === 'string' ? v.replace(/[\u0000-\u001f\u007f]/g, '').trim() : '');

const same = (a: Row, b: Row) =>
  a.client.toLowerCase() === b.client.toLowerCase() &&
  a.project.toLowerCase() === b.project.toLowerCase() &&
  a.version.replace(/\s/g, '').toLowerCase() === b.version.replace(/\s/g, '').toLowerCase();

export async function handle(request: Request, store: Store): Promise<Response> {
  try {
    if (request.method === 'GET') {
      const rows = (await store.read()) ?? DEFAULTS;
      return reply(200, { projects: rows.map(({ version, client, project }) => ({ version, client, project })) });
    }

    if (request.method !== 'POST') return reply(405, { ok: false, error: 'Method not allowed' }, { Allow: 'GET, POST' });

    // Only the dashboard itself (same site) may add entries from a browser.
    const origin = request.headers.get('origin');
    if (origin) {
      // The site's own host can show up as the request URL's host or in the forwarding headers, depending on the platform.
      const hosts = new Set<string>();
      try { hosts.add(new URL(request.url).host); } catch { /* ignore */ }
      for (const name of ['host', 'x-forwarded-host']) {
        for (const h of (request.headers.get(name) ?? '').split(',')) if (h.trim()) hosts.add(h.trim());
      }
      let sameSite = false;
      try { sameSite = hosts.has(new URL(origin).host); } catch { /* malformed origin */ }
      if (!sameSite) return reply(403, { ok: false, error: 'Not allowed from this site' });
    }

    const raw = await request.text();
    if (raw.length > MAX_BODY) return reply(413, { ok: false, error: 'Request too large' });
    let body: Record<string, unknown>;
    try { body = JSON.parse(raw); } catch { return reply(400, { ok: false, error: 'Invalid JSON' }); }

    const row: Row = { version: clean(body?.version), client: clean(body?.client), project: clean(body?.project) };
    if (!row.client || !row.project) return reply(400, { ok: false, error: 'Client and project are required' });
    if (row.client.length > MAX_TEXT || row.project.length > MAX_TEXT) return reply(400, { ok: false, error: `Use ${MAX_TEXT} characters or fewer` });
    if (row.version.length > MAX_VERSION || !/^[\w.,;*\s-]*$/.test(row.version)) return reply(400, { ok: false, error: 'Invalid version' });

    const rows = (await store.read()) ?? [...DEFAULTS];
    if (rows.length >= MAX_ROWS) return reply(429, { ok: false, error: 'The list is full' });
    if (!rows.some((r) => same(r, row))) {
      rows.push({ ...row, addedAt: new Date().toISOString() });
      await store.write(rows);
    }
    return reply(200, { ok: true });
  } catch (err) {
    console.error('projects api error', err);
    return reply(500, { ok: false, error: 'Server error' });
  }
}
