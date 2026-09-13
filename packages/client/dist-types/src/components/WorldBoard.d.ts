import { type GameState } from '@marxopoly/shared';
interface Props {
    theme: string;
    state?: GameState;
    selected?: number | null;
    onSelect?: (id: number) => void;
    preview?: boolean;
    onUnavailable?: () => void;
}
export default function WorldBoard({ theme, state, selected, onSelect, preview, onUnavailable }: Props): import("react").JSX.Element;
export {};
//# sourceMappingURL=WorldBoard.d.ts.map