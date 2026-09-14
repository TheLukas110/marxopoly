// Uses Vite's existing TypeScript loader; no browser or extra test dependency.
// Run: node --test packages/client/board-view.test.mjs
import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { BOARD, createGame } from '@marxopoly/shared';

const server = await createServer({
  root: fileURLToPath(new URL('.', import.meta.url)),
  configFile: false,
  server: { middlewareMode: true, hmr: false },
  appType: 'custom',
});
after(() => server.close());
const { moveCamera, fitBoardCamera } = await server.ssrLoadModule('/src/board-camera.ts');

test('classic ring keeps all 40 spaces on the perimeter with four large corners', async () => {
  const { ringLayout, tokenSpot } = await server.ssrLoadModule('/src/maps/layout.ts');
  const layout = ringLayout();
  assert.deepEqual(layout.centre, { column: '2 / 11', row: '2 / 11' });
  const cells = BOARD.map(tile => layout.position(tile.id));
  assert.equal(new Set(cells.map(p => `${p.gridRow},${p.gridColumn}`)).size, 40);
  assert.deepEqual([0, 10, 20, 30].map(id => layout.position(id)), [
    { gridRow: 11, gridColumn: 11 }, { gridRow: 11, gridColumn: 1 },
    { gridRow: 1, gridColumn: 1 }, { gridRow: 1, gridColumn: 11 },
  ]);
  for (const tile of BOARD) {
    const a = layout.position(tile.id), b = layout.position(tile.id + 1);
    assert.ok([1, 11].includes(a.gridRow) || [1, 11].includes(a.gridColumn));
    assert.equal(Math.abs(a.gridRow - b.gridRow) + Math.abs(a.gridColumn - b.gridColumn), 1);
    assert.equal(layout.edge(tile.id) === 'corner', tile.id % 10 === 0);
    const token = tokenSpot(layout, tile.id);
    const bounds = track => track === 1 ? [0, 12.5] : track === 11 ? [87.5, 100]
      : [(1.5 + track - 2) / 12 * 100, (1.5 + track - 1) / 12 * 100];
    const [left, right] = bounds(a.gridColumn), [top, bottom] = bounds(a.gridRow);
    assert.ok(token.x > left && token.x < right);
    assert.ok(token.y > top && token.y < bottom);
  }
});

test('camera can orbit repeatedly and never flip beneath the board', () => {
  const start = { rotation: -25, tilt: 40 };
  assert.deepEqual(moveCamera(start, 360 * 100), start);
  assert.deepEqual(moveCamera(start, -360 * 100), start);
  assert.equal(moveCamera(start, 0, 1000).tilt, 60);
  assert.equal(moveCamera(start, 0, -1000).tilt, 15);
  assert.deepEqual(start, { rotation: -25, tilt: 40 });
});

test('all projected corners, raised pieces and map rails fit at every angle', () => {
  // Mobile, tablet, narrow desktop column, short desktop and large desktop.
  const viewports = [[296, 296], [374, 374], [760, 760], [480, 640], [680, 310], [1200, 760]];
  for (const [width, height] of viewports) {
    for (const ring of [0, 8, 12, 17]) {
      const size = Math.min(width, height) - ring * 2 - 24;
      for (let rotation = -180; rotation < 180; rotation += 5) {
        for (const tilt of [15, 25, 40, 60]) {
          const { scale, perspective } = fitBoardCamera({ rotation, tilt }, size, width, height, ring);
          assert.ok(scale > 0 && scale <= 1);
          // Independently project sample points through the CSS transform.
          const rz = rotation * Math.PI / 180;
          const rx = tilt * Math.PI / 180;
          const edge = size / 2 + ring;
          for (const x of [-edge, 0, edge]) {
            for (const y of [-edge, 0, edge]) {
              for (const z of [-14, 0, 16, 28]) {
                const u = x * Math.cos(rz) - y * Math.sin(rz);
                const v = x * Math.sin(rz) + y * Math.cos(rz);
                const depth = (v * Math.sin(rx) + z * Math.cos(rx)) * scale;
                const distance = 1 - depth / perspective;
                const projectedX = u * scale / distance;
                const projectedY = (v * Math.cos(rx) - z * Math.sin(rx)) * scale / distance;
                assert.ok(Math.abs(projectedX) <= (width - 24) / 2 + 1e-6);
                assert.ok(Math.abs(projectedY) <= (height - 24) / 2 + 1e-6);
              }
            }
          }
        }
      }
    }
  }
  assert.ok(Number.isFinite(fitBoardCamera({ rotation: 0, tilt: 40 }, 0, 0, 0).scale));
});

const storageKey = 'marxopoly.board-view.v1';
function storage() {
  const values = new Map();
  return { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
}

test('each player tab chooses independently and restores its choice on reload', async () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'sessionStorage');
  const firstStorage = storage();
  const secondStorage = storage();
  try {
    Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, value: firstStorage });
    const first = await server.ssrLoadModule('/src/board-view.ts?tab=first');
    assert.equal(first.getBoardView(), '3d');
    first.setBoardView('2d');
    assert.equal(first.getBoardView(), '2d');
    assert.equal(firstStorage.getItem(storageKey), '2d');

    Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, value: secondStorage });
    const second = await server.ssrLoadModule('/src/board-view.ts?tab=second');
    assert.equal(second.getBoardView(), '3d');
    assert.equal(first.getBoardView(), '2d');

    Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, value: firstStorage });
    const reloaded = await server.ssrLoadModule('/src/board-view.ts?tab=reloaded');
    assert.equal(reloaded.getBoardView(), '2d');
    reloaded.setBoardView('3d');
    assert.equal(firstStorage.getItem(storageKey), '3d');
    firstStorage.setItem(storageKey, 'invalid');
    const invalid = await server.ssrLoadModule('/src/board-view.ts?tab=invalid');
    assert.equal(invalid.getBoardView(), '3d');
  } finally {
    if (descriptor) Object.defineProperty(globalThis, 'sessionStorage', descriptor);
    else delete globalThis.sessionStorage;
  }
});

test('3D toggle still works when browser storage is blocked', async () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'sessionStorage');
  try {
    Object.defineProperty(globalThis, 'sessionStorage', {
      configurable: true,
      get() { throw new Error('Storage disabled'); },
    });
    const view = await server.ssrLoadModule('/src/board-view.ts?tab=blocked');
    assert.equal(view.getBoardView(), '3d');
    view.setBoardView('2d');
    assert.equal(view.getBoardView(), '2d');
    view.setBoardView('3d');
    assert.equal(view.getBoardView(), '3d');
  } finally {
    if (descriptor) Object.defineProperty(globalThis, 'sessionStorage', descriptor);
    else delete globalThis.sessionStorage;
  }
});

test('every skin renders all tiles and eight player pieces inside the shared camera', async () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const mapStorage = storage();
  try {
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: mapStorage });
    const { MAPS, setMapId } = await server.ssrLoadModule('/src/maps/index.ts');
    const { setBoardView } = await server.ssrLoadModule('/src/board-view.ts');
    setBoardView('2d');
    const { default: Board } = await server.ssrLoadModule('/src/components/Board.tsx');
    const state = createGame('TEST', Array.from({ length: 8 }, (_, i) => ({ id: `p${i}`, name: `Player ${i}` })), { seed: 123 });
    for (const map of MAPS) {
      setMapId(map.id);
      const html = renderToStaticMarkup(createElement(Board, { state, selected: 1, onSelect() {}, controls: createElement('button', { type: 'button' }, 'Embedded turn action') }));
      assert.ok(html.includes('class="board-turn-controls"><button type="button">Embedded turn action</button>'), map.id);
      assert.equal((html.match(/class="tile /g) ?? []).length, 40, map.id);
      assert.equal((html.match(/class="board-token/g) ?? []).length, 8, map.id);
      assert.ok(html.includes('class="board-camera"'), map.id);
      assert.ok(html.includes('selected'), map.id);
      assert.equal((html.match(/class="tile edge-corner /g) ?? []).length, 4, map.id);
      assert.ok(html.includes('grid-column:2 / 11;grid-row:2 / 11'), map.id);
      for (const tile of BOARD) assert.ok(html.includes(`title="${tile.name}"`), `${map.id}: full name for ${tile.id}`);
      if (map.wrapClass) assert.ok(html.includes(map.wrapClass), map.id);
    }
  } finally {
    if (descriptor) Object.defineProperty(globalThis, 'localStorage', descriptor);
    else delete globalThis.localStorage;
  }
});
