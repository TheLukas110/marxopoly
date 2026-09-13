import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

const envDir = fileURLToPath(new URL('../..', import.meta.url));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, envDir, 'VITE_');
  if (mode === 'pages') {
    let backend: URL;
    try {
      backend = new URL(env.VITE_SERVER_URL ?? '');
    } catch {
      throw new Error('Pages requires VITE_SERVER_URL: the public HTTPS origin of your Node.js game server.');
    }
    if (backend.protocol !== 'https:' || backend.username || backend.password ||
        backend.pathname !== '/' || backend.search || backend.hash ||
        ['localhost', '127.0.0.1', '[::1]'].includes(backend.hostname)) {
      throw new Error('VITE_SERVER_URL must be a public HTTPS origin, with no path, credentials, query or fragment.');
    }
  }
  return {
    envDir,
    // The Node-served site always connects to the server serving its page.
    // Pages builds continue to use the separately configured HTTPS backend.
    define: mode === 'standalone' ? { 'import.meta.env.VITE_SERVER_URL': JSON.stringify('') } : undefined,
    plugins: [react()],
    server: {
      port: 5173,
      // For sharing a game through a tunnel, use the production server.
      proxy: {
        '/socket.io': { target: 'http://localhost:3001', ws: true },
        '/api': { target: 'http://localhost:3001' },
      },
    },
    build: {
      outDir: 'dist',
      sourcemap: mode !== 'pages',
    },
  };
});
