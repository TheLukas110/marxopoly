import type { ColorGroup, RentLadder, Tile } from '../types.js';

/**
 * The Common Ground board: 40 tiles running clockwise from Start (index 0).
 * Streets, depots and works are the ownable tiles.
 */

const street = (
  id: number,
  name: string,
  short: string,
  group: ColorGroup,
  price: number,
  rent: RentLadder,
  buildCost: number,
): Tile => ({ id, name, short, kind: 'street', group, price, rent, buildCost });

const depot = (id: number, name: string): Tile => ({
  id,
  name,
  kind: 'depot',
  group: 'depot',
  price: 180,
});

const works = (id: number, name: string, short: string): Tile => ({
  id,
  name,
  short,
  kind: 'works',
  group: 'works',
  price: 165,
});

export const BOARD: readonly Tile[] = Object.freeze([
  { id: 0, name: 'Start', kind: 'start' },
  street(1, 'Mossbank', 'Mossbank', 'clay', 80, [5, 20, 55, 110, 190, 300], 60),
  { id: 2, name: 'Ledger', kind: 'ledger' },
  street(3, 'Fernwalk', 'Fernwalk', 'clay', 95, [7, 28, 70, 140, 230, 350], 60),
  { id: 4, name: 'Community Fund', short: 'Fund', kind: 'tax', amount: 140 },
  depot(5, 'Canal Exchange'),
  street(6, 'Lantern Quay', 'Lantern Quay', 'sky', 125, [9, 36, 90, 175, 280, 420], 75),
  { id: 7, name: 'Fortune', kind: 'fortune' },
  street(8, 'Tideglass', 'Tideglass', 'sky', 135, [10, 40, 100, 195, 310, 460], 75),
  street(9, 'Reed Harbour', 'Reed Harbour', 'sky', 145, [11, 44, 110, 215, 340, 500], 75),
  { id: 10, name: 'Holding Yard', kind: 'holding' },
  street(11, 'Kiln Square', 'Kiln Square', 'rose', 165, [13, 52, 130, 250, 390, 570], 90),
  works(12, 'Wind Cooperative', 'Wind Co-op'),
  street(13, 'Weavers Row', 'Weavers Row', 'rose', 175, [14, 56, 140, 270, 420, 610], 90),
  street(14, 'Copper Arcade', 'Copper Arcade', 'rose', 185, [15, 60, 150, 290, 450, 650], 90),
  depot(15, 'Ridge Exchange'),
  street(16, 'Orchard Steps', 'Orchard Steps', 'amber', 205, [17, 68, 170, 325, 500, 720], 110),
  { id: 17, name: 'Ledger', kind: 'ledger' },
  street(18, 'Clover Terrace', 'Clover Terrace', 'amber', 215, [18, 72, 180, 345, 530, 760], 110),
  street(19, 'Apiary Lane', 'Apiary Lane', 'amber', 225, [19, 76, 190, 365, 560, 800], 110),
  { id: 20, name: 'Plaza', kind: 'plaza' },
  street(21, 'Foundry Court', 'Foundry Court', 'crimson', 245, [21, 84, 210, 400, 610, 870], 130),
  { id: 22, name: 'Fortune', kind: 'fortune' },
  street(23, 'Wheelwright Way', 'Wheelwright', 'crimson', 255, [22, 88, 220, 420, 640, 910], 130),
  street(24, 'Glasshouse', 'Glasshouse', 'crimson', 265, [23, 92, 230, 440, 670, 950], 130),
  depot(25, 'Garden Exchange'),
  street(26, 'Atlas Court', 'Atlas Court', 'gold', 285, [25, 100, 250, 475, 720, 1020], 155),
  street(27, 'Archive Walk', 'Archive Walk', 'gold', 295, [26, 104, 260, 495, 750, 1060], 155),
  works(28, 'Rainwater Works', 'Rainwater'),
  street(29, 'Observatory Rise', 'Observatory', 'gold', 305, [27, 108, 270, 515, 780, 1100], 155),
  { id: 30, name: 'Dispatch', kind: 'dispatch' },
  street(31, 'Juniper Heights', 'Juniper', 'forest', 325, [29, 116, 290, 550, 830, 1170], 180),
  street(32, 'Cloudbridge', 'Cloudbridge', 'forest', 335, [30, 120, 300, 570, 860, 1210], 180),
  { id: 33, name: 'Ledger', kind: 'ledger' },
  street(34, 'Kestrel Gardens', 'Kestrel', 'forest', 345, [31, 124, 310, 590, 890, 1250], 180),
  depot(35, 'Harbour Exchange'),
  { id: 36, name: 'Fortune', kind: 'fortune' },
  street(37, 'Sunward Summit', 'Sunward', 'navy', 375, [34, 136, 340, 645, 970, 1360], 210),
  { id: 38, name: 'Watershed Fund', short: 'Watershed', kind: 'tax', amount: 85 },
  street(39, 'Starling Spire', 'Starling', 'navy', 425, [39, 156, 390, 740, 1110, 1550], 210),
] as const satisfies readonly Tile[]);

export const BOARD_SIZE = BOARD.length;
export const HOLDING_TILE = 10;
export const START_TILE = 0;

export const GROUP_ORDER: readonly ColorGroup[] = [
  'clay',
  'sky',
  'rose',
  'amber',
  'crimson',
  'gold',
  'forest',
  'navy',
];

export const GROUP_COLORS: Record<ColorGroup | 'depot' | 'works', string> = {
  clay: '#4e877b',
  sky: '#b77a55',
  rose: '#7470a8',
  amber: '#5393a6',
  crimson: '#a68143',
  gold: '#ae6b89',
  forest: '#657da6',
  navy: '#8b9160',
  depot: '#334155',
  works: '#14b8a6',
};

export const GROUP_LABELS: Record<ColorGroup | 'depot' | 'works', string> = {
  clay: 'Wetlands',
  sky: 'Harbour',
  rose: 'Crafts',
  amber: 'Orchards',
  crimson: 'Foundry',
  gold: 'Archives',
  forest: 'Heights',
  navy: 'Summit',
  depot: 'Depots',
  works: 'Works',
};

/** Tile ids belonging to each ownable group, in board order. */
export const GROUP_TILES: Record<string, number[]> = (() => {
  const map: Record<string, number[]> = {};
  for (const tile of BOARD) {
    if (tile.kind === 'street') (map[tile.group] ??= []).push(tile.id);
    else if (tile.kind === 'depot') (map.depot ??= []).push(tile.id);
    else if (tile.kind === 'works') (map.works ??= []).push(tile.id);
  }
  return map;
})();

export const OWNABLE_TILE_IDS: readonly number[] = BOARD.filter(
  (t) => t.kind === 'street' || t.kind === 'depot' || t.kind === 'works',
).map((t) => t.id);

/** Depot toll by the number of depots the owner holds. */
export const DEPOT_RENT = [0, 30, 65, 105, 150] as const;

/** Works multiplier applied to the dice total, by works owned. */
export const WORKS_MULTIPLIER = [0, 5, 9] as const;

export function tileAt(id: number): Tile {
  const tile = BOARD[((id % BOARD_SIZE) + BOARD_SIZE) % BOARD_SIZE];
  if (!tile) throw new Error(`No tile at index ${id}`);
  return tile;
}

/**
 * Board index of the tile with this `name` (case-insensitive), so other data —
 * the action cards especially — can point at a street by the exact name shown
 * on the board and stay in sync when it is renamed. Throws with the list of
 * valid names when nothing matches.
 */
export function tileIdByName(name: string): number {
  const wanted = name.trim().toLowerCase();
  const tile = BOARD.find((t) => t.name.toLowerCase() === wanted);
  if (!tile) {
    throw new Error(
      `No board tile named "${name}". Valid names: ${BOARD.map((t) => t.name).join(', ')}`,
    );
  }
  return tile.id;
}
