import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { createServer } from 'vite';
import { fileURLToPath } from 'node:url';
const server = await createServer({ root: fileURLToPath(new URL('.', import.meta.url)), configFile: false, server: { middlewareMode: true, hmr: false }, appType: 'custom' });
after(() => server.close());
const sessions = await server.ssrLoadModule('/src/sessions.ts');
const storage = () => {
  const values = new Map();
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
};

test('browser closure keeps recoverable seats without autojoining them in another tab', () => {
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: storage() });
  Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, value: storage() });
  const ada = { roomId: 'ABCDEF', token: 'ada-secret', playerName: 'Ada' };
  const bob = { roomId: 'ABCDEF', token: 'bob-secret', playerName: 'Bob' };
  sessions.writeSession(ada);
  assert.deepEqual(sessions.readSession(), ada);
  Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, value: storage() });
  assert.equal(sessions.readSession(), null);
  assert.deepEqual(sessions.readSavedSessions(), [ada]);
  sessions.writeSession(bob);
  assert.deepEqual(sessions.readSavedSessions(), [bob, ada]);
  sessions.writeSession(null); // A displaced tab must not erase the recovered seat.
  assert.deepEqual(sessions.readSavedSessions(), [bob, ada]);
  sessions.forgetSession(bob);
  assert.deepEqual(sessions.readSavedSessions(), [ada]);
  sessions.writeSession({ roomId: 'OTHER', token: '', playerName: 'Viewer' });
  assert.deepEqual(sessions.readSavedSessions(), [ada]);
});

test('malformed or unavailable storage does not prevent playing', () => {
  localStorage.setItem('marxopoly.saved-seats.v1', '[null,{},42]');
  sessionStorage.setItem('marxopoly.session.v1', '{');
  assert.deepEqual(sessions.readSavedSessions(), []);
  assert.equal(sessions.readSession(), null);
  for (const name of ['localStorage', 'sessionStorage']) {
    Object.defineProperty(globalThis, name, { configurable: true, get() { throw new Error('Blocked'); } });
  }
  assert.doesNotThrow(() => sessions.writeSession({ roomId: 'ABCDEF', token: 'secret', playerName: 'Ada' }));
  assert.deepEqual(sessions.readSavedSessions(), []);
  assert.equal(sessions.readSession(), null);
  delete globalThis.localStorage;
  delete globalThis.sessionStorage;
});
