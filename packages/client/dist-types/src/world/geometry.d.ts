import { type Vec3 } from './math.js';
/** Small, dependency-free solid mesh builder. All surfaces have depth-tested faces. */
export declare class Geometry {
    vertices: number[];
    private colors;
    color(hex: string): Vec3;
    triangle(a: Vec3, b: Vec3, c: Vec3, hex: string): void;
    quad(a: Vec3, b: Vec3, c: Vec3, d: Vec3, color: string): void;
    box(x: number, y: number, z: number, w: number, h: number, d: number, color: string, yaw?: number): void;
    cylinder(x: number, y: number, z: number, radius: number, height: number, color: string, segments?: number, topRadius?: number): void;
    ball(x: number, y: number, z: number, radius: number, color: string): void;
    arch(x: number, y: number, z: number, radius: number, thickness: number, depth: number, color: string, full?: boolean): void;
    beam(a: Vec3, b: Vec3, width: number, color: string): void;
    data(): Float32Array<ArrayBuffer>;
}
//# sourceMappingURL=geometry.d.ts.map