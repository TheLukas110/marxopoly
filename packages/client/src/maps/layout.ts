import { BOARD_SIZE } from '@marxopoly/shared';

export type Edge = 'bottom' | 'left' | 'top' | 'right' | 'corner';

export interface BoardLayout {
  gridTemplateColumns: string;
  gridTemplateRows: string;
  centre: { column: string; row: string };
  position(id: number): { gridRow: number; gridColumn: number };
  edge(id: number): Edge;
  cellCentre(id: number): { x: number; y: number };
  direction(id: number): string;
}

/** A continuous district route through eight columns, with a return lane at
 * the top. Every space is the same size; the turn panel sits below the route.
 * The route closes from the last space to Start without crossing another tile.
 */
export function districtLayout(): BoardLayout {
  const cells: { gridRow: number; gridColumn: number }[] = [];
  for (let row = 1; row <= 5; row++) cells.push({ gridRow: row, gridColumn: 1 });
  for (let column = 2; column <= 8; column++) {
    for (let step = 0; step < 4; step++) {
      cells.push({ gridRow: column % 2 === 0 ? 5 - step : 2 + step, gridColumn: column });
    }
  }
  for (let column = 8; column >= 2; column--) cells.push({ gridRow: 1, gridColumn: column });
  if (cells.length !== BOARD_SIZE) throw new Error('District route must cover every board space.');
  const position = (id: number) => cells[((id % BOARD_SIZE) + BOARD_SIZE) % BOARD_SIZE];
  return {
    gridTemplateColumns: 'repeat(8, minmax(0, 1fr))',
    gridTemplateRows: 'repeat(5, minmax(0, 1fr)) minmax(0, 1.4fr)',
    centre: { column: '1 / 9', row: '6 / 7' },
    position,
    edge: () => 'bottom',
    cellCentre(id) {
      const { gridRow, gridColumn } = position(id);
      return { x: (gridColumn - 0.5) / 8 * 100, y: (gridRow - 0.5) / 6.4 * 100 };
    },
    direction(id) {
      const a = position(id), b = position(id + 1);
      return b.gridColumn > a.gridColumn ? '→' : b.gridColumn < a.gridColumn ? '←' : b.gridRow > a.gridRow ? '↓' : '↑';
    },
  };
}

/** Pieces sit below the district name, near the bottom of each cell. */
export function tokenSpot(layout: BoardLayout, id: number): { x: number; y: number } {
  const { x, y } = layout.cellCentre(id);
  return { x, y: y + 3.5 };
}
