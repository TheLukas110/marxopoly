import { cross, normalize, sub, type Vec3 } from './math.js';

/** Small, dependency-free solid mesh builder. All surfaces have depth-tested faces. */
export class Geometry {
  vertices: number[] = [];
  private colors = new Map<string, Vec3>();
  color(hex: string): Vec3 {
    if (!this.colors.has(hex)) this.colors.set(hex, [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255) as Vec3);
    return this.colors.get(hex)!;
  }
  triangle(a: Vec3, b: Vec3, c: Vec3, hex: string) {
    const normal = normalize(cross(sub(b, a), sub(c, a))), color = this.color(hex);
    for (const point of [a, b, c]) this.vertices.push(...point, ...normal, ...color);
  }
  quad(a: Vec3, b: Vec3, c: Vec3, d: Vec3, color: string) { this.triangle(a, b, c, color); this.triangle(a, c, d, color); }
  box(x: number, y: number, z: number, w: number, h: number, d: number, color: string, yaw = 0) {
    const p = (a: number, b: number, c: number): Vec3 => [x + a * Math.cos(yaw) + c * Math.sin(yaw), y + b, z - a * Math.sin(yaw) + c * Math.cos(yaw)];
    const a = w / 2, b = h / 2, c = d / 2;
    this.quad(p(-a,b,-c),p(-a,b,c),p(a,b,c),p(a,b,-c),color);
    this.quad(p(-a,-b,c),p(-a,-b,-c),p(a,-b,-c),p(a,-b,c),color);
    this.quad(p(-a,-b,c),p(a,-b,c),p(a,b,c),p(-a,b,c),color);
    this.quad(p(a,-b,-c),p(-a,-b,-c),p(-a,b,-c),p(a,b,-c),color);
    this.quad(p(a,-b,c),p(a,-b,-c),p(a,b,-c),p(a,b,c),color);
    this.quad(p(-a,-b,-c),p(-a,-b,c),p(-a,b,c),p(-a,b,-c),color);
  }
  cylinder(x: number, y: number, z: number, radius: number, height: number, color: string, segments = 20, topRadius = radius) {
    for (let i = 0; i < segments; i++) {
      const a = i * Math.PI * 2 / segments, b = (i + 1) * Math.PI * 2 / segments;
      const p = (angle: number, r: number, h: number): Vec3 => [x + Math.cos(angle) * r, y + h, z + Math.sin(angle) * r];
      this.quad(p(a,radius,0),p(a,topRadius,height),p(b,topRadius,height),p(b,radius,0),color);
      this.triangle([x,y+height,z],p(b,topRadius,height),p(a,topRadius,height),color);
      this.triangle([x,y,z],p(a,radius,0),p(b,radius,0),color);
    }
  }
  ball(x: number, y: number, z: number, radius: number, color: string) {
    const p = (a: number, b: number): Vec3 => [x + radius * Math.sin(a) * Math.cos(b), y + radius * Math.cos(a), z + radius * Math.sin(a) * Math.sin(b)];
    for (let i = 0; i < 8; i++) for (let j = 0; j < 12; j++) {
      const a = i * Math.PI / 8, b = j * Math.PI / 6, c = (i+1)*Math.PI/8, d = (j+1)*Math.PI/6;
      this.quad(p(a,b),p(a,d),p(c,d),p(c,b),color);
    }
  }
  arch(x: number, y: number, z: number, radius: number, thickness: number, depth: number, color: string, full = false) {
    const steps = full ? 48 : 32, arc = full ? Math.PI * 2 : Math.PI;
    const p = (angle: number, r: number, side: number): Vec3 => [x + Math.cos(angle) * r, y + Math.sin(angle) * r, z + side * depth / 2];
    for (let i = 0; i < steps; i++) {
      const a = i * arc / steps, b = (i + 1) * arc / steps, inner = radius - thickness;
      this.quad(p(a,radius,1),p(b,radius,1),p(b,inner,1),p(a,inner,1),color);
      this.quad(p(b,radius,-1),p(a,radius,-1),p(a,inner,-1),p(b,inner,-1),color);
      this.quad(p(a,radius,-1),p(b,radius,-1),p(b,radius,1),p(a,radius,1),color);
      this.quad(p(b,inner,-1),p(a,inner,-1),p(a,inner,1),p(b,inner,1),color);
    }
  }
  beam(a: Vec3, b: Vec3, width: number, color: string) {
    const dir = normalize(sub(b,a));
    const side = normalize(cross(dir, Math.abs(dir[1]) > 0.9 ? [1,0,0] : [0,1,0]));
    const up = cross(dir, side);
    const p = (v: Vec3, s: number, t: number): Vec3 => v.map((n,i) => n + width/2*(s*side[i]+t*up[i])) as Vec3;
    for (const [s,t,u,v] of [[1,1,-1,1],[-1,1,-1,-1],[-1,-1,1,-1],[1,-1,1,1]]) this.quad(p(a,s,t),p(b,s,t),p(b,u,v),p(a,u,v),color);
  }
  data() { return new Float32Array(this.vertices); }
}
