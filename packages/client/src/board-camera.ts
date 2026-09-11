export interface BoardCamera {
  rotation: number;
  tilt: number;
}

export const DEFAULT_CAMERA: BoardCamera = { rotation: -25, tilt: 40 };
export const MIN_TILT = 15;
export const MAX_TILT = 60;

export function moveCamera(camera: BoardCamera, rotation: number, tilt = 0): BoardCamera {
  return {
    rotation: ((camera.rotation + rotation + 180) % 360 + 360) % 360 - 180,
    tilt: Math.min(MAX_TILT, Math.max(MIN_TILT, camera.tilt + tilt)),
  };
}

/** Fit the projected board, skin rail and raised pieces within the viewport.
 * Solve the perspective bounds at every corner instead of letting a rotated
 * square overlap the panels. Matches perspective() scale3d() rotateX() rotateZ(). */
export function fitBoardCamera(
  camera: BoardCamera,
  size: number,
  width: number,
  height: number,
  ring = 0,
): { scale: number; perspective: number } {
  const perspective = Math.max(900, size * 3);
  if (size <= 0 || width <= 24 || height <= 24) return { scale: 0.5, perspective };
  const rotation = camera.rotation * Math.PI / 180;
  const tilt = camera.tilt * Math.PI / 180;
  const half = size / 2 + ring;
  const bounds = [(width - 24) / 2, (height - 24) / 2];
  let scale = 1;
  for (const x of [-half, half]) {
    for (const y of [-half, half]) {
      for (const z of [-14, 28]) {
        const rx = x * Math.cos(rotation) - y * Math.sin(rotation);
        const ry = x * Math.sin(rotation) + y * Math.cos(rotation);
        const py = ry * Math.cos(tilt) - z * Math.sin(tilt);
        const pz = ry * Math.sin(tilt) + z * Math.cos(tilt);
        for (const [axis, extent] of [rx, py].entries()) {
          const denominator = Math.abs(extent) + bounds[axis] * pz / perspective;
          if (denominator > 0) scale = Math.min(scale, bounds[axis] / denominator);
        }
      }
    }
  }
  return { scale, perspective };
}
