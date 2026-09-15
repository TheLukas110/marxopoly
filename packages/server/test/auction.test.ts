import assert from 'node:assert/strict';
import { test } from 'node:test';
import { RoomManager } from '../src/rooms.js';
import { publicState } from '../src/public-state.js';
import { decideBotAction } from '../src/bot.js';

test('sealed bids are visible only to their author and survive reconnect', t => {
  const manager = new RoomManager();
  t.after(() => manager.stop());
  const { room, playerId: hostId } = manager.create({
    roomName: 'Sealed', playerName: 'Ada', isPrivate: true,
  });
  const guest = manager.join(room.id, 'Brix', undefined, 'guest');
  const third = manager.join(room.id, 'Cleo', undefined, 'third');
  assert.ok(guest.ok && 'playerId' in guest);
  assert.ok(third.ok && 'playerId' in third);
  if (!guest.ok || !('playerId' in guest) || !third.ok || !('playerId' in third)) return;
  assert.equal(manager.updateSettings(room, hostId, { auctionMode: 'sealed', turnSeconds: 90 }), null);
  assert.equal(manager.dispatch(room, hostId, { type: 'start_game' }), null);
  room.state.players.find(player => player.id === hostId)!.position = 1;
  room.state.phase = 'awaiting_buy';
  assert.equal(manager.dispatch(room, hostId, { type: 'decline_property' }), null);
  assert.equal(manager.dispatch(room, guest.playerId, { type: 'bid', amount: 123 }), null);

  assert.deepEqual(publicState(room.state, guest.playerId).auction?.sealedBids, { [guest.playerId]: 123 });
  assert.deepEqual(publicState(room.state, hostId).auction?.sealedBids, {});
  assert.deepEqual(publicState(room.state).auction?.sealedBids, {});

  const token = room.tokens.get(guest.playerId)!;
  manager.markDisconnected(room, guest.playerId);
  const recovered = manager.join(room.id, 'Brix', token, 'guest-new');
  assert.ok(recovered.ok && 'playerId' in recovered && recovered.playerId === guest.playerId);
  assert.deepEqual(publicState(room.state, guest.playerId).auction?.sealedBids, { [guest.playerId]: 123 });
  assert.match(manager.dispatch(room, guest.playerId, { type: 'pass_bid' }) ?? '', /already submitted/i);
});

test('room timeout evaluates submitted sealed bids and passes missing players', t => {
  const manager = new RoomManager();
  t.after(() => manager.stop());
  const { room, playerId: hostId } = manager.create({
    roomName: 'Timeout', playerName: 'Ada', isPrivate: true,
  });
  const guest = manager.join(room.id, 'Brix', undefined, 'guest');
  assert.ok(guest.ok && 'playerId' in guest);
  if (!guest.ok || !('playerId' in guest)) return;
  manager.updateSettings(room, hostId, { auctionMode: 'sealed', turnSeconds: 90 });
  manager.dispatch(room, hostId, { type: 'start_game' });
  room.state.players.find(player => player.id === hostId)!.position = 1;
  room.state.phase = 'awaiting_buy';
  manager.dispatch(room, hostId, { type: 'decline_property' });
  manager.dispatch(room, guest.playerId, { type: 'bid', amount: 77 });
  room.state.auction!.deadline = 1;

  manager.tick(2);

  assert.equal(room.state.auction, null);
  assert.equal(room.state.deeds[1]!.ownerId, guest.playerId);
});

test('bots make one legal decision in sealed auctions', t => {
  const manager = new RoomManager();
  t.after(() => manager.stop());
  const { room, playerId: hostId } = manager.create({
    roomName: 'Bots', playerName: 'Ada', isPrivate: true,
  });
  assert.equal(manager.addBot(room, hostId), null);
  const bot = room.state.players.find(player => player.isBot)!;
  manager.updateSettings(room, hostId, { auctionMode: 'sealed', turnSeconds: 0 });
  manager.dispatch(room, hostId, { type: 'start_game' });
  room.state.players.find(player => player.id === hostId)!.position = 1;
  room.state.phase = 'awaiting_buy';
  manager.dispatch(room, hostId, { type: 'decline_property' });

  const action = decideBotAction(room.state, bot.id);
  assert.ok(action?.type === 'bid' || action?.type === 'pass_bid');
  assert.equal(manager.dispatch(room, bot.id, action), null);
  assert.ok(room.state.auction?.submittedIds.includes(bot.id));
  assert.equal(decideBotAction(room.state, bot.id), null);
});
