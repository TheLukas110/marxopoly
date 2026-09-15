import assert from 'node:assert/strict';
import { test } from 'node:test';
import { RoomManager } from '../src/rooms.js';
import { config } from '../src/config.js';

test('closing the host tab keeps a private lobby and restores the same seat', t => {
  const manager = new RoomManager();
  t.after(() => manager.stop());
  const { room, playerId, token } = manager.create({ roomName: 'Private', playerName: 'Ada', isPrivate: true, socketId: 'old' });
  manager.markDisconnected(room, playerId);
  assert.equal(manager.get(room.id), room);
  assert.equal(room.state.players[0]!.connected, false);
  assert.ok(room.dropTimers.has(playerId));
  const result = manager.join(room.id, 'Ada', token, 'new');
  assert.ok(result.ok && 'playerId' in result);
  if (!result.ok || !('playerId' in result)) return;
  assert.equal(result.playerId, playerId);
  assert.equal(room.hostId, playerId);
  assert.equal(room.state.players.length, 1);
  assert.equal(room.state.players[0]!.connected, true);
  assert.equal(room.dropTimers.size, 0);
});

test('rejoining mid-game preserves money, property and player identity', t => {
  const manager = new RoomManager();
  t.after(() => manager.stop());
  const { room, playerId, token } = manager.create({ roomName: 'Test', playerName: 'Ada', isPrivate: false, socketId: 'old' });
  manager.join(room.id, 'Bob', undefined, 'bob');
  room.state.phase = 'post_roll';
  room.state.players[0]!.cash = 777;
  room.state.deeds[1]!.ownerId = playerId;
  manager.markDisconnected(room, playerId);
  const result = manager.join(room.id, 'Ada', token, 'new');
  assert.ok(result.ok && 'playerId' in result && result.playerId === playerId);
  assert.equal(room.state.players[0]!.cash, 777);
  assert.equal(room.state.deeds[1]!.ownerId, playerId);
  assert.equal(room.state.players[0]!.bankrupt, false);
  assert.equal(room.spectatorSockets.size, 0);
});

test('reconnect preserves a pending card and only its drawer can resolve it once', t => {
  const manager = new RoomManager();
  t.after(() => manager.stop());
  const { room, playerId, token } = manager.create({
    roomName: 'Cards', playerName: 'Ada', isPrivate: true, socketId: 'old',
  });
  const joined = manager.join(room.id, 'Bob', undefined, 'bob');
  assert.ok(joined.ok && 'playerId' in joined);
  if (!joined.ok || !('playerId' in joined)) return;

  const card = room.state.cards.find(candidate => candidate.deck === 'fortune'
    && candidate.effect.kind === 'cash' && candidate.effect.amount > 0)!;
  room.state.phase = 'awaiting_card';
  room.state.turnSeat = room.state.players.find(player => player.id === playerId)!.seat;
  room.state.hasRolled = true;
  room.state.dice = [1, 2];
  room.state.drawnCard = {
    deck: card.deck, cardId: card.id, playerId, status: 'pending',
  };
  const beforeCash = room.state.players.find(player => player.id === playerId)!.cash;

  manager.markDisconnected(room, playerId);
  const recovered = manager.join(room.id, 'Ada', token, 'new');
  assert.ok(recovered.ok && 'playerId' in recovered && recovered.playerId === playerId);
  assert.equal(room.state.drawnCard?.status, 'pending');
  assert.match(manager.dispatch(room, joined.playerId, { type: 'confirm_card' }) ?? '', /not your card/i);
  assert.equal(manager.dispatch(room, playerId, { type: 'confirm_card' }), null);
  assert.equal(room.state.drawnCard?.status, 'resolved');
  assert.equal(room.state.players.find(player => player.id === playerId)!.cash, beforeCash + card.effect.amount);
  assert.match(manager.dispatch(room, playerId, { type: 'confirm_card' }) ?? '', /no card waiting/i);
  assert.equal(room.state.players.find(player => player.id === playerId)!.cash, beforeCash + card.effect.amount);
});

test('invalid and expired recovery tokens cannot silently create a new player', t => {
  const manager = new RoomManager();
  t.after(() => manager.stop());
  const { room, playerId, token } = manager.create({ roomName: 'Test', playerName: 'Ada', isPrivate: false, socketId: 'old' });
  assert.equal(manager.join(room.id, 'Ada', 'invalid', 'new').ok, false);
  room.tokenExpiry.set(playerId, 0);
  assert.equal(manager.join(room.id, 'Ada', token, 'new').ok, false);
  assert.equal(room.state.players.length, 1);
});

test('abandoned lobby seats are released after the grace period', t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const manager = new RoomManager();
  t.after(() => manager.stop());
  const { room, playerId } = manager.create({ roomName: 'Test', playerName: 'Ada', isPrivate: true, socketId: 'old' });
  manager.markDisconnected(room, playerId);
  t.mock.timers.tick(config.reconnectGraceMs);
  assert.equal(manager.get(room.id), undefined);
});

test('explicit leave cancels recovery and its pending cleanup timer', t => {
  const manager = new RoomManager();
  t.after(() => manager.stop());
  const { room, playerId, token } = manager.create({ roomName: 'Test', playerName: 'Ada', isPrivate: false, socketId: 'old' });
  manager.join(room.id, 'Bob', undefined, 'bob');
  manager.markDisconnected(room, playerId);
  manager.leave(room, playerId);
  assert.equal(room.dropTimers.size, 0);
  assert.equal(room.tokens.has(playerId), false);
  assert.equal(manager.join(room.id, 'Ada', token, 'new').ok, false);
});

test('expired in-game reservation forfeits and revokes the recovery token', t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const manager = new RoomManager();
  t.after(() => manager.stop());
  const { room, playerId, token } = manager.create({ roomName: 'Test', playerName: 'Ada', isPrivate: false, socketId: 'old' });
  manager.join(room.id, 'Bob', undefined, 'bob');
  room.state.phase = 'post_roll';
  manager.markDisconnected(room, playerId);
  t.mock.timers.tick(config.reconnectGraceMs);
  assert.equal(room.state.players.find(p => p.id === playerId)!.bankrupt, true);
  assert.equal(room.tokens.has(playerId), false);
  assert.equal(manager.join(room.id, 'Ada', token, 'new').ok, false);
});
