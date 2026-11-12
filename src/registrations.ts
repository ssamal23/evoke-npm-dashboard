/**
 * Remembers which client/project asked for which version, in this browser only (localStorage).
 * There is no server, so other people's browsers never see these entries.
 */
export interface Registration {
  version: string;
  client: string;
  project: string;
  at: string; // ISO time
}

const KEY = 'evoke-dashboard-registrations';

export function loadRegistrations(): Registration[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Registration[]) : [];
  } catch {
    return [];
  }
}

export function saveRegistration(r: Omit<Registration, 'at'>): void {
  try {
    localStorage.setItem(KEY, JSON.stringify([...loadRegistrations(), { ...r, at: new Date().toISOString() }]));
  } catch {
    /* storage blocked (private window, etc.): the dialog still works, nothing is remembered */
  }
}
