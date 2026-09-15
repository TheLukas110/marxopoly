import type { BoardLayout } from './layout.js';

/** Look of one non-ownable "special" tile (corners and event squares). */
export interface SpecialTileStyle {
  /** Background colour of the tile. */
  bg: string;
  /** Glyph shown in the tile body. */
  glyph: string;
  /** Short label, used on the corner tiles instead of the tile name. */
  label?: string;
}

/**
 * A board skin. Everything here is *appearance only*. The authoritative tile
 * data, prices, decks and rules live in `state.ruleWorld`; each player may
 * display that shared rule package with a different local skin.
 *
 * To add a map: create a file in this folder that exports a `MapDefinition`
 * and register it in the `MAPS` array in `index.ts`.
 */
export interface MapDefinition {
  /** Stable id, stored in localStorage. */
  id: string;
  /** Name shown in the map dropdown. */
  name: string;
  /** One-line blurb for the dropdown title / tooltip. */
  description?: string;
  /** Tile geometry — usually `ringLayout(...)`. */
  layout: BoardLayout;
  /**
   * CSS custom properties set on the `.board` element while this map is
   * active. Overrides the defaults declared on `:root` in `index.css`:
   *   --board-face, --board-frame, --board-gap, --board-pad, --board-radius,
   *   --board-ring, --tile-ink, --tile-price-ink, --tile-radius, --tile-border,
   *   --centre-bg, --centre-ink, --centre-muted
   *
   * `--board-ring` is how far the skin paints outside the board's border box
   * (a bezel, a table rail, a glow). The board shrinks by that much so the
   * ring stays inside the layout instead of spilling over the action bar.
   */
  vars: Record<string, string>;
  /** Extra class added to `.board-wrap`, for any bespoke rules a map needs. */
  wrapClass?: string;
  /** Colour + glyph for each special (non-ownable) tile kind. */
  special: Record<string, SpecialTileStyle>;
}
