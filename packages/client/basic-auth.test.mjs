import assert from 'node:assert/strict';
import { test } from 'node:test';
import { onRequest } from '../../functions/_middleware.js';
import { readFile } from 'node:fs/promises';

const env = { BASIC_AUTH_USER: 'reviewer', BASIC_AUTH_PASS: 'päss:word' };
const basic = credentials => `Basic ${Buffer.from(credentials).toString('base64')}`;
async function request(header, bindings = env, url = 'https://preview.example.com/') {
  let calls = 0;
  const response = await onRequest({
    request: new Request(url, { headers: header ? { Authorization: header } : {} }),
    env: bindings,
    next: async () => {
      calls++;
      return new Response('protected content', {
        status: 201, headers: { 'Cache-Control': 'public, max-age=31536000', 'X-Test': 'preserved' },
      });
    },
  });
  return { response, calls };
}

test('missing, wrong and malformed credentials challenge without serving content', async () => {
  for (const header of [undefined, basic('reviewer:wrong'), basic('other:päss:word'),
    'Bearer token', 'Basic !!!', 'Basic a', 'Basic /w==', basic('reviewer')]) {
    const { response, calls } = await request(header);
    assert.equal(response.status, 401);
    assert.match(response.headers.get('WWW-Authenticate'), /^Basic realm="Protected"/);
    assert.equal(response.headers.get('Cache-Control'), 'private, no-store');
    assert.equal(calls, 0);
  }
});

test('valid UTF-8 credentials and colon-containing passwords pass through without caching', async () => {
  const { response, calls } = await request(basic('reviewer:päss:word').replace('Basic', 'bAsIc'));
  assert.equal(response.status, 201);
  assert.equal(await response.text(), 'protected content');
  assert.equal(response.headers.get('X-Test'), 'preserved');
  assert.equal(response.headers.get('Cache-Control'), 'private, no-store');
  assert.equal(calls, 1);
});

test('fallback credentials only work on loopback and explicit empty secrets deny access', async () => {
  for (const bindings of [{}, { BASIC_AUTH_USER: 'local' }, { BASIC_AUTH_PASS: 'local-test' }]) {
    assert.equal((await request(basic('local:local-test'), bindings)).response.status, 401);
  }
  for (const host of ['localhost', '127.0.0.1', '[::1]']) {
    assert.equal((await request(basic('local:local-test'), {}, `http://${host}:8788/`)).calls, 1);
  }
  assert.equal((await request(basic('local:local-test'), { BASIC_AUTH_PASS: '' }, 'http://localhost/')).calls, 0);
});

test('all Pages routes, including direct asset URLs, require authentication', async () => {
  const routes = JSON.parse(await readFile(new URL('./public/_routes.json', import.meta.url), 'utf8'));
  assert.deepEqual(routes, { version: 1, include: ['/*'], exclude: [] });
  for (const path of ['/', '/assets/app.js', '/world-previews/standard.png', '/anything']) {
    assert.equal((await request(undefined, env, `https://preview.example.com${path}`)).calls, 0);
  }
});
