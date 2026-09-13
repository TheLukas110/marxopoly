export interface BoardCamera {
    rotation: number;
    tilt: number;
}
export declare const DEFAULT_CAMERA: BoardCamera;
export declare const MIN_TILT = 15;
export declare const MAX_TILT = 60;
export declare function moveCamera(camera: BoardCamera, rotation: number, tilt?: number): BoardCamera;
/** Fit the projected board, skin rail and raised pieces within the viewport.
 * Solve the perspective bounds at every corner instead of letting a rotated
 * square overlap the panels. Matches perspective() scale3d() rotateX() rotateZ(). */
export declare function fitBoardCamera(camera: BoardCamera, size: number, width: number, height: number, ring?: number): {
    scale: number;
    perspective: number;
};
//# sourceMappingURL=board-camera.d.ts.map