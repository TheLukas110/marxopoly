export type Vec3 = [number, number, number];
export interface WorldCamera { yaw: number; pitch: number; zoom: number }
export const WORLD_CAMERA: WorldCamera = { yaw: 0.58, pitch: 0.82, zoom: 1 };
export const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
export const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export function normalize(v: Vec3): Vec3 { const n = Math.hypot(...v) || 1; return [v[0] / n, v[1] / n, v[2] / n]; }

export function cameraFrame(camera: WorldCamera, aspect: number) {
  const distance = 40 * Math.max(1, 1 / Math.max(aspect, 0.1)) / camera.zoom;
  const target: Vec3 = [0, -0.7, 0];
  const eye: Vec3 = [Math.sin(camera.yaw) * Math.cos(camera.pitch) * distance, Math.sin(camera.pitch) * distance + target[1], Math.cos(camera.yaw) * Math.cos(camera.pitch) * distance];
  const back = normalize(sub(eye, target));
  const right = normalize(cross([0, 1, 0], back));
  const up = cross(back, right);
  const f = 1 / Math.tan(Math.PI / 8);
  const view = [right[0], up[0], back[0], 0, right[1], up[1], back[1], 0, right[2], up[2], back[2], 0, -dot(right, eye), -dot(up, eye), -dot(back, eye), 1];
  const near = 0.1, far = 180;
  const projection = [f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) / (near - far), -1, 0, 0, 2 * far * near / (near - far), 0];
  const matrix = new Float32Array(16);
  for (let col = 0; col < 4; col++) for (let row = 0; row < 4; row++) for (let k = 0; k < 4; k++) matrix[col * 4 + row] += projection[k * 4 + row] * view[col * 4 + k];
  return { matrix, eye, right, up, back, f, aspect };
}
export function project(point: Vec3, frame: ReturnType<typeof cameraFrame>, width: number, height: number) {
  const delta = sub(point, frame.eye), depth = -dot(delta, frame.back);
  return { x: (dot(delta, frame.right) * frame.f / frame.aspect / depth + 1) * width / 2, y: (1 - dot(delta, frame.up) * frame.f / depth) * height / 2, depth };
}
export function screenRay(x: number, y: number, frame: ReturnType<typeof cameraFrame>): Vec3 {
  return normalize(frame.back.map((n, i) => -n + frame.right[i] * x * frame.aspect / frame.f + frame.up[i] * y / frame.f) as Vec3);
}
export function intersectBox(origin: Vec3, direction: Vec3, min: Vec3, max: Vec3): number | null {
  let near = 0, far = Infinity;
  for (let i = 0; i < 3; i++) {
    if (Math.abs(direction[i]) < 1e-8) { if (origin[i] < min[i] || origin[i] > max[i]) return null; continue; }
    const a = (min[i] - origin[i]) / direction[i], b = (max[i] - origin[i]) / direction[i];
    near = Math.max(near, Math.min(a, b)); far = Math.min(far, Math.max(a, b));
    if (near > far) return null;
  }
  return near;
}
