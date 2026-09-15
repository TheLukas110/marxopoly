import assert from 'node:assert/strict';
import { test } from 'node:test';
import { RoomManager } from '../src/rooms.js';

test('host rule-world choice is shared with joins and survives reconnect', t => {
  const manager = new RoomManager();
  t.after(() => manager.stop());
  const { room, playerId, token } = manager.create({ roomName: 'Worlds', playerName: 'Ada', isPrivate: false });
  assert.equal(manager.updateRuleWorld(room, playerId, 'clockwork'), null);
  assert.equal(room.state.ruleWorld.id, 'clockwork');
  assert.equal(room.state.ruleWorld.board[1]!.name, 'Copper Mews');
  assert.equal(room.state.settings.startingCash, 1750);

  const guest = manager.join(room.id, 'Brix', undefined, 'guest-socket');
  assert.ok(guest.ok && !('spectator' in guest));
  assert.equal(room.state.players[1]!.token, 'key');
  assert.equal(manager.dispatch(room, playerId, { type: 'start_game' }), null);

  manager.markDisconnected(room, playerId);
  const recovered = manager.join(room.id, 'Ada', token, 'new-host-socket');
  assert.ok(recovered.ok && !('spectator' in recovered));
  assert.equal(room.state.ruleWorld.id, 'clockwork');
  assert.equal(room.state.ruleWorld.board[39]!.name, 'Republic Rotunda');
  assert.equal(room.state.cards[0]!.id, 'clock-f01');
});

test('rule-world changes reject unknown ids, non-hosts and started games', t => {
  const manager = new RoomManager();
  t.after(() => manager.stop());
  const { room, playerId } = manager.create({ roomName: 'Worlds', playerName: 'Ada', isPrivate: true });
  const guest = manager.join(room.id, 'Brix', undefined, 'guest-socket');
  assert.ok(guest.ok && !('spectator' in guest));
  if (!guest.ok || 'spectator' in guest) return;
  assert.match(manager.updateRuleWorld(room, guest.playerId, 'clockwork') ?? '', /only the host/i);
  assert.match(manager.updateRuleWorld(room, playerId, 'missing') ?? '', /unknown rule world/i);
  assert.equal(manager.dispatch(room, playerId, { type: 'start_game' }), null);
  assert.match(manager.updateRuleWorld(room, playerId, 'clockwork') ?? '', /locked/i);
});
