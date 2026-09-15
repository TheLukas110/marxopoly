import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { createGame } from '@marxopoly/shared';

const server = await createServer({
  root: fileURLToPath(new URL('.', import.meta.url)),
  configFile: false,
  server: { middlewareMode: true, hmr: false },
  appType: 'custom',
});
after(() => server.close());

const reminders = await server.ssrLoadModule('/src/turn-reminders.ts');

function game() {
  return createGame('REMINDERS', [
    { id: 'me', name: 'Ada' },
    { id: 'other', name: 'Brix' },
  ]);
}

test('a turn and debt each produce one event despite repeated state updates', () => {
  const state = game();
  const tracker = new reminders.TurnReminderTracker();
  assert.equal(tracker.next(state, 'me', false), null);

  state.phase = 'pre_roll';
  assert.equal(tracker.next(state, 'me', false)?.kind, 'turn');
  state.version += 1;
  assert.equal(tracker.next(state, 'me', false), null);
  state.phase = 'awaiting_card';
  assert.equal(tracker.next(state, 'me', false), null);

  state.phase = 'debt';
  state.debt = { debtorId: 'me', creditorId: null, amount: 200, reason: 'Tax' };
  assert.equal(tracker.next(state, 'me', false)?.kind, 'debt');
  state.version += 1;
  assert.equal(tracker.next(state, 'me', false), null);

  state.phase = 'post_roll';
  state.debt = null;
  assert.equal(tracker.next(state, 'me', false), null, 'resuming the same turn is not a new turn');
  state.turnSeat = 1;
  assert.equal(tracker.next(state, 'me', false), null);
  state.turnSeat = 0;
  state.phase = 'pre_roll';
  assert.equal(tracker.next(state, 'me', false)?.kind, 'turn', 'the next round is a new turn');
});

test('title state excludes spectators, bots, bankrupt players and foreign turns', () => {
  const state = game();
  state.phase = 'pre_roll';
  assert.equal(reminders.currentTurnReminder(state, 'me', false)?.title, 'YOUR TURN');
  assert.equal(reminders.currentTurnReminder(state, 'other', false), null);
  assert.equal(reminders.currentTurnReminder(state, 'me', true), null);

  state.players[0].isBot = true;
  assert.equal(reminders.currentTurnReminder(state, 'me', false), null);
  state.players[0].isBot = false;
  state.players[0].bankrupt = true;
  assert.equal(reminders.currentTurnReminder(state, 'me', false), null);
});

test('own debt takes precedence even when another seat owns the regular turn', () => {
  const state = game();
  state.phase = 'debt';
  state.turnSeat = 1;
  state.debt = { debtorId: 'me', creditorId: 'other', amount: 75, reason: 'Payment' };
  assert.equal(reminders.currentTurnReminder(state, 'me', false)?.kind, 'debt');
});

test('browser delivery requires an inactive tab, opt-in and granted permission', () => {
  const event = { kind: 'turn', title: 'YOUR TURN', body: 'Move now.' };
  const delivered = [];
  const target = {
    visibilityState: 'visible', permission: 'granted',
    notify(title, options) { delivered.push([title, options.body]); },
  };
  assert.equal(reminders.deliverTurnReminder(event, true, target), false);
  target.visibilityState = 'hidden';
  target.permission = 'denied';
  assert.equal(reminders.deliverTurnReminder(event, true, target), false);
  target.permission = 'granted';
  assert.equal(reminders.deliverTurnReminder(event, false, target), false);
  assert.equal(reminders.deliverTurnReminder(event, true, target), true);
  assert.deepEqual(delivered, [['Marxopoly — your turn', 'Move now.']]);
});

test('notification permission is requested only by explicit enablement', async () => {
  const notificationDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'Notification');
  const storageDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  let requests = 0;
  class FakeNotification {
    static permission = 'default';
    static async requestPermission() {
      requests += 1;
      FakeNotification.permission = 'granted';
      return 'granted';
    }
  }
  const values = new Map();
  try {
    Object.defineProperty(globalThis, 'Notification', { configurable: true, value: FakeNotification });
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value),
      removeItem: (key) => values.delete(key),
    } });
    const preferences = await server.ssrLoadModule('/src/turn-reminder-preferences.ts?permission-test');
    assert.equal(requests, 0, 'loading and reading preferences must not prompt');
    assert.equal(preferences.getTurnNotificationsEnabled(), false);
    assert.equal(await preferences.enableTurnNotifications(), 'granted');
    assert.equal(requests, 1);
    assert.equal(preferences.getTurnNotificationsEnabled(), true);
    preferences.disableTurnNotifications();
    assert.equal(requests, 1);
    assert.equal(preferences.getTurnNotificationsEnabled(), false);
  } finally {
    if (notificationDescriptor) Object.defineProperty(globalThis, 'Notification', notificationDescriptor);
    else delete globalThis.Notification;
    if (storageDescriptor) Object.defineProperty(globalThis, 'localStorage', storageDescriptor);
    else delete globalThis.localStorage;
  }
});
