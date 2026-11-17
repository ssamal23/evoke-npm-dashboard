/**
 * Built-in "Clients / projects using this version" list. It is the offline fallback: the dashboard shows it
 * only when the shared list (api/projects.ts, stored in Vercel Blob) cannot be reached.
 * Keep it the same as DEFAULTS in api/_core.ts.
 *
 * Entries added through the Get NPM dialog while the shared list is unreachable are kept in the
 * visitor's own browser and shown in addition to these (see src/registrations.ts).
 */
export interface ClientProject {
  client: string;
  project: string;
}

/** Shown for every version. */
export const CLIENTS_ALL: ClientProject[] = [
  { client: 'ui practise', project: 'dashboard' },
];

/** Entries for one version only. Key = npm version exactly as in the version history. */
export const CLIENTS_BY_VERSION: Record<string, ClientProject[]> = {
  '0.2.0': [
    { client: 'CSC', project: 'LMS' },
    { client: 'Clopay', project: 'mydore' },
  ],
  '0.1.0': [
    { client: 'Axalta', project: 'colordata' },
  ],
};
