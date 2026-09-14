import assert from 'node:assert/strict';
import { test } from 'node:test';
import { RoomManager } from '../src/rooms.js';

test('chat preserves messages beyond player-name length and enforces its 300-character limit', t => {
  const manager = new RoomManager();
  t.after(() => manager.stop());
  const { room, playerId } = manager.create({ roomName: 'Chat', playerName: 'Alex', isPrivate: true, socketId: 'host' });
  const emitted: string[] = [];
  manager.onChat = (_room, message) => emitted.push(message.text);
  const message = 'Would you trade your second depot for my property and some cash?';
  manager.chat(room, playerId, message);
  assert.equal(room.chat[0]?.text, message);
  assert.deepEqual(emitted, [message]);
  manager.chat(room, playerId, '  Hello\n\tfrom the table  ');
  assert.equal(room.chat[1]?.text, 'Hello from the table');
  manager.chat(room, playerId, 'a'.repeat(301));
  assert.equal(room.chat[2]?.text.length, 300);
  manager.chat(room, playerId, ' \n ');
  manager.chat(room, 'spectator-without-seat', 'Hello');
  assert.equal(room.chat.length, 3);
});
