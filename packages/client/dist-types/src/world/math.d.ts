export type Vec3 = [number, number, number];
export interface WorldCamera {
    yaw: number;
    pitch: number;
    zoom: number;
}
export declare const WORLD_CAMERA: WorldCamera;
export declare const clamp: (value: number, min: number, max: number) => number;
export declare const sub: (a: Vec3, b: Vec3) => Vec3;
export declare const dot: (a: Vec3, b: Vec3) => number;
export declare const cross: (a: Vec3, b: Vec3) => Vec3;
export declare function normalize(v: Vec3): Vec3;
export declare function cameraFrame(camera: WorldCamera, aspect: number): {
    matrix: Float32Array<ArrayBuffer>;
    eye: Vec3;
    right: Vec3;
    up: Vec3;
    back: Vec3;
    f: number;
    aspect: number;
};
export declare function project(point: Vec3, frame: ReturnType<typeof cameraFrame>, width: number, height: number): {
    x: number;
    y: number;
    depth: number;
};
export declare function screenRay(x: number, y: number, frame: ReturnType<typeof cameraFrame>): Vec3;
export declare function intersectBox(origin: Vec3, direction: Vec3, min: Vec3, max: Vec3): number | null;
//# sourceMappingURL=math.d.ts.map