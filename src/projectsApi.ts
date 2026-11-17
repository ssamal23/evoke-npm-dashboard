/**
 * The shared "Clients / projects using this version" list.
 *
 * The data is one JSON file in a private Vercel Blob store. The dashboard talks to it only through the
 * serverless function in api/projects.ts (GET reads the list, POST adds one entry). Setup: docs/vercel-blob-setup.md
 *
 * The function only exists on Vercel. Under `npm run dev` the request fails, and the dashboard falls back to the
 * built-in list in src/data/clients.ts plus this browser's own saved entries. To use the deployed list while
 * developing, set VITE_PROJECTS_API_URL in .env.local (the deployed site must allow it; by default it accepts
 * adds only from its own pages).
 */
export interface ProjectRow {
  /** "0.2.0", "0.2.0, 0.2.1", or empty / "*" for every version */
  version: string;
  client: string;
  project: string;
}

const API_URL = (import.meta.env.VITE_PROJECTS_API_URL as string | undefined)?.trim() || '/api/projects';

export const MAX_TEXT = 100;

/** Returns a message when the text should not be sent, otherwise undefined. */
export function textProblem(text: string): string | undefined {
  return text.length > MAX_TEXT ? `Use ${MAX_TEXT} characters or fewer.` : undefined;
}

/** Does a list entry apply to this version? Empty or "*" means every version. Several versions can be separated by commas. */
export function appliesTo(cell: string, version: string): boolean {
  const tokens = cell
    .split(/[,;]/)
    .map((t) => t.trim().replace(/^v/i, ''))
    .filter(Boolean);
  if (tokens.length === 0 || tokens.includes('*')) return true;
  return tokens.includes(version);
}

const text = (v: unknown) => (typeof v === 'string' ? v : typeof v === 'number' ? String(v) : '').trim();

export async function fetchProjects(): Promise<ProjectRow[]> {
  const res = await fetch(API_URL, { cache: 'no-store', headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data: unknown = await res.json(); // throws when the dev server answers with the HTML page instead
  const list = Array.isArray(data) ? data : (data as { projects?: unknown })?.projects;
  if (!Array.isArray(list)) throw new Error('unexpected response');
  return list
    .map((x: Record<string, unknown>) => ({
      version: text(x.version),
      client: text(x.client),
      project: text(x.project),
    }))
    .filter((x) => x.client && x.project);
}

export async function addProject(row: ProjectRow): Promise<void> {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ version: row.version, client: row.client, project: row.project }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}
