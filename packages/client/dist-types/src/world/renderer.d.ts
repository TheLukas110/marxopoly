import { type GameState } from '@marxopoly/shared';
import { type WorldCamera } from './math.js';
export declare function createWorldRenderer(canvas: HTMLCanvasElement, labels: HTMLCanvasElement, theme: string): {
    render: (camera: WorldCamera, w: number, h: number, showLabels: boolean) => void;
    update: (nextState: GameState | undefined, nextSelected: number | null, nextHovered: number | null) => void;
    pick: (x: number, y: number) => number | null;
    isAnimating: () => boolean;
    dispose(): void;
};
//# sourceMappingURL=renderer.d.ts.map