export interface LabelBox {
    id: number;
    x: number;
    y: number;
    width: number;
    height: number;
    priority: number;
}
/** Keep labels at their tile anchors; omit crowded ones instead of covering the board. */
export declare function visibleLabels<T extends LabelBox>(candidates: T[], width: number, height: number): T[];
//# sourceMappingURL=labels.d.ts.map