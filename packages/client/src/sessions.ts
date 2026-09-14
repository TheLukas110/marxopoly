export interface StoredSession {
  roomId: string;
  token: string;
  playerName: string;
}

const SESSION_KEY = 'marxopoly.session.v1';
const SAVED_KEY = 'marxopoly.saved-seats.v1';

function valid(value: unknown): value is StoredSession {
  if (!value || typeof value !== 'object') return false;
  const s = value as StoredSession;
  return typeof s.roomId === 'string' && typeof s.token === 'string' && typeof s.playerName === 'string';
}

export function readSession(): StoredSession | null {
  try {
    const value: unknown = JSON.parse(sessionStorage.getItem(SESSION_KEY) ?? 'null');
    return valid(value) ? value : null;
  } catch { return null; }
}

export function readSavedSessions(): StoredSession[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(SAVED_KEY) ?? '[]');
    return Array.isArray(value) ? value.filter(valid).filter(s => s.token && s.roomId) : [];
  } catch { return []; }
}

export function forgetSession(session: StoredSession): void {
  try {
    localStorage.setItem(SAVED_KEY, JSON.stringify(readSavedSessions().filter(s => s.token !== session.token)));
  } catch { /* Storage can be disabled. */ }
}

export function writeSession(session: StoredSession | null): void {
  try {
    if (session) sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else sessionStorage.removeItem(SESSION_KEY);
  } catch { /* Storage can be disabled. */ }
  // Only this tab reconnects automatically. Other tabs offer an explicit Rejoin.
  if (session?.token) {
    try {
      const saved = readSavedSessions().filter(s => s.token !== session.token);
      localStorage.setItem(SAVED_KEY, JSON.stringify([session, ...saved].slice(0, 20)));
    } catch { /* Playing still works without persistence. */ }
  }
}
