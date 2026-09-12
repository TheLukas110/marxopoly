import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { resolveConfig } from 'vite';

test('Pages rejects unusable backend origins and accepts a separate HTTPS backend', async () => {
  const previous = process.env.VITE_SERVER_URL;
  const configFile = fileURLToPath(new URL('./vite.config.ts', import.meta.url));
  try {
    for (const value of ['', 'not-a-url', 'http://game.example.com', 'https://localhost',
      'https://game.example.com/socket.io', 'https://user:pass@game.example.com',
      'https://game.example.com?token=secret', 'https://game.example.com#fragment']) {
      process.env.VITE_SERVER_URL = value;
      await assert.rejects(resolveConfig({ configFile, mode: 'pages', logLevel: 'silent' }, 'build'),
        /VITE_SERVER_URL/);
    }
    process.env.VITE_SERVER_URL = 'https://game.example.com';
    const config = await resolveConfig({ configFile, mode: 'pages', logLevel: 'silent' }, 'build');
    assert.equal(config.env.VITE_SERVER_URL, 'https://game.example.com');
    assert.equal(config.build.sourcemap, false);
    process.env.VITE_SERVER_URL = '';
    await resolveConfig({ configFile, mode: 'production', logLevel: 'silent' }, 'build');
  } finally {
    if (previous === undefined) delete process.env.VITE_SERVER_URL;
    else process.env.VITE_SERVER_URL = previous;
  }
});
