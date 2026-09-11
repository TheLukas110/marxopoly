export interface WorldTheme {
    name: string;
    eyebrow: string;
    description: string;
    accent: string;
    ground: string;
    base: string;
    tile: string;
    sky: string;
}
export declare const WORLD_THEMES: Record<string, WorldTheme>;
export declare function worldTheme(id: string): WorldTheme;
//# sourceMappingURL=themes.d.ts.map