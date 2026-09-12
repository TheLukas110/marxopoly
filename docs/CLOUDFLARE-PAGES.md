# Deploy Common Ground

The frontend runs on Cloudflare Pages. Multiplayer runs on a **separate, always-on
Node.js server** with HTTPS and WebSocket support. Pages cannot run this repository's
Express/Socket.IO server. You need both services for a playable deployment.

## Review develop first

The implementation branch is `develop`, based on `origin/main` at `904c024`.
Build the frontend and backend from the **same commit**: their board data and rules
must match. For review, use a separate staging backend running `develop`; do not
point the new frontend at an older production backend.

For an existing Pages project, leave its production branch as `main`, and enable
preview builds for `develop`. Set the backend URL in the **Preview** environment.
Open `https://develop.YOUR-PROJECT.pages.dev` to review the changes. A preview URL
is publicly accessible unless you protect it with Cloudflare Access.

For a new project, create a staging Pages project with production branch `develop`.
Its URL is `https://YOUR-STAGING-PROJECT.pages.dev`. Create/configure the production
project for `main` when you are ready. Nothing in this repository automatically
merges branches or deploys a backend.

## 1. Host the Node.js game server

Use a Node.js host that supports a long-running process and WebSocket upgrades.
Configure its repository root as this repository's root and select `develop` for staging.

| Setting | Value |
| --- | --- |
| Node.js | `22` |
| Install/build command | `corepack enable && pnpm install --frozen-lockfile && pnpm build:server` |
| Start command | `pnpm start` |
| Health check | `/health` |
| Instances | **1** |
| Environment | `NODE_ENV=production`, `SHARE=0` |
| Port | Use your host's supplied `PORT`; otherwise `3001` |
| Allowed frontend origins | `CLIENT_ORIGIN=https://YOUR-STAGING-PROJECT.pages.dev,https://develop.YOUR-PROJECT.pages.dev` |

Replace the example origins with the ones you actually use, with no trailing slash.
Add the production Pages URL and custom domain to the production backend's list
when ready. The allowlist is exact: arbitrary `*.pages.dev` sites and per-commit
preview URLs are not automatically trusted. Use the stable `develop` alias or
explicitly add a needed preview URL. Both polling and WebSocket upgrades enforce
the allowlist. Non-browser clients without an Origin header remain supported;
this policy is not user authentication.

The server must have a public HTTPS URL, for example
`https://YOUR-GAME-SERVER.example.com`. Verify that `/health` returns `{"ok":true,...}`.
Your host's proxy must pass WebSocket upgrades and allow long-lived connections.
No ngrok token or local machine is needed.

Rooms live in memory. Restarts/deployments lose games, and multiple replicas have
separate room lists. Keep one instance; disable sleep/scale-to-zero for active games.
Persistent rooms or horizontal scaling would require another backend change.
The repository's Dockerfile remains an alternative for hosts that accept containers.

## 2. Configure Cloudflare Pages

Connect the Git repository in **Workers & Pages → Pages → Import an existing Git repository**.
Use these settings at the repository root:

| Setting | Value |
| --- | --- |
| Framework preset | `None` |
| Root directory | Repository root (leave blank) |
| Build command | `pnpm install --frozen-lockfile && pnpm build:pages` |
| Build output directory | `packages/client/dist` |
| `NODE_VERSION` | `22` |
| `PNPM_VERSION` | `10.28.0` |
| `SKIP_DEPENDENCY_INSTALL` | `1` (the build command installs explicitly) |
| `VITE_SERVER_URL` | The backend's HTTPS origin, e.g. `https://YOUR-GAME-SERVER.example.com` |

Set variables separately for **Preview** and **Production**. Vite embeds
`VITE_SERVER_URL` into the browser bundle at build time; changing it requires a
rebuild. It is public configuration, not a secret. Use an origin only, with no
`/socket.io` suffix or other path. The Pages build fails on missing, HTTP, or
localhost values so a broken default cannot silently ship.

Pages uploads only the client output. Its `_redirects` file serves `/impressum`
through React, and `_headers` supplies browser headers and immutable asset caching.
Invitations use the frontend origin even if a backend advertises a tunnel URL.
There is no Pages Function or Worker to configure and no Pages start command.

## 3. Verify before production

On the preview site, create a private table and open its copied invitation in a
second browser/profile. Join, start a game, roll, chat, and refresh the guest tab
to verify reconnect. Open `/impressum` directly. Check both desktop and mobile,
and switch between 2D and 3D. Changing the backend URL requires rebuilding Pages.

Local checks:

```bash
pnpm install --frozen-lockfile
pnpm build
pnpm typecheck
pnpm test
VITE_SERVER_URL=https://YOUR-GAME-SERVER.example.com pnpm build:pages
```

With a built server running, the integration check supports separate origins:

```bash
SMOKE_CLIENT_ORIGIN=https://develop.YOUR-PROJECT.pages.dev node packages/client/invitations.smoke.mjs https://YOUR-GAME-SERVER.example.com https://develop.YOUR-PROJECT.pages.dev
```

When approved, merge `develop` into `main`, deploy the matching backend revision,
and let Pages build `main` with the production backend URL. Schedule backend
updates between games. No live deployment was performed by this change.

Before public release, replace the sample operator details in
`packages/client/src/imprint.ts` and review [the outstanding IP issues](IP-REVIEW.md).

## Sources

- [Pages build configuration](https://developers.cloudflare.com/pages/configuration/build-configuration/)
- [Build image and environment overrides](https://developers.cloudflare.com/pages/configuration/build-image/)
- [Preview deployments and branch aliases](https://developers.cloudflare.com/pages/configuration/preview-deployments/)
- [Pages redirects](https://developers.cloudflare.com/pages/configuration/redirects/)
- [Pages headers](https://developers.cloudflare.com/pages/configuration/headers/)
- [Durable Objects require a separate Worker for Pages](https://developers.cloudflare.com/pages/functions/bindings/#durable-objects)
