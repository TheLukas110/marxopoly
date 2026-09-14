# Common Ground

A real-time, multiplayer property-trading board game for the browser. Create a table, share the
six-character code, and play with two to eight people — or fill the empty seats with bots.

Common Ground is a working title for an independently maintained property-trading game.
It is not affiliated with or endorsed by Hasbro. Its mechanics have substantial similarities
to Monopoly; renaming and redesigning it do not establish legal clearance.
See [the IP review and remaining release checks](docs/IP-REVIEW.md).

For hosting, use [the Cloudflare Pages deployment guide](docs/CLOUDFLARE-PAGES.md):
`pnpm build:pages`, output `packages/client/dist`, plus a separately hosted Node.js game server.

---

## What's in the box

| Package | What it is |
| --- | --- |
| `packages/shared` | The pure TypeScript game engine — board data, card decks, seeded RNG, and a single `applyAction(state, action)` reducer. No I/O, fully unit-tested. |
| `packages/server` | Express + Socket.IO. Owns the authoritative state, room lifecycle, reconnects, turn timers and bot scheduling. |
| `packages/client` | Vite + React + TypeScript. Board, panels, trading, auctions, chat. |

The engine is deliberately isolated: the server never trusts a client, and the client renders
whatever state the server broadcasts. Every rule lives in one place.

## Features

- **Live multiplayer rooms** — public lobby listing or private code-only tables, 2–8 players.
- **Full ruleset** — buying, rent, colour-group bonuses, houses and hotels with even-build,
  mortgages (and the 10% fee to lift them), the holding yard with three ways out, doubles and the
  three-doubles penalty, salary at Start, taxes, two card decks.
- **Auctions** — declining a property opens a turn-based auction with bid validation.
- **Trading** — multi-asset offers (cash, deeds, reprieve cards) with an inbox, re-validated at the
  moment of acceptance so a stale offer can never execute.
- **Debt instead of instant death** — falling short opens a debt you must settle by selling
  buildings, mortgaging or trading. Bankruptcy is only allowed when you genuinely cannot pay.
- **Report bankrupt** — give up at any time: your properties go back to the bank (no houses),
  your cash is wiped, and the game ends if you were the second-to-last player. You keep your
  seat and can watch the rest of the game — unlike *Leave table*, which drops you out entirely.
- **Reconnect** — your seat is held for two minutes; refreshing the tab drops you straight back in,
  and a second tab joins as a separate player instead of stealing your seat.
- **Watch a game in progress** — a table that has already started still shows in the list; joining it
  (or a folded player staying on) puts you in view-only mode with no board actions. Finished games
  drop off the list entirely.
- **Bright, readable board** — district colour markers, short board labels, large tokens with
  player initials, and an owner bar on each tile's outer edge.
- **Turn timers** — configurable, with sensible auto-resolution when they expire.
- **Bots** — heuristic opponents that buy, build, bid and answer trades.
- **Deterministic** — the whole game runs off one seed, so a game replays identically.

## Quick start

### Prerequisites

- Node.js 22 (also used by the deployment guide)
- Corepack, enabled for the pinned pnpm version

From the repository root, enable the pinned pnpm version and install all workspace dependencies:

```bash
corepack enable
pnpm install
```

The repository pins pnpm 10.28.0, so no separate global pnpm installation is required.
If `corepack enable` lacks permission to write to a system directory, enable its shims in
your user-level npm bin directory instead:

```bash
corepack enable --install-directory "$HOME/.npm-global/bin"
```

### Start the game

```bash
pnpm --filter @marxopoly/shared build   # the client and server consume its dist output
pnpm dev                              # server on :3001, client on :5173
```

Open http://localhost:5173, create a table, and open the same URL in a **second browser tab** (or
send the six-character code to a friend) to join.

Each tab is its own player. The seat token is kept in `sessionStorage`, which is per-tab, so
refreshing a tab keeps your seat while a new tab starts fresh and can join as somebody else. If a
second tab ever reclaims a seat, the older tab is told it was replaced rather than silently going
dead.

### Local testing checklist

Use this workflow to test the game locally after making a change. No `.env` file is required for
the default local setup; the server uses port `3001` and accepts the Vite client on port `5173`.

```bash
# Run once after cloning the repository, or whenever dependencies change.
corepack enable
pnpm install

# Build the shared package, then start shared code, server, and client in watch mode.
pnpm --filter @marxopoly/shared build
pnpm dev
```

Open http://localhost:5173 in a browser. Create a table, then open the same address in an
incognito window or a second browser tab to join with another player. Use the six-character room
code to verify joining a specific table. Keep `pnpm dev` running while testing; it rebuilds the
client and server when source files change.

Before handing a change over, run the automated checks from the repository root:

```bash
pnpm test       # game-engine and client tests
pnpm typecheck  # TypeScript checks for every package
pnpm build      # production build, served locally with `pnpm start`
```

To test the production build locally, stop the development command and run:

```bash
pnpm start
```

Then open http://localhost:3001. This serves the built client and the WebSocket server from the
same address. If `pnpm build` has not been run yet, run it before `pnpm start`.

### Share a direct ngrok link with remote friends

```bash
pnpm share        # builds every package, starts production server, prints a public ngrok URL
```

On startup the terminal prints a banner with the local, LAN, and public URLs. Copy the printed
`https://…ngrok…` link directly to your friends; they can join straight from the browser (free ngrok
shows a one-click "visit site" warning first). Everything (page + WebSocket) goes through that one
tunnel, so no extra setup on the client.

One-time ngrok setup: create a free account, grab your token from
<https://dashboard.ngrok.com/get-started/your-authtoken>, and add it to `.env` in the repo root:

```
NGROK_AUTHTOKEN=<your token>
```

That environment variable is the only thing the bundled ngrok SDK reads — `ngrok config add-authtoken`
(the CLI config file) is **not** used. `.env` (not `.env.example`) is what the server loads.

`pnpm share` always enables the tunnel. `SHARE=1 pnpm start` starts the already-built production
server with a tunnel; this is useful when you have already run `pnpm build`.

After creating a table, use **Copy invitation** in the lobby. The invitation uses the public
ngrok address, even when the host is playing on localhost, and includes the room code as
`?room=ABC123`. Guests open it, choose their name, and press **Join table**; private tables work
too. If the game has already started, they join as spectators. The invitation updates when the
tunnel connects. Without a tunnel it uses the current browser address, suitable for local/LAN
play only when that address is reachable by the guest. Keep the server running while playing.

### Build and start locally

```bash
pnpm build
pnpm start        # serves the built client and the socket server on http://localhost:3001
```

`pnpm build:server` is equivalent to `pnpm build`: both rebuild the server and its
standalone frontend. This frontend connects to the same address you open, ignoring
any leftover `VITE_SERVER_URL`. Use `pnpm build:pages` for the separately hosted
Cloudflare frontend. After a Pages build, rebuild with `pnpm build:server` before
playing through the local Node server again.

The local production workflow from the repository root is therefore:

```bash
pnpm build
pnpm start
```

For a public, one-command game session after setting `NGROK_AUTHTOKEN` in `.env`:

```bash
pnpm share
```

Keep that command running. Its `Invite link` banner is the direct ngrok URL to send to players.

### Docker

```bash
docker compose up --build
```

## Configuration

Copy `.env.example` to `.env` in the repo root (the server reads it at startup).

| Variable | Default | Meaning |
| --- | --- | --- |
| `PORT` | `3001` | HTTP + WebSocket port. |
| `CLIENT_ORIGIN` | `http://localhost:5173` | Allowed CORS origin(s), comma-separated, or `*`. |
| `RECONNECT_GRACE_MS` | `120000` | How long a disconnected player keeps their seat. |
| `TURN_TIMEOUT_SECONDS` | `90` | Default turn timer for new rooms (`0` disables). |
| `EMPTY_ROOM_TTL_MS` | `900000` | Idle empty rooms are swept after this. |
| `BOT_THINK_MS` | `1200` | Bot delay, so humans can follow what happened. |
| `SHARE` | `0` | `1` opens an ngrok tunnel on startup (same as `pnpm share` / `--share`). |
| `NGROK_AUTHTOKEN` | – | Required for ngrok. Put it in the repo-root `.env`; the ngrok CLI config is not read. |
| `NGROK_DOMAIN` | – | Optional reserved ngrok domain for a stable link. |

The client can point at a different backend with `VITE_SERVER_URL`.

Cloudflare Pages is protected by HTTP Basic Auth. Configure `BASIC_AUTH_USER` and
`BASIC_AUTH_PASS` as Pages secrets for Preview and Production; see the
[deployment guide](docs/CLOUDFLARE-PAGES.md#password-protection).

Per-table house rules (starting cash, salary, auctions on/off, even build, double rent on full sets,
plaza pot, turn timer, max players) are set by the host in the lobby.

The host can also **Customise** the table from the lobby: rename any street/depot/works tile, and
view, delete or create Fortune / Ledger cards. New cards are built from a small form (deck, text,
and one of the nine effect types with its parameters) and validated on the server. Everything is
locked once the game starts; `packages/shared/src/data/cards.ts` and `board.ts` still hold the
defaults every game seeds from.

## The board

Forty tiles: twenty-two streets in eight colour groups, four depots, two works, two taxes, four
corners, and seven card tiles.

- **Streets** pay a base rent that doubles when one player holds the whole colour group unimproved,
  then follow a five-step ladder through four houses to a hotel.
- **Depots** pay 25 / 50 / 100 / 200 depending on how many of the four you hold.
- **Works** pay 4x or 10x the dice roll depending on whether you hold one or both.
- **Fortune** and **Ledger** are the two card decks (sixteen each by default; host-editable).
- The **Holding Yard** detains you: roll doubles, pay the fine, or spend a reprieve card. After
  three failed attempts you pay and move.

## Worlds and board views

Every player picks a **world** from the home-page gallery, lobby, or game header.
The choice is stored in that browser and never sent to the server, so players at one table
can each explore a different world.
The shared tile data (names, prices, rent, cards) is the same for everyone regardless of map.

New player tabs start in **3D world** mode. Each world uses solid WebGL meshes, directional
lighting, a depth buffer, and distinct architecture. Pieces walk along the forty-space route;
ownership bars, houses, hotels, and mortgages reflect the authoritative game state.
Drag to orbit, pinch to zoom, or use the on-screen controls. With the canvas focused,
arrow keys orbit, **+ / −** zoom, and **Home** resets the view. Mouse-wheel zoom is enabled
only while the canvas has focus so normal page scrolling remains available.
Click a space or choose it in **Inspect a space** to see its details. Labels can be hidden.
3D labels stay at their space anchors and yield to hovered/selected spaces when crowded;
prices appear on active labels and in the inspector. Small screens show landmark and active
labels. All 3D routes are circular; the 2D view uses a numbered district route through
equal-sized spaces with the turn controls below it. The 2D board fits names to each cell using the map's actual font, with full names
available in the tile tooltip and property details. Extremely long custom names can also
be scrolled within their label.
Compact 2D viewports keep a 440px board and allow scrolling in both directions instead
of shrinking names further. They prioritise names over decorative symbols and property
price lines; select a property to see its price. Tax amounts stay visible on the board.
The **2D / 3D world** switch is saved per tab. Devices without WebGL can use the 2D board;
the home page displays a static world preview when interactive rendering is unavailable.

Bundled worlds:

| World | Geometry |
| --- | --- |
| **Civic Gardens** (`standard`) | A miniature town with terracotta roofs, a clock tower, canal bridges, trees, and a fountain. |
| **Neon Circuit** (`cyber`) | Illuminated towers, elevated connections, tiered spaces, and a suspended data core. |
| **The High Roller** (`poker`) | A circular felt table, radial property cards, chip towers, a house of cards, and a golden crown. |
| **Spectrum Festival** (`pride`) | A dimensional rainbow arch, an observation wheel, festival stage, bunting, and colourful stalls. |
| **Block Party** (`dummy`) | Stacked construction blocks, a lattice crane, a suspended load, and miniature trucks. |

The renderer is in `packages/client/src/world/`: `geometry.ts` builds solid primitives,
`scene.ts` constructs the worlds and game pieces, `math.ts` handles projection and ray tests,
and `renderer.ts` owns the WebGL resources and labels. It loads in a separate bundle and
renders on demand, with continuous frames only during piece movement. Reduced-motion
preferences disable piece movement, and unmounting releases buffers, observers, and listeners.

The original 2D layouts live in `packages/client/src/maps/`. To add a world, register its
`MapDefinition` in `MAPS`, add metadata in `world/themes.ts`, and implement its scene in
`world/scene.ts`. Names and prices must continue to come from shared game data.

The gallery PNGs are generated from the same scene meshes with a software depth buffer.
Regenerate them after changing geometry with `pnpm --filter @marxopoly/client previews`.
No external textures, fonts, model downloads, or new runtime dependencies are required.
`pnpm --filter @marxopoly/client test` checks geometry, camera bounds, picking, movement,
eight-player rendering, accessibility markup, and saved preferences.

## How the engine works

```ts
import { applyAction, createGame } from '@marxopoly/shared';

let state = createGame('room-1', [{ id: 'a', name: 'Ada' }, { id: 'b', name: 'Brix' }]);
const result = applyAction(state, { playerId: 'a', action: { type: 'start_game' }, now: Date.now() });
if (result.ok) state = result.state;
```

`applyAction` deep-clones, mutates the clone, and returns either `{ ok: true, state }` or
`{ ok: false, error }`. A rejected action never touches the original state, so the server can hand
an error straight back to the offending client and keep going. All randomness comes from
`state.rngState`, so identical inputs give identical games.

The phases are `lobby -> pre_roll -> (awaiting_buy | auction | debt) -> post_roll -> ... -> game_over`,
and every action asserts the phase it is legal in.

## Testing

```bash
pnpm test          # engine unit tests (vitest)
pnpm typecheck     # all three packages
```

With a built server running, check invitation URLs and multiplayer joining with
`node packages/client/invitations.smoke.mjs http://localhost:3001`.

The engine suite covers rent maths for all three property types, even-build enforcement, mortgage
round-trips, auction resolution, trade validation, debt and bankruptcy transfer, the holding yard,
and seed determinism.

## Project layout

```
packages/
  shared/src/
    types.ts             domain types + socket event contracts
    rng.ts               seeded mulberry32, dice, shuffle
    data/board.ts        the 40 tiles
    data/cards.ts        the two decks
    engine/state.ts      game factory, settings, lobby mutations
    engine/selectors.ts  rent, net worth, build/mortgage legality
    engine/engine.ts     the reducer
  server/src/
    index.ts             express + socket.io wiring
    rooms.ts             room lifecycle, reconnect, timers
    bot.ts               heuristic bot policy
  client/src/
    net.ts               socket client + store
    lib.ts               formatting and board helpers
    maps/                board skins (layout + colours), one file per map
    components/          board, panels, modals
```

## License

MIT — see [LICENSE](LICENSE).
