// Run against a built server with an isolated ACCOUNT_DATA_FILE:
// node packages/client/accounts.smoke.mjs http://localhost:3107
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { io } from 'socket.io-client';

const origin = process.argv[2] ?? 'http://localhost:3107';
const sockets = [];
const username = `test_${randomUUID().slice(0, 8)}`;
const password = randomUUID();
async function connect() {
  const socket = io(origin, { reconnection: false, autoConnect: false, transports: ['websocket'] });
  sockets.push(socket);
  await new Promise((resolve, reject) => {
    socket.once('connect', resolve); socket.once('connect_error', reject); socket.connect();
  });
  socket.on('room:state', payload => { socket.game = payload.state; });
  return socket;
}
async function request(socket, event, payload) {
  // Respect the normal per-connection rate limit during this end-to-end check.
  await delay(350);
  return new Promise((resolve, reject) => socket.timeout(5000).emit(event, payload, (error, result) => error ? reject(error) : resolve(result)));
}
const account = (socket, payload) => request(socket, 'account:request', payload);
try {
  const host = await connect();
  const registered = await account(host, { action: 'register', username, password });
  assert.equal(registered.ok, true);
  const token = registered.token;
  const created = await request(host, 'room:create', { name: 'Templates', playerName: 'Host', isPrivate: true });
  assert.equal(created.ok, true);
  host.emit('room:rename_tile', { tileId: 1, name: 'Campus Road' });
  host.emit('room:remove_card', host.game.cards[0].id);
  host.emit('room:add_card', { deck: 'fortune', text: 'Campus grant', effect: { kind: 'cash', amount: 123 } });
  const saved = await account(host, { action: 'save', token, name: 'Campus' });
  assert.equal(saved.ok, true);
  const template = saved.templates[0];
  assert.equal(template.tileNames[1], 'Campus Road');
  assert.ok(template.cards.some(c => c.text === 'Campus grant'));
  const guest = await connect();
  await request(guest, 'room:join', { roomId: created.roomId, playerName: 'Guest' });
  const forbidden = await account(guest, { action: 'save', token, name: 'Not the host' });
  assert.equal(forbidden.ok, false);
  assert.match(forbidden.error, /Only the host/);
  assert.equal((await request(guest, 'room:create', { name: 'Stolen', playerName: 'Guest', isPrivate: true, templateId: template.id })).ok, false);
  const secondDevice = await connect();
  const login = await account(secondDevice, { action: 'login', username, password });
  assert.equal(login.ok, true);
  assert.deepEqual(login.templates, saved.templates);
  const reused = await request(secondDevice, 'room:create', { name: 'Reused', playerName: 'Host again', isPrivate: true, templateId: template.id, accountToken: login.token });
  assert.equal(reused.ok, true);
  assert.deepEqual(secondDevice.game.tileNames, template.tileNames);
  assert.deepEqual(secondDevice.game.cards, template.cards);
  host.emit('room:rename_tile', { tileId: 1, name: 'Revised Campus Road' });
  const updated = await account(host, { action: 'save', token, name: 'Revised', templateId: template.id });
  assert.equal(updated.ok, true);
  assert.equal(updated.templates.length, 1);
  assert.equal(updated.templates[0].tileNames[1], 'Revised Campus Road');
  assert.equal(secondDevice.game.tileNames[1], 'Campus Road');
  const started = await request(host, 'room:action', { type: 'start_game' });
  assert.equal(started.ok, true);
  assert.equal((await account(host, { action: 'save', token, name: 'Too late' })).ok, false);
  assert.equal((await account(secondDevice, { action: 'delete', token: login.token, templateId: template.id })).ok, true);
  assert.equal(secondDevice.game.tileNames[1], 'Campus Road');
  assert.equal((await account(host, { action: 'restore', token })).templates.length, 0);
  assert.equal((await account(host, { action: 'logout', token })).ok, true);
  assert.equal((await account(host, { action: 'restore', token })).expired, true);
  console.log('Account/template smoke test passed: register, login on another device, save, reuse, overwrite, isolation, host/lobby permissions, delete and logout.');
} finally {
  for (const socket of sockets) { socket.emit('room:leave'); socket.disconnect(); }
}
