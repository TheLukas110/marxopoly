import { type GameState } from '@marxopoly/shared';
import type { Vec3 } from './math.js';
export interface WorldTile {
    id: number;
    center: Vec3;
    min: Vec3;
    max: Vec3;
    color: string;
    yaw: number;
}
export declare const RAINBOW: string[];
/** The same forty spaces, with theme-specific elevations and table geometry. */
export declare function worldTile(id: number, theme: string): WorldTile;
export declare function tileOffset(tile: WorldTile, x: number, y: number, z: number): Vec3;
/** Follow the board ring, including Start, instead of crossing the scenery. */
export declare function movementPoint(theme: string, from: number, to: number, progress: number): Vec3;
export declare function buildWorld(theme: string): {
    data: Float32Array<ArrayBuffer>;
    tiles: WorldTile[];
};
export declare function buildPieces(theme: string, state?: GameState, selected?: number | null, hovered?: number | null, positions?: Record<string, Vec3>): Float32Array<ArrayBuffer>;
//# sourceMappingURL=scene.d.ts.map