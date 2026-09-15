# Deploy Common Ground

The frontend runs on Cloudflare Pages. Multiplayer runs on a **separate, always-on
Node.js server** with HTTPS and WebSocket support. Pages cannot run this repository's
Express/Socket.IO server. You need both services for a playable deployment.

## Current production targets

| Role | Origin |
| --- | --- |
| Custom frontend | `https://www.marxopoly.de` |
| Cloudflare Pages | `https://marxopoly.pages.dev` |
| Render backend | `https://marxopoly.onrender.com` |

Use `VITE_SERVER_URL=https://marxopoly.onrender.com` for the Pages production
build. The Render production service must use
`CLIENT_ORIGIN=https://www.marxopoly.de,https://marxopoly.pages.dev`. These are
origins, so they deliberately have no trailing slash.

External verification on 2026-09-15 found that Pages correctly returned `401`
for both `/` and a direct asset request, while Render returned `200` from
`/health`, `404` from `/`, and `403` for requests without an allowed Origin.
At that time, Render also rejected both intended frontend origins and the custom
domain returned `NXDOMAIN`; the Render allowlist and Cloudflare DNS therefore
still needed to be configured.

## Review the deployment branch first

The deployment work currently lives on `agent/TASK-006-hosted-betrieb` and includes
the latest `origin/main`. Build the frontend and backend from the **same commit**:
their board data and rules must match. For review, use a separate staging backend
running the deployment branch; do not point the new frontend at an older production
backend.

For an existing Pages project, leave its production branch as `main`, and enable
preview builds for the deployment branch. Set the backend URL in the **Preview**
environment. Open the stable branch-alias URL shown by Pages to review the changes
using the configured Basic Auth credentials.

For a new project, create a staging Pages project with the deployment branch as its
production branch. Its URL is `https://YOUR-STAGING-PROJECT.pages.dev`.
Create/configure the production project for `main` when you are ready. Nothing in
this repository automatically merges branches or deploys a backend.

## 1. Host the Node.js game server

Use a Node.js host that supports a long-running process and WebSocket upgrades.
Configure its repository root as this repository's root and select the deployment
branch for staging.

| Setting | Value |
| --- | --- |
| Node.js | `22` |
| Install/build command | `corepack enable && pnpm install --frozen-lockfile && pnpm build:server` |
| Start command | `pnpm start` |
| Health check | `/health` |
| Instances | **1** |
| Environment | `NODE_ENV=production`, `SHARE=0`, `SERVE_CLIENT=0` |
| Port | Use your host's supplied `PORT`; otherwise `3001` |
| Allowed frontend origins | `CLIENT_ORIGIN=https://YOUR-STAGING-PROJECT.pages.dev,https://YOUR-BRANCH-ALIAS.YOUR-PROJECT.pages.dev` |

Replace the example origins with the ones you actually use, with no trailing slash.
Add the production Pages URL and custom domain to the production backend's list
when ready. The allowlist is exact: arbitrary `*.pages.dev` sites and per-commit
preview URLs are not automatically trusted. Use the stable `develop` alias or
explicitly add a needed preview URL. Both polling and WebSocket upgrades enforce
the allowlist. Production Socket.IO handshakes without an Origin header are
rejected. This is a deployment boundary, not a replacement for authenticating
individual game seats.

The server must have a public HTTPS URL, for example
`https://YOUR-GAME-SERVER.example.com`. Verify that `/health` returns `{"ok":true,...}`.
Your host's proxy must pass WebSocket upgrades and allow long-lived connections.
No ngrok token or local machine is needed.

Rooms live in memory. Restarts/deployments lose games, and multiple replicas have
separate room lists. Keep one instance; disable sleep/scale-to-zero for active games.
Persistent rooms or horizontal scaling would require another backend change.
The repository's Dockerfile remains an alternative for hosts that accept containers.

`pnpm build:server` also rebuilds the optional frontend served by Node. Open
`http://localhost:3001` after `pnpm start` for local play (or your configured port).
This standalone build connects to the origin serving the page and ignores any
leftover `VITE_SERVER_URL`, including a URL from an earlier Pages/test build.
The server accepts browser connections to its own host even in production mode;
separate Pages origins still need `CLIENT_ORIGIN`. If a reverse proxy rewrites
the Host header, include the public backend origin in that allowlist too.
Set `SERVE_CLIENT=1` only for a deliberately standalone deployment protected at
the same edge. The separate Pages backend must keep it off, or its URL would
expose an unprotected copy of the app.

Pages and standalone builds share the output directory. After running a Pages
build locally, run `pnpm build:server` again before starting a local game.

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

Pages uploads the client output and compiles `functions/_middleware.js` from the
repository root. `_routes.json` sends all paths, including static assets, through
the authentication middleware, which sets browser headers and disables caching.
Invitations use the frontend origin even if a backend advertises a tunnel URL.
There is no Pages start command.

### Password protection

Set `BASIC_AUTH_USER` and `BASIC_AUTH_PASS` as encrypted Pages environment variables
for both **Preview** and **Production**, then redeploy. Do not prefix them with
`VITE_`: they are server-side secrets. Choose a nonempty username without a colon
and a strong password. Passwords may contain colons and Unicode characters.
Missing or incorrect credentials return `401` with a `WWW-Authenticate` challenge,
which opens the browser's login dialog. Missing configuration also denies access.

In Pages Functions settings, select **Fail closed** for request-limit failures so
static files cannot bypass authentication when the Functions quota is exhausted.

Test the actual Pages middleware from the repository root:

```bash
VITE_SERVER_URL=https://YOUR-GAME-SERVER.example.com pnpm build:pages
pnpm dlx wrangler pages dev packages/client/dist
```

Open `http://localhost:8788`; the local defaults are `local` / `local-test`.
For custom local credentials, add `BASIC_AUTH_USER` and `BASIC_AUTH_PASS` to a
gitignored `.dev.vars` at the repository root. Defaults apply only to localhost,
127.0.0.1 and IPv6 loopback. Vite dev/preview and the standalone Node server do not
run Pages middleware. This protects the Pages frontend; the separately hosted
game server and any frontend served by it are outside this protection.

## 3. Verify before production

On the preview site, create a private table and open its copied invitation in a
second browser/profile. Join, start a game, roll, chat, and refresh the guest tab
to verify reconnect. In a fresh browser profile, verify the login prompt and that
incorrect credentials also block direct `/assets/` requests. Check desktop and mobile,
and switch between 2D and 3D. Changing the backend URL requires rebuilding Pages.

Local checks:

```bash
pnpm install --frozen-lockfile
pnpm build
pnpm typecheck
pnpm test
VITE_SERVER_URL=https://YOUR-GAME-SERVER.example.com pnpm build:pages
pnpm test:browser
```

The browser suite uses two isolated Chromium profiles to exercise room join,
game start, chat, a roll and reconnect against a real local Socket.IO server.
It also runs the eleven-map viewport matrix. The Basic Auth unit tests cover the
middleware with missing, malformed, wrong and correct credentials, including a
direct asset path.

With a built server running, the integration check supports separate origins:

```bash
SMOKE_CLIENT_ORIGIN=https://YOUR-BRANCH-ALIAS.YOUR-PROJECT.pages.dev node packages/client/invitations.smoke.mjs https://YOUR-GAME-SERVER.example.com https://YOUR-BRANCH-ALIAS.YOUR-PROJECT.pages.dev
```

When approved, merge the deployment branch into `main`, deploy the matching backend
revision, and let Pages build `main` with the production backend URL. Schedule
backend updates between games. No live deployment was performed by this change.

Before public release, review [the outstanding IP issues](IP-REVIEW.md).

## Sources

- [Pages middleware](https://developers.cloudflare.com/pages/functions/middleware/)
- [Pages Functions routing](https://developers.cloudflare.com/pages/functions/routing/)
- [Pages build configuration](https://developers.cloudflare.com/pages/configuration/build-configuration/)
- [Build image and environment overrides](https://developers.cloudflare.com/pages/configuration/build-image/)
- [Preview deployments and branch aliases](https://developers.cloudflare.com/pages/configuration/preview-deployments/)
- [Pages redirects](https://developers.cloudflare.com/pages/configuration/redirects/)
- [Pages headers](https://developers.cloudflare.com/pages/configuration/headers/)
- [Durable Objects require a separate Worker for Pages](https://developers.cloudflare.com/pages/functions/bindings/#durable-objects)
