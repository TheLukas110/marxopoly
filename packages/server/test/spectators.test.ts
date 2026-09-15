import assert from 'node:assert/strict';
import { test } from 'node:test';
import { RoomManager } from '../src/rooms.js';
import { config } from '../src/config.js';

function runningRoom(manager: RoomManager) {
  const created = manager.create({ roomName: 'Watch test', playerName: 'Host', isPrivate: true });
  const guest = manager.join(created.room.id, 'Player', undefined, 'player-socket');
  assert.ok(guest.ok && !('spectator' in guest));
  if (!guest.ok || 'spectator' in guest) throw new Error('player could not join');
  assert.equal(manager.dispatch(created.room, created.playerId, { type: 'start_game' }), null);
  return { ...created, guestId: guest.playerId };
}

test('spectator policy enforces roles, closing and the reserved-session limit', t => {
  const manager = new RoomManager();
  t.after(() => manager.stop());
  const { room, playerId: hostId, guestId } = runningRoom(manager);
  const playerCount = room.state.players.length;

  assert.match(manager.updateSpectatorPolicy(room, guestId, { maxSpectators: 1 }) ?? '', /only the host/i);
  assert.equal(manager.updateSpectatorPolicy(room, hostId, { maxSpectators: 1, accepting: true }), null);
  const viewer = manager.join(room.id, 'Viewer One', undefined, 'viewer-one');
  assert.ok(viewer.ok && 'spectator' in viewer);
  if (!viewer.ok || !('spectator' in viewer)) return;
  assert.equal(room.state.players.length, playerCount, 'spectators must never consume player seats');
  assert.equal(room.spectators.get(viewer.playerId)?.name, 'Viewer One');
  assert.match(manager.dispatch(room, viewer.playerId, { type: 'roll_dice' }, true) ?? '', /cannot take actions/i);
  manager.chat(room, viewer.playerId, 'spectator message');
  assert.equal(room.chat.length, 0);

  const full = manager.join(room.id, 'Viewer Two', undefined, 'viewer-two');
  assert.ok(!full.ok && /spectator limit/i.test(full.error));
  assert.equal(manager.updateSpectatorPolicy(room, hostId, { accepting: false, maxSpectators: 10 }), null);
  const closed = manager.join(room.id, 'Viewer Two', undefined, 'viewer-two');
  assert.ok(!closed.ok && /not accepting/i.test(closed.error));
});

test('spectators reconnect with the same role and hosts alone can remove them', t => {
  const manager = new RoomManager();
  t.after(() => manager.stop());
  const { room, playerId: hostId, guestId } = runningRoom(manager);
  const joined = manager.join(room.id, 'Returning Viewer', undefined, 'viewer-old');
  assert.ok(joined.ok && 'spectator' in joined);
  if (!joined.ok || !('spectator' in joined)) return;

  manager.markSpectatorDisconnected(room, joined.playerId);
  assert.equal(room.spectators.get(joined.playerId)?.connected, false);
  manager.updateSpectatorPolicy(room, hostId, { accepting: false, maxSpectators: 0 });
  const recovered = manager.join(room.id, 'Ignored rename', joined.token, 'viewer-new');
  assert.ok(recovered.ok && 'spectator' in recovered);
  if (!recovered.ok || !('spectator' in recovered)) return;
  assert.equal(recovered.playerId, joined.playerId);
  assert.equal(room.spectators.get(joined.playerId)?.connected, true);
  assert.equal(room.spectators.get(joined.playerId)?.name, 'Returning Viewer');
  assert.match(manager.kickSpectator(room, guestId, joined.playerId) ?? '', /only the host/i);
  assert.equal(manager.kickSpectator(room, hostId, joined.playerId), null);
  assert.equal(room.spectators.has(joined.playerId), false);
  const rejectedToken = manager.join(room.id, 'Returning Viewer', joined.token, 'viewer-third');
  assert.ok(!rejectedToken.ok);
});

test('disconnected spectator reservations expire after the reconnect grace period', t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const manager = new RoomManager();
  t.after(() => manager.stop());
  const { room } = runningRoom(manager);
  const viewer = manager.join(room.id, 'Temporary Viewer', undefined, 'viewer');
  assert.ok(viewer.ok && 'spectator' in viewer);
  if (!viewer.ok || !('spectator' in viewer)) return;
  manager.markSpectatorDisconnected(room, viewer.playerId);
  t.mock.timers.tick(config.reconnectGraceMs);
  assert.equal(room.spectators.has(viewer.playerId), false);
});
