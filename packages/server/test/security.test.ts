import assert from 'node:assert/strict';
import { spawn, type ChildProcess } from 'node:child_process';
import { createServer } from 'node:net';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { io, type Socket } from 'socket.io-client';

const ALLOWED_ORIGIN = 'https://protected.example.com';

async function freePort(): Promise<number> {
  const probe = createServer();
  await new Promise<void>((resolve, reject) => {
    probe.once('error', reject);
    probe.listen(0, '127.0.0.1', resolve);
  });
  const address = probe.address();
  assert.ok(address && typeof address === 'object');
  const port = address.port;
  await new Promise<void>((resolve, reject) => probe.close(error => error ? reject(error) : resolve()));
  return port;
}

async function waitForHealth(origin: string, process: ChildProcess): Promise<void> {
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    if (process.exitCode !== null) throw new Error(`Test server exited with ${process.exitCode}.`);
    try {
      if ((await fetch(`${origin}/health`)).ok) return;
    } catch {
      // Server is still starting.
    }
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  throw new Error('Timed out waiting for the test server.');
}

function connect(origin: string, requestOrigin?: string): Promise<Socket> {
  const socket = io(origin, {
    autoConnect: false,
    reconnection: false,
    transports: ['websocket'],
    extraHeaders: requestOrigin ? { Origin: requestOrigin } : undefined,
  });
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Socket connection timed out.')), 5_000);
    socket.once('connect', () => {
      clearTimeout(timer);
      resolve(socket);
    });
    socket.once('connect_error', error => {
      clearTimeout(timer);
      socket.disconnect();
      reject(error);
    });
    socket.connect();
  });
}

function rejectedConnection(origin: string, requestOrigin?: string): Promise<void> {
  const socket = io(origin, {
    autoConnect: false,
    reconnection: false,
    transports: ['websocket'],
    extraHeaders: requestOrigin ? { Origin: requestOrigin } : undefined,
  });
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Socket rejection timed out.')), 5_000);
    socket.once('connect', () => {
      clearTimeout(timer);
      socket.disconnect();
      reject(new Error('Forbidden socket connected.'));
    });
    socket.once('connect_error', () => {
      clearTimeout(timer);
      socket.disconnect();
      resolve();
    });
    socket.connect();
  });
}

function emitAck(socket: Socket, event: string, payload: unknown): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    socket.timeout(5_000).emit(event as never, payload as never, (error: Error | null, result: Record<string, unknown>) => {
      if (error) reject(error);
      else resolve(result);
    });
  });
}

function once<T = Record<string, unknown>>(socket: Socket, event: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timed out waiting for ${event}.`)), 5_000);
    socket.once(event as never, ((value: T) => {
      clearTimeout(timer);
      resolve(value);
    }) as never);
  });
}

test('hosted server enforces its origin and per-socket room boundaries', async t => {
  const port = await freePort();
  const origin = `http://127.0.0.1:${port}`;
  const entry = fileURLToPath(new URL('../src/index.ts', import.meta.url));
  const server = spawn(process.execPath, ['--import', 'tsx', entry], {
    cwd: fileURLToPath(new URL('..', import.meta.url)),
    env: {
      ...process.env,
      PORT: String(port),
      NODE_ENV: 'production',
      CLIENT_ORIGIN: ALLOWED_ORIGIN,
      SERVE_CLIENT: '0',
      SHARE: '0',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let diagnostics = '';
  server.stdout?.on('data', chunk => { diagnostics += chunk.toString(); });
  server.stderr?.on('data', chunk => { diagnostics += chunk.toString(); });
  const sockets: Socket[] = [];
  t.after(async () => {
    for (const socket of sockets) socket.disconnect();
    if (server.exitCode === null) {
      const exited = new Promise(resolve => server.once('exit', resolve));
      server.kill();
      await exited;
    }
  });

  try {
    await waitForHealth(origin, server);
    assert.equal((await fetch(`${origin}/`)).status, 404, 'backend must not expose an unprotected client');
    assert.equal((await fetch(`${origin}/api/rooms`)).status, 403);
    assert.equal((await fetch(`${origin}/api/rooms`, { headers: { Origin: 'https://hostile.invalid' } })).status, 403);
    assert.equal((await fetch(`${origin}/api/rooms`, { headers: { Origin: ALLOWED_ORIGIN } })).status, 200);
    await rejectedConnection(origin);
    await rejectedConnection(origin, 'https://hostile.invalid');

    const host = await connect(origin, ALLOWED_ORIGIN);
    sockets.push(host);
    const hostJoined = once(host, 'room:joined');
    const created = await emitAck(host, 'room:create', {
      name: 'Protected room', playerName: 'Host', isPrivate: true,
      settings: { maxPlayers: 4, turnSeconds: 0 },
    });
    assert.equal(created.ok, true);
    const roomId = created.roomId as string;
    await hostJoined;

    const duplicate = await emitAck(host, 'room:create', {
      name: 'Leaked room', playerName: 'Host', isPrivate: false,
    });
    assert.equal(duplicate.ok, false);
    assert.match(String(duplicate.error), /leave your current table/i);

    const invalidAction = await emitAck(host, 'room:action', null);
    assert.deepEqual(invalidAction, { ok: false, error: 'Invalid action.' });
    assert.equal((await fetch(`${origin}/health`)).status, 200, 'malformed events must not crash the process');

    const guest = await connect(origin, ALLOWED_ORIGIN);
    sockets.push(guest);
    const guestJoined = once(guest, 'room:joined');
    assert.equal((await emitAck(guest, 'room:join', { roomId, playerName: 'Guest' })).ok, true);
    const guestSeat = await guestJoined;

    const kicked = once<{ reason: string }>(guest, 'room:left');
    host.emit('room:kick', guestSeat.playerId);
    assert.match((await kicked).reason, /removed/i);
    const afterKick = await emitAck(guest, 'room:create', {
      name: 'Fresh room', playerName: 'Guest', isPrivate: true,
    });
    assert.equal(afterKick.ok, true, 'a kicked socket must be detached and may safely join elsewhere');

    const noAck = await connect(origin, ALLOWED_ORIGIN);
    sockets.push(noAck);
    noAck.emit('room:join', { roomId, playerName: 'Ghost' });
    await new Promise(resolve => setTimeout(resolve, 50));
    const joined = once(noAck, 'room:joined');
    assert.equal((await emitAck(noAck, 'room:join', { roomId, playerName: 'Real guest' })).ok, true);
    await joined;
  } catch (error) {
    throw new Error(`${error instanceof Error ? error.message : String(error)}\nServer output:\n${diagnostics}`);
  }
});
