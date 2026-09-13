// Run: node packages/client/invitations.smoke.mjs [backend-origin] [frontend-origin]
// Set SMOKE_CLIENT_ORIGIN for browser Origin checks; SMOKE_TRANSPORT=polling tests fallback.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
import { io } from 'socket.io-client';

const source = await readFile(new URL('./src/invitations.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } });
const { invitationUrl, invitedRoom } = await import(`data:text/javascript;base64,${Buffer.from(compiled.outputText).toString('base64')}`);
assert.equal(invitedRoom('?room=%20abc123%20'), 'ABC123');
assert.equal(invitedRoom('?room='), null);
assert.equal(invitedRoom('?other=1'), null);
assert.equal(invitationUrl('https://example.ngrok-free.app/old?token=secret#hash', 'ABC123'),
  'https://example.ngrok-free.app/?room=ABC123');

const origin = process.argv[2] ?? 'http://localhost:3001';
const frontend = process.argv[3] ?? origin;
const clientOrigin = process.env.SMOKE_CLIENT_ORIGIN;
const transport = process.env.SMOKE_TRANSPORT ?? 'websocket';
const sockets = [];
const once = (socket, event) => new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error(`Timed out waiting for ${event}`)), 5000);
  socket.once(event, (value) => { clearTimeout(timer); resolve(value); });
});
const emit = (socket, event, payload) => new Promise((resolve, reject) => {
  socket.timeout(5000).emit(event, payload, (err, result) => err ? reject(err) : resolve(result));
});
async function connect() {
  const socket = io(origin, { autoConnect: false, reconnection: false, transports: [transport],
    extraHeaders: clientOrigin ? { Origin: clientOrigin } : undefined });
  sockets.push(socket);
  const info = once(socket, 'server:info');
  const connected = once(socket, 'connect');
  socket.connect();
  await connected;
  assert.equal(typeof (await info).shareEnabled, 'boolean');
  return socket;
}

try {
  if (clientOrigin) {
    const headers = { Origin: clientOrigin };
    const health = await fetch(`${origin}/health`, { headers });
    assert.equal(health.status, 200);
    assert.equal(health.headers.get('access-control-allow-origin'), clientOrigin);
    // An unrelated website must not be able to open either transport.
    const blocked = io(origin, { autoConnect: false, reconnection: false, transports: [transport],
      extraHeaders: { Origin: 'https://unrelated.invalid' } });
    sockets.push(blocked);
    const rejected = once(blocked, 'connect_error');
    blocked.connect();
    await rejected;
    assert.equal(blocked.connected, false);
    blocked.disconnect();
  }
  const host = await connect();
  const hostSeatPromise = once(host, 'room:joined');
  const created = await emit(host, 'room:create', {
    name: 'Invitation smoke test', playerName: 'Host', isPrivate: true,
    settings: { maxPlayers: 2, turnSeconds: 0 },
  });
  assert.equal(created.ok, true);
  const hostSeat = await hostSeatPromise;
  const url = invitationUrl(frontend, created.roomId);
  const page = await fetch(url);
  assert.equal(page.status, 200);
  assert.match(await page.text(), /<div id="root"><\/div>/);

  const guest = await connect();
  const guestSeatPromise = once(guest, 'room:joined');
  const guestStatePromise = once(guest, 'room:state');
  assert.equal((await emit(guest, 'room:join', {
    roomId: invitedRoom(new URL(url).search), playerName: 'Invited guest',
  })).ok, true);
  const guestSeat = await guestSeatPromise;
  assert.notEqual(guestSeat.playerId, hostSeat.playerId);
  assert.notEqual(guestSeat.token, hostSeat.token);
  assert.equal((await guestStatePromise).state.players.some((p) => p.name === 'Invited guest'), true);

  const third = await connect();
  assert.match((await emit(third, 'room:join', { roomId: created.roomId, playerName: 'Third' })).error, /full/i);
  assert.match((await emit(third, 'room:join', { roomId: 'MISSING', playerName: 'Third' })).error, /not exist/i);
  assert.equal((await emit(host, 'room:action', { type: 'start_game' })).ok, true);
  const chat = once(guest, 'room:chat');
  host.emit('room:chat', 'Hello from Pages');
  assert.equal((await chat).text, 'Hello from Pages');
  assert.equal((await emit(host, 'room:action', { type: 'roll_dice' })).ok, true);
  assert.equal((await emit(third, 'room:join', { roomId: created.roomId, playerName: 'Viewer' })).spectator, true);

  const reconnected = await connect();
  const reclaimed = once(reconnected, 'room:joined');
  assert.equal((await emit(reconnected, 'room:join', {
    roomId: created.roomId, playerName: 'Invited guest', token: guestSeat.token,
  })).ok, true);
  assert.equal((await reclaimed).playerId, guestSeat.playerId);
  console.log('PASS: invitation URLs, page delivery, private-room guest joining, full/missing rooms, spectators, and reconnects.');
} finally {
  for (const socket of sockets) {
    if (socket.connected) socket.emit('room:leave');
    socket.disconnect();
  }
}
