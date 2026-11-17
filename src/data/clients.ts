/**
 * Clients and projects shown under "Clients / projects using this version".
 *
 * These are the defaults every visitor sees. Edit them and push to git to change them.
 * Entries added through the Get NPM dialog are saved in each visitor's own browser and are
 * shown in addition to these (see src/registrations.ts).
 */
export interface ClientProject {
  client: string;
  project: string;
}

/** Shown for every version. */
export const CLIENTS_ALL: ClientProject[] = [
  { client: 'ui practise', project: 'dashboard' },
  { client: 'CSC', project: 'LMS' },
  { client: 'Clopay', project: 'mydore' },
  { client: 'Axalta', project: 'colordata' },
];

/**
 * Extra entries for one version only. Key = npm version exactly as in the version history.
 * Example: '0.2.1': [{ client: 'Acme', project: 'Portal' }]
 */
export const CLIENTS_BY_VERSION: Record<string, ClientProject[]> = {};
