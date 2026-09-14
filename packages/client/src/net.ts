import { io, type Socket } from 'socket.io-client';
import { useSyncExternalStore } from 'react';
import { clearInvitation, invitedRoom } from './invitations.js';
import type {
  AccountRequest,
  AccountResult,
  SavedTemplate,
  CardInput,
  ChatMessage,
  ClientToServerEvents,
  GameAction,
  GameSettings,
  GameState,
  RoomSummary,
  ServerToClientEvents,
} from '@marxopoly/shared';

const SERVER_URL = (import.meta.env.VITE_SERVER_URL ?? '').trim().replace(/\/$/, '');

import { readSession, writeSession, readSavedSessions, forgetSession, type StoredSession } from './sessions.js';

const NAME_KEY = 'marxopoly.name.v1';

function readName(): string {
  try {
    return localStorage.getItem(NAME_KEY) ?? '';
  } catch {
    return '';
  }
}

function writeName(name: string): void {
  try {
    localStorage.setItem(NAME_KEY, name);
  } catch {
    /* ignore */
  }
}

export interface ClientStore {
  account: { username: string; templates: SavedTemplate[] } | null;
  accountBusy: boolean;
  accountError: string | null;
  publicUrl: string | null;
  shareEnabled: boolean;
  invitedRoomId: string | null;
  connected: boolean;
  roomId: string | null;
  roomName: string;
  playerId: string | null;
  hostId: string | null;
  /** True when this tab joined a game in progress as a watch-only viewer. */
  spectator: boolean;
  game: GameState | null;
  rooms: RoomSummary[];
  chat: ChatMessage[];
  error: string | null;
  playerName: string;
  joining: boolean;
  savedSessions: StoredSession[];
}

let state: ClientStore = {
  account: null,
  accountBusy: false,
  accountError: null,
  publicUrl: null,
  shareEnabled: false,
  invitedRoomId: invitedRoom(window.location.search),
  connected: false,
  roomId: null,
  roomName: '',
  playerId: null,
  hostId: null,
  spectator: false,
  game: null,
  rooms: [],
  chat: [],
  error: null,
  playerName: readSession()?.playerName ?? readName(),
  joining: false,
  savedSessions: readSavedSessions(),
};

// Preserve seats from tabs opened before persistent recovery was introduced.
const existingSession = readSession();
if (existingSession) { writeSession(existingSession); state.savedSessions = readSavedSessions(); }

window.addEventListener('storage', () => set({ savedSessions: readSavedSessions() }));

const listeners = new Set<() => void>();

function set(patch: Partial<ClientStore>): void {
  state = { ...state, ...patch };
  for (const listener of listeners) listener();
}

export function useStore<T>(select: (s: ClientStore) => T): T {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => select(state),
    () => select(state),
  );
}

export function getState(): ClientStore {
  return state;
}

export const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(SERVER_URL, {
  autoConnect: true,
  transports: ['websocket', 'polling'],
  tryAllTransports: true,
});

socket.on('connect', () => {
  if (accountToken()) void accountRequest({ action: 'restore', token: accountToken() });
  set({ connected: true });
  socket.emit('lobby:list');
  // Try to walk straight back into whatever table we were sitting at.
  const session = readSession();
  if (session?.roomId && (!state.invitedRoomId || state.invitedRoomId === session.roomId)) {
    socket.emit(
      'room:join',
      {
        roomId: session.roomId,
        playerName: session.playerName,
        token: session.token || undefined,
      },
      (res) => {
        if (!res.ok) writeSession(null);
      },
    );
  }
});

socket.on('disconnect', () => set({ connected: false }));

socket.on('connect_error', () => {
  set({ connected: false, joining: false });
});

socket.on('room:list', (rooms) => set({ rooms }));
// With a separate backend, invitations must open this frontend, not a server
// tunnel or the backend's optional static copy of the app.
socket.on('server:info', ({ publicUrl, shareEnabled }) => set(
  SERVER_URL ? { publicUrl: window.location.origin, shareEnabled: false } : { publicUrl, shareEnabled },
));

socket.on('room:joined', ({ roomId, playerId, token, spectator }) => {
  clearInvitation();
  writeSession({ roomId, token, playerName: state.playerName });
  set({ savedSessions: readSavedSessions(), roomId, playerId, spectator: !!spectator, error: null, joining: false, invitedRoomId: null });
});

socket.on('room:state', ({ state: game, hostId, roomName }) => {
  set({ game, hostId, roomName });
});

socket.on('room:chat', (message) => {
  const chat = [...state.chat.filter((m) => m.id !== message.id), message].slice(-200);
  set({ chat });
});

socket.on('room:error', ({ message }) => {
  set({ error: message });
  window.setTimeout(() => {
    if (state.error === message) set({ error: null });
  }, 4000);
});

socket.on('room:left', () => {
  writeSession(null);
  set({ roomId: null, playerId: null, spectator: false, game: null, chat: [], hostId: null });
});

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

export function setPlayerName(name: string): void {
  set({ playerName: name });
  writeName(name);
  const session = readSession();
  if (session) writeSession({ ...session, playerName: name });
}

export function setError(message: string | null): void {
  set({ error: message });
}

export function dismissInvitation(): void {
  clearInvitation();
  set({ invitedRoomId: null, error: null });
}

export function createRoom(roomName: string, isPrivate: boolean, settings?: Partial<GameSettings>, templateId?: string): void {
  set({ joining: true, error: null });
  socket.emit(
    'room:create',
    { name: roomName, playerName: state.playerName || 'Player', isPrivate, settings, templateId, accountToken: templateId ? accountToken() : undefined },
    (res) => {
      if (!res.ok) set({ error: res.error ?? 'Could not create the room.', joining: false });
    },
  );
}

export function joinRoom(roomId: string): void {
  set({ joining: true, error: null });
  socket.emit('room:join', { roomId: roomId.trim().toUpperCase(), playerName: state.playerName || 'Player' }, (res) => {
    if (!res.ok) set({ error: res.error ?? 'Could not join.', joining: false });
  });
}

export function rejoinSession(session: StoredSession): void {
  if (!state.connected || state.joining || state.roomId) return;
  set({ joining: true, error: null, playerName: session.playerName });
  socket.emit('room:join', session, (res) => {
    if (!res.ok) set({ error: res.error ?? 'Could not rejoin.', joining: false });
  });
}

export function dismissSavedSession(session: StoredSession): void {
  forgetSession(session);
  set({ savedSessions: readSavedSessions() });
}

export function leaveRoom(): void {
  const session = readSession();
  if (session) dismissSavedSession(session);
  socket.emit('room:leave');
  writeSession(null);
  set({ roomId: null, playerId: null, spectator: false, game: null, chat: [], hostId: null });
}

/**
 * Give up while staying in the room. Runs the same engine forfeit as leaving
 * the table (properties back to the bank, cash to zero, game ends if one player
 * is left), but the socket stays put so you can watch the rest of the game.
 */
export function reportBankrupt(): void {
  send({ type: 'resign', reason: 'bankrupt' });
}

export function send(action: GameAction): void {
  socket.emit('room:action', action, (res) => {
    if (!res.ok && res.error) setError(res.error);
  });
}

export function sendChat(text: string): void {
  socket.emit('room:chat', text);
}

export function updateSettings(settings: Partial<GameSettings>): void {
  socket.emit('room:settings', settings);
}

export function addBot(): void {
  socket.emit('room:add_bot');
}

export function kickPlayer(playerId: string): void {
  socket.emit('room:kick', playerId);
}

export function renameTile(tileId: number, name: string): void {
  socket.emit('room:rename_tile', { tileId, name });
}

export function addCard(card: CardInput): void {
  socket.emit('room:add_card', card);
}

export function removeCard(cardId: string): void {
  socket.emit('room:remove_card', cardId);
}

export function refreshRooms(): void {
  socket.emit('lobby:list');
}

const ACCOUNT_KEY = 'marxopoly.account.v1';
let memoryToken = '';
let accountEpoch = 0;
export function accountToken(): string {
  try { return localStorage.getItem(ACCOUNT_KEY) ?? memoryToken; } catch { return memoryToken; }
}
function storeAccountToken(token: string) {
  memoryToken = token;
  try { if (token) localStorage.setItem(ACCOUNT_KEY, token); else localStorage.removeItem(ACCOUNT_KEY); } catch { /* session remains usable in memory */ }
}
export function accountRequest(request: AccountRequest): Promise<boolean> {
  if (!socket.connected || state.accountBusy) return Promise.resolve(false);
  const epoch = accountEpoch;
  set({ accountBusy: true, accountError: null });
  return new Promise(resolve => {
    socket.timeout(30_000).emit('account:request', request, (error: Error | null, result: AccountResult) => {
      // Another tab may have signed out or switched accounts while this request ran.
      if (epoch !== accountEpoch) {
        set({ accountBusy: false });
        if (accountToken()) void accountRequest({ action: 'restore', token: accountToken() });
        resolve(false); return;
      }
      if (error || !result?.ok) {
        if (result?.expired) { storeAccountToken(''); set({ account: null }); }
        set({ accountBusy: false, accountError: error ? 'No response. Reconnect and try again.' : result.error ?? 'Account request failed.' });
        resolve(false); return;
      }
      if (result.token) storeAccountToken(result.token);
      if (request.action === 'logout') { storeAccountToken(''); set({ account: null }); }
      else if (result.username) {
        set({ account: { username: result.username, templates: result.templates ?? [] } });
        if (!state.playerName) setPlayerName(result.username);
      }
      set({ accountBusy: false });
      resolve(true);
    });
  });
}
window.addEventListener('storage', event => {
  if (event.key !== ACCOUNT_KEY && event.key !== null) return;
  accountEpoch++;
  memoryToken = '';
  set({ account: null });
  if (accountToken()) void accountRequest({ action: 'restore', token: accountToken() });
});
