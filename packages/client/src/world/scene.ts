import { BOARD, type GameState, type Tile } from '@marxopoly/shared';
import { tileColor } from '../lib.js';
import { Geometry } from './geometry.js';
import { worldTheme } from './themes.js';
import type { Vec3 } from './math.js';
import { EXPEDITION_SCENES, expeditionMarker } from './expeditions.js';

export interface WorldTile { id: number; center: Vec3; min: Vec3; max: Vec3; color: string; yaw: number }
export const RAINBOW = ['#e97479', '#eea45b', '#efcf65', '#73bba0', '#719dd2', '#aa89c9'];

/** Equal-sized spaces around a circular district, with themed elevations. */
export function worldTile(id: number, theme: string, data: Tile = BOARD[id]!): WorldTile {
  const step = id % 10, angle = Math.PI / 2 + id * Math.PI * 2 / BOARD.length;
  const x = Math.cos(angle) * 10.5, z = Math.sin(angle) * 10.5;
  const y = theme === 'cyber' ? 0.22 + Math.floor(step / 3) * 0.13 : theme === 'dummy' ? 0.22 + (Math.floor(step / 2) % 2) * 0.15 : 0.22;
  const halfWidth=0.73;
  return { id, center: [x,y,z], min: [x-halfWidth,y-0.22,z-0.8], max: [x+halfWidth,y+0.14,z+0.8], color: tileColor(data) ?? worldTheme(theme).accent, yaw: Math.atan2(x,z) };
}

export function tileOffset(tile: WorldTile, x: number, y: number, z: number): Vec3 {
  return [tile.center[0]+x*Math.cos(tile.yaw)+z*Math.sin(tile.yaw),tile.center[1]+y,tile.center[2]-x*Math.sin(tile.yaw)+z*Math.cos(tile.yaw)];
}

/** Follow the board ring, including Start, instead of crossing the scenery. */
export function movementPoint(theme: string, from: number, to: number, progress: number): Vec3 {
  const forward=(to-from+40)%40,steps=forward<=20?forward:forward-40;
  const travelled=Math.min(1,Math.max(0,progress))*Math.abs(steps),whole=Math.floor(travelled),fraction=travelled-whole,sign=Math.sign(steps);
  const first=worldTile((from+whole*sign+40)%40,theme).center;
  const next=worldTile((from+(whole+1)*sign+40)%40,theme).center;
  return [first[0]+(next[0]-first[0])*fraction,first[1]+(next[1]-first[1])*fraction+Math.sin(fraction*Math.PI)*0.32,first[2]+(next[2]-first[2])*fraction];
}

function tree(g: Geometry, x: number, z: number, color = '#507c5c', size = 1) {
  g.cylinder(x,0.12,z,0.1,0.8*size,'#72523f',7);
  g.cylinder(x,0.65*size,z,0.55*size,1.25*size,color,8,0);
  g.cylinder(x,1.1*size,z,0.4*size,0.95*size,color,8,0);
}
function house(g: Geometry, x: number, z: number, color: string, height = 1.4, width = 1.2, base = 0.1) {
  g.box(x,base+height/2,z,width,height,width,'#dfd4bd');
  g.cylinder(x,base+height,z,width*0.8,0.65,color,4,0);
  for (const dx of [-0.25,0.25]) for (let y = 0.45; y < height; y += 0.55) g.box(x+dx,base+y,z+width/2+0.01,0.18,0.25,0.03,'#42636a');
  g.box(x,base+0.26,z+width/2+0.025,0.23,0.52,0.04,'#84634c');
}
function tower(g: Geometry, x: number, z: number, height: number, color: string, width = 1.4) {
  g.box(x,height/2+0.12,z,width,height,width,'#273e51');
  g.box(x,height+0.16,z,width+0.1,0.12,width+0.1,color);
  for (let y = 0.5; y < height; y+=0.55) {
    g.box(x,y,z+width/2+0.02,width*0.7,0.09,0.035,color);
    g.box(x+width/2+0.02,y,z,0.035,0.09,width*0.7,color);
  }
  g.box(x-width/2,height/2,z-width/2,0.06,height,0.06,color);
}
function chips(g: Geometry, x: number, z: number, count: number, color: string, radius = 0.7, base = 0.1) {
  for (let i=0; i<count; i++) {
    g.cylinder(x,base+i*0.21,z,radius,0.17,color,24);
    g.cylinder(x,base+i*0.21+0.17,z,radius*0.96,0.04,'#e8dfcc',24);
    for (let j=0;j<6;j++) { const a=j*Math.PI/3; g.box(x+Math.cos(a)*radius*0.94,base+i*0.21+0.08,z+Math.sin(a)*radius*0.94,0.12,0.16,0.1,'#f4e8d3',-a); }
  }
}

function civic(g: Geometry) {
  // A canal cut through the town, crossed by two raised bridges.
  g.box(-2.1,0.09,0,1.8,0.13,13.7,'#65a8b0');
  for (const x of [-3.08,-1.13]) g.box(x,0.19,0,0.16,0.24,13.7,'#d2c8af');
  for (const z of [-3.5,3.5]) {
    g.box(-2.1,0.39,z,2.3,0.28,1.15,'#c9b79a');
    for (const dz of [-0.6,0.6]) { g.box(-2.1,0.72,z+dz,2.3,0.1,0.09,'#ebe0c6'); for (const x of [-3,-2.1,-1.2]) g.box(x,0.52,z+dz,0.08,0.5,0.08,'#ebe0c6'); }
  }
  g.box(2.5,0.13,0,6.5,0.14,6.5,'#c7c5a8');
  g.box(2.5,0.25,-0.5,2.3,0.3,2.3,'#d8ccb2');
  g.box(2.5,1.3,-0.5,1.6,2,1.6,'#e6d5ad');
  g.box(2.5,3,-0.5,1.15,1.5,1.15,'#f1e4ca');
  g.cylinder(2.5,3.75,-0.5,0.95,1.05,'#526f68',4,0);
  g.box(2.5,3.14,0.09,0.62,0.62,0.04,'#344946');
  g.box(2.5,3.23,0.12,0.05,0.23,0.03,'#f4e7be');
  g.box(2.62,3.13,0.12,0.26,0.05,0.03,'#f4e7be');
  for (const [x,z,h,c] of [[-5,-4,2,'#b46c50'],[-5,-1,1.5,'#697f77'],[-5,2,2.3,'#b46c50'],[0,-5,1.5,'#a6664c'],[3,-5,2.1,'#b4865b'],[5,4.8,1.6,'#b46c50']] as const) house(g,x,z,c,h,1.6);
  g.cylinder(2.5,0.24,2,0.9,0.25,'#a6b3a4'); g.cylinder(2.5,0.49,2,0.72,0.035,'#72b4bf'); g.cylinder(2.5,0.5,2,0.12,0.6,'#d3d8bc');
  for (const [x,z] of [[-5,5],[0,5],[2,5],[5,-2],[5,1],[-5,-6],[6,-5],[0,-2]]) tree(g,x,z);
  for (const z of [-6.9,6.9]) for (let x=-6;x<=6;x+=1.2) g.box(x,0.08,z,0.5,0.03,0.08,'#dce0c8');
}
function cyber(g: Geometry) {
  for (let i=-6;i<=6;i+=2) { g.box(i,0.09,0,0.035,0.035,13.5,'#397c83'); g.box(0,0.09,i,13.5,0.035,0.035,'#397c83'); }
  for (const [x,z,h,c] of [[-5,-4,4.1,'#70e7dc'],[-2,-5,2.8,'#ac91f0'],[2,-4,5.6,'#63d3cf'],[5,-3,3.5,'#d681cc'],[-5,1,2.7,'#a4d477'],[4,2,2.5,'#7daded'],[-2,4,1.9,'#6ce1dc'],[5,5,1.4,'#d78cab']] as const) tower(g,x,z,h,c);
  g.box(-0.2,2.8,-4.5,4.6,0.16,0.65,'#67858d'); g.box(-0.2,2.94,-4.18,4.6,0.05,0.05,'#6bf3dc');
  g.box(-5,2.1,-1.6,0.65,0.16,4.5,'#67858d'); g.box(-4.68,2.22,-1.6,0.05,0.05,4.5,'#c399f2');
  for (let i=0;i<3;i++) g.cylinder(0,0.12+i*0.18,0.5,2.3-i*0.3,0.15,i%2?'#5badae':'#294e64',8);
  g.cylinder(0,1.3,0.5,1.05,1.4,'#81e3d3',4,0.35);
  g.cylinder(0,0.75,0.5,0.35,0.55,'#54b7c7',4,1.05);
  g.arch(0,2,0.5,1.9,0.09,0.08,'#bc91e3',true);
  for (const [x,z] of [[-4,5],[2,5],[5,-6]]) { g.box(x,0.5,z,1.2,0.8,0.9,'#365265'); g.box(x,0.85,z+0.46,0.9,0.23,0.02,'#71e6d0'); }
}
function poker(g: Geometry) {
  for (const [x,z,n,c] of [[-4,-3,13,'#b4515b'],[-1.8,-4.5,18,'#34596a'],[1,-4,10,'#d3aa60'],[4,-2,9,'#b4515b'],[-4,2,5,'#34596a'],[4,3,4,'#d3aa60']] as const) chips(g,x,z,n,c,0.95);
  // A dimensional house of cards: leaning structural cards and a roof.
  for (const [x,z] of [[-1,1],[1,1],[-1,-1],[1,-1]]) {
    const a: Vec3=[x*1.6,0.2,z], b: Vec3=[x*0.4,2.8,z];
    g.beam(a,b,0.12,'#f1e8d2');
    for (let dz=-0.7;dz<=0.7;dz+=0.08) g.beam([a[0],a[1],z+dz],[b[0],b[1],z+dz],0.085,'#f1e8d2');
    g.ball(x,1.5,z+0.76,0.18,x<0?'#b84e59':'#354759');
  }
  g.box(0,2.9,0,2.7,0.09,3.5,'#e8d8b9');
  g.cylinder(0,3,0,0.9,0.2,'#ddb566');
  for(let i=0;i<5;i++) { const a=i*Math.PI*2/5; g.cylinder(Math.cos(a)*0.7,3.2,Math.sin(a)*0.7,0.23,0.7,'#ddb566',4,0); }
  g.box(1,0.5,5,1.25,0.85,1.25,'#f3e6cf',0.2); g.box(-1,0.5,4.5,1.25,0.85,1.25,'#f3e6cf',-0.3);
  for(const x of [-1.3,-0.7]) for(const z of [4.2,4.8]) g.cylinder(x,0.94,z,0.1,0.015,'#293c40',12);
  g.cylinder(1,0.94,5,0.12,0.015,'#b4515b',12);
}
function pride(g: Geometry) {
  g.box(0,0.11,1,3.8,0.11,11,'#e6dacd');
  RAINBOW.forEach((c,i) => g.arch(0,0.18,-1,3.5-i*0.25,0.23,0.48,c));
  // Observation wheel with spokes, hub and suspended cabins.
  const x=-4.7,y=2.7,z=-3.6;
  g.arch(x,y,z,2.15,0.1,0.13,'#f1ded5',true);
  g.beam([x-1,0.1,z+0.3],[x,y,z],0.17,'#8e799b'); g.beam([x+1,0.1,z+0.3],[x,y,z],0.17,'#8e799b');
  for (let i=0;i<10;i++) { const a=i*Math.PI/5,px=x+Math.cos(a)*2.1,py=y+Math.sin(a)*2.1; g.beam([x,y,z],[px,py,z],0.055,'#f6e7d6'); g.box(px,py-0.14,z+0.2,0.42,0.46,0.5,RAINBOW[i%6]); }
  g.ball(x,y,z+0.12,0.22,'#db96bc');
  g.cylinder(4.5,0.1,-3.3,1.8,0.45,'#9479ab',6); g.box(4.5,1.4,-4.2,3,2.2,0.2,'#b989b6');
  RAINBOW.forEach((c,i)=>g.box(3.25+i*0.5,1.4,-4.07,0.45,1.8,0.04,c));
  for (const [tx,tz,c] of [[-5,3,'#e99aa3'],[4.7,3,'#87bbaa'],[4.7,5.5,'#a991c3']] as const) { g.box(tx,0.65,tz,1.45,1.1,1.45,'#f2dfce'); g.cylinder(tx,1.2,tz,1.2,0.85,c,4,0); }
  for(const tx of [-5.8,5.8]) { g.cylinder(tx,0.1,0,0.055,2.2,'#f3e5d4',8); }
  g.beam([-5.8,2.3,0],[5.8,2.3,0],0.025,'#e2d5bd');
  for(let i=0;i<15;i++) { const px=-5.5+i*0.78; g.triangle([px,2.3,0],[px+0.5,2.3,0],[px+0.25,1.85,0],RAINBOW[i%6]); }
  for(const [tx,tz] of [[-6,6],[-5,-6],[6,0],[0,6]]) tree(g,tx,tz,'#719e89',0.8);
}
function blocks(g: Geometry) {
  for(let x=-6;x<=6;x+=2) for(let z=-6;z<=6;z+=2) g.cylinder(x,0.12,z,0.23,0.09,'#a6bac0',12);
  for(const [x,z,n,c] of [[-4,-4,4,'#da8b73'],[-1,-4,2,'#e4bf67'],[3,-4,5,'#739dc0'],[-4,2,2,'#8eafa0'],[3,4,2,'#a397be']] as const) {
    for(let i=0;i<n;i++) { g.box(x+(i%2)*0.16,0.6+i*1.05,z,1.6,1,1.6,c); for(const dx of [-0.4,0.4]) for(const dz of [-0.4,0.4]) g.cylinder(x+dx+(i%2)*0.16,1.1+i*1.05,z+dz,0.19,0.12,c,12); }
  }
  // Open lattice crane with a suspended block.
  for(const x of [0.6,1.4]) for(const z of [-0.4,0.4]) g.box(x,2.8,z,0.12,5.5,0.12,'#e8c15f');
  for(let y=0.3;y<5.3;y+=0.7) { g.beam([0.6,y,0.4],[1.4,y+0.7,0.4],0.08,'#e8c15f'); g.beam([1.4,y,-0.4],[0.6,y+0.7,-0.4],0.08,'#e8c15f'); }
  g.box(0,5.6,0,7,0.22,0.7,'#e8c15f'); g.box(1,5.25,0.25,1.4,0.8,1.2,'#d9af58'); g.box(0.8,5.3,0.88,0.7,0.45,0.03,'#49667d');
  g.beam([-3,5.6,0],[-3,2.8,0],0.045,'#3b4b56'); g.box(-3,2.25,0,1.1,1.1,1.1,'#d87e73');
  for(const z of [3,5]) { g.box(0,0.4,z,1.6,0.6,0.8,'#e3bf64'); g.ball(-0.5,0.23,z+0.4,0.23,'#394953'); g.ball(0.5,0.23,z+0.4,0.23,'#394953'); }
}

export function buildWorld(theme: string, board: readonly Tile[] = BOARD) {
  const g=new Geometry(), palette=worldTheme(theme);
  g.cylinder(0,-0.65,0,12.1,0.7,palette.base,80);
  g.cylinder(0,0.05,0,11.85,0.12,palette.accent,80);
  g.cylinder(0,0.17,0,11.55,0.04,palette.ground,80);
  const tiles=board.map(tile=>worldTile(tile.id,theme,tile));
  for(const tile of tiles) {
    const [x,y,z]=tile.center;
    const width=1.46;
    g.box(x,y-0.1,z,width,0.25,1.68,palette.tile,tile.yaw);
    const marker=tileOffset(tile,0,0.03,-0.57);
    g.cylinder(...marker,0.17,0.06,tile.color,6);
    const data=board[tile.id]!;
    if(data.kind==='street') {
      // Small architectural markers leave the property names and pieces clear.
      const bx=x*0.96,bz=z*0.96;
      if(EXPEDITION_SCENES[theme]) expeditionMarker(g,theme,bx,y+0.03,bz,tile.color);
      else if(theme==='cyber') tower(g,bx,bz,0.6+(tile.id%3)*0.22,tile.color,0.36);
      else if(theme==='poker') chips(g,bx,bz,2+(tile.id%3),tile.color,0.25,y+0.1);
      else if(theme==='dummy') { g.box(bx,y+0.38,bz,0.45,0.65,0.45,tile.color); g.cylinder(bx,y+0.7,bz,0.12,0.1,tile.color,8); }
      else house(g,bx,bz,tile.color,0.35,0.4,y+0.03);
    } else if(data.kind==='depot') { g.box(x,y+0.24,z,0.9,0.35,0.35,'#75838e'); g.box(x,y+0.45,z,1.05,0.12,0.6,palette.accent); }
    else if(data.kind==='works') { g.cylinder(x,y+0.04,z,0.3,0.5,'#a4b3b2',12); g.cylinder(x+0.3,y+0.04,z,0.1,0.85,palette.accent,8); }
    else if(tile.id%10===0) { g.cylinder(x,y+0.06,z,0.42,0.16,tile.color,8); if(tile.id===0) g.cylinder(x,y+0.22,z,0.26,0.65,palette.accent,4,0); else g.arch(x,y+0.23,z,0.4,0.09,0.12,tile.color); }
  }
  if(EXPEDITION_SCENES[theme]) EXPEDITION_SCENES[theme](g);
  else if(theme==='cyber') cyber(g); else if(theme==='poker') poker(g); else if(theme==='pride') pride(g); else if(theme==='dummy') blocks(g); else civic(g);
  return { data:g.data(), tiles };
}

/** Shared by the solid pieces and their overlay markers, including stacked players. */
export function piecePoint(theme: string, state: GameState, player: GameState['players'][number], position?: Vec3): Vec3 {
  const group=state.players.filter(p=>!p.bankrupt && p.position===player.position),index=group.indexOf(player);
  const tile=worldTile(player.position,theme),[x,y,z]=position ?? tile.center;
  const cols=Math.min(3,group.length),row=Math.floor(index/cols),rowCount=Math.min(cols,group.length-row*cols);
  const offsetX=(index%cols-(rowCount-1)/2)*0.44,offsetZ=0.2+(row-(Math.ceil(group.length/cols)-1)/2)*0.33;
  return [x+offsetX*Math.cos(tile.yaw)+offsetZ*Math.sin(tile.yaw),y,z-offsetX*Math.sin(tile.yaw)+offsetZ*Math.cos(tile.yaw)];
}

export function buildPieces(theme: string, state?: GameState, selected: number | null = null, hovered: number | null = null, positions: Record<string,Vec3> = {}) {
  const g=new Geometry();
  for(const id of new Set([selected,hovered])) if(id!==null) {
    const tile=worldTile(id,theme),c=id===selected?'#f6cf7e':'#edf4e3',half=0.73;
    for(const sign of [-1,1]) { g.box(...tileOffset(tile,sign*half,0.09,0),0.06,0.08,1.74,c,tile.yaw); g.box(...tileOffset(tile,0,0.09,sign*0.84),half*2,0.08,0.06,c,tile.yaw); }
  }
  if(!state) return g.data();
  for(const [key,deed] of Object.entries(state.deeds)) {
    if(!deed?.ownerId) continue;
    const owner=state.players.find(p=>p.id===deed.ownerId); if(!owner) continue;
    const tile=worldTile(Number(key),theme),[x,y,z]=tile.center;
    g.box(...tileOffset(tile,0,0.08,0.7),1.35,0.08,0.13,deed.mortgaged?'#7d8287':owner.color,tile.yaw);
    if(deed.houses===5) { g.cylinder(...tileOffset(tile,0,0.14,-0.4),0.28,1.4,owner.color,6); g.cylinder(...tileOffset(tile,0,1.54,-0.4),0.34,0.13,'#f2d5ab',6); }
    else for(let i=0;i<deed.houses;i++) g.cylinder(...tileOffset(tile,-0.48+i*0.32,0.14,-0.45),0.12,0.18+i*0.12,owner.color,6);
  }
  const active=state.players.filter(p=>!p.bankrupt);
  for(const player of active) {
    const [x,y,z]=piecePoint(theme,state,player,positions[player.id]);
    const c=player.color;
    g.cylinder(x,y+0.08,z,0.21,0.1,'#ecdbc0',16);
    g.cylinder(x,y+0.18,z,0.18,0.36,c,12,0.1);
    if(player.token==='rocket') { g.cylinder(x,y+0.54,z,0.14,0.35,c,10,0); g.box(x,y+0.26,z,0.45,0.1,0.1,c); }
    else if(player.token==='crown') { g.cylinder(x,y+0.54,z,0.22,0.15,c,8); for(const dx of [-0.14,0,0.14]) g.cylinder(x+dx,y+0.69,z,0.065,0.18,'#f1d4a1',4,0); }
    else { g.ball(x,y+0.65,z,0.18,c); }
    if(player.seat===state.turnSeat) g.cylinder(x,y+0.035,z,0.29,0.035,'#fff2c9',20);
  }
  return g.data();
}
