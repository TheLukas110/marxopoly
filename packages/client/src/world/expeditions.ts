import { Geometry } from './geometry.js';

function mushroom(g: Geometry, x: number, z: number, size: number, color: string) {
  g.cylinder(x,0.2,z,size*0.22,size*1.3,'#efe1bb',12);
  g.cylinder(x,0.2+size*1.3,z,size,0.65*size,color,16,0.18*size);
  for(let i=0;i<5;i++) {
    const a=i*Math.PI*2/5;
    g.ball(x+Math.cos(a)*size*0.55,0.2+size*1.66,z+Math.sin(a)*size*0.55,size*0.12,'#fff0d5');
  }
}

export const EXPEDITION_SCENES: Record<string, (g: Geometry) => void> = {
  abyss(g) {
    g.cylinder(0,0.2,-1,2.5,0.45,'#d6c9a1',32);
    g.ball(0,1.2,-1,1.8,'#97d5d7');
    for(let i=0;i<8;i++) {
      const a=i*Math.PI/4;
      g.cylinder(Math.cos(a)*2,0.5,-1+Math.sin(a)*2,0.1,1.6,'#e7d5a9',8);
    }
    g.arch(0,1.2,-1,1.85,0.1,0.12,'#f0dcab',true);
    g.box(0,0.55,2.6,1.1,0.4,3,'#ccb990');
    g.box(4,1.1,2,2.6,1.1,1.15,'#edc16f');
    g.ball(2.7,1.1,2,0.57,'#edc16f');g.ball(5.3,1.1,2,0.57,'#edc16f');
    g.cylinder(4,1.65,2,0.12,0.65,'#dfac59',8);
    for(const x of [3.3,4,4.7]) g.ball(x,1.15,2.58,0.21,'#315c72');
    for(const [x,z] of [[-5,-4],[-4,3],[4,-4],[-2,5],[5,5]]) {
      for(let i=0;i<3;i++) {
        const px=x+(i-1)*0.35,h=0.8+i*0.4;
        g.beam([px,0.2,z],[px,h,z],0.16,'#dd939a');
        g.beam([px,h*0.6,z],[px+0.35,h,z+0.2],0.12,'#eeb09e');
        g.ball(px,h+0.15,z,0.19,'#b2e4d5');
      }
    }
  },
  lunar(g) {
    for(const [x,z,r] of [[-4,-3,1.5],[0,-4,1.2],[4,-3,1.6]]) {
      g.cylinder(x,0.2,z,r+0.15,0.25,'#c6ccdf',24);
      g.ball(x,0.55,z,r,'#becbe4');
      g.box(x,0.55,z+r,0.5,0.65,0.45,'#4c628c');
    }
    g.box(0,0.4,-3,8,0.4,0.5,'#c6ccdf');
    for(const x of [-4,4]) for(const z of [1.5,3.5]) {
      g.cylinder(x,0.2,z,0.09,0.7,'#b1bdd3',8);
      g.box(x,0.95,z,2.3,0.12,1.3,'#344e8d');
      for(let i=-2;i<=2;i++) g.box(x+i*0.4,1.02,z,0.035,0.02,1.3,'#879fde');
    }
    g.cylinder(0,0.2,2,1.6,0.2,'#525d7d',24);
    g.cylinder(0,0.4,2,0.55,2.7,'#e8e7e0',16);
    g.cylinder(0,3.1,2,0.55,1,'#c88e91',16,0);
    for(const dx of [-0.7,0.7]) g.box(dx,0.8,2,0.35,0.9,0.7,'#b8c6e8');
    g.ball(3,4,-3,0.85,'#d9b897');g.arch(3,4,-3,1.4,0.16,0.12,'#e9d2ab',true);
    for(const [x,z] of [[-5,5],[2,6],[-6,0]]) {g.cylinder(x,0.22,z,0.7,0.08,'#66728d',16);g.cylinder(x,0.3,z,0.5,0.025,'#77829c',16);}
  },
  mycelium(g) {
    g.cylinder(0,0.2,1,2.5,0.12,'#c4c7a0',32);g.cylinder(0,0.33,1,2.15,0.025,'#76ada3',32);
    for(const [x,z,s,c] of [[-4,-3,1.8,'#c66e62'],[0,-4,1.4,'#cb995d'],[4,-2,1.65,'#b788ac'],[-4,3,1,'#cd9b61'],[4,4,1.15,'#c66e62']] as const) mushroom(g,x,z,s,c);
    for(let i=0;i<10;i++) {const a=i*Math.PI/5;mushroom(g,Math.cos(a)*3.3,1+Math.sin(a)*3.3,0.3,'#dfb788');}
    g.box(0,0.5,1,1,0.18,5.5,'#9e7851');
    for(const x of [-5.5,5.5]) {
      g.cylinder(x,0.2,0,0.15,2.5,'#68543f',8);
      g.beam([x,2.7,0],[x-0.6,2.7,0],0.09,'#68543f');g.ball(x-0.6,2.4,0,0.25,'#f5d991');
    }
  },
  oasis(g) {
    g.cylinder(1,0.21,2,2.6,0.06,'#f0d599',32);g.cylinder(1,0.28,2,2.2,0.03,'#5bb9b5',32);
    for(const [x,z,size] of [[-3,-3,3.7],[2,-4,2.4]]) for(let i=0;i<5;i++) {
      const w=size-i*size/6;g.box(x,0.5+i*0.55,z,w,0.55,w,i%2?'#d7ac68':'#e9c184');
    }
    for(const [x,z] of [[-3,3],[4,1],[3,5],[-5,0]]) {
      g.cylinder(x,0.2,z,0.16,2.2,'#a68050',10,0.12);
      for(let i=0;i<6;i++) {const a=i*Math.PI/3;g.beam([x,2.4,z],[x+Math.cos(a)*1.2,1.95,z+Math.sin(a)*1.2],0.25,'#638f64');}
    }
    for(const [x,z,c] of [[-5,5,'#ba7060'],[5,-3,'#588f95'],[5,4,'#ba7060']] as const) {
      g.box(x,0.65,z,1.4,0.85,1.3,'#f0d8a6');g.cylinder(x,1.08,z,1.1,0.6,c,4,0);
    }
  },
  confection(g) {
    for(let i=0;i<3;i++) {
      const r=2.5-i*0.65,y=0.2+i*0.95;
      g.cylinder(0,y,-1,r,0.9,i%2?'#d8b1d8':'#f0c3bd',32);
      g.cylinder(0,y+0.8,-1,r+0.05,0.15,'#fff0d9',32);
      for(let j=0;j<10;j++) {const a=j*Math.PI/5;g.ball(Math.cos(a)*r,y+0.75,-1+Math.sin(a)*r,0.16,'#fff0d9');}
    }
    g.ball(0,3.35,-1,0.4,'#cb647e');
    for(const [x,z,c] of [[-5,-3,'#b1dbce'],[4,-4,'#d7b0e3'],[-4,3,'#f0b5c9'],[5,2,'#edce91']] as const) {
      g.cylinder(x,0.2,z,0.1,2,'#fff0d9',8);g.ball(x,2.3,z,0.7,c);g.arch(x,2.3,z+0.6,0.4,0.08,0.04,'#fff0d9',true);
    }
    g.arch(0,0.2,4,1.6,0.3,0.4,'#fff0d9');
    for(const x of [-1.45,1.45]) for(let i=0;i<3;i++) g.box(x,0.4+i*0.4,4,0.3,0.18,0.42,'#d983a2');
    for(let i=0;i<7;i++) g.cylinder(-4+i*1.3,0.2,6,0.35,0.6,i%2?'#b1dbce':'#d7b0e3',12,0.12);
  },
  clockwork(g) {
    g.box(0,0.45,-1,3,0.5,2,'#776147');
    g.arch(0,2.5,-1,2.1,0.4,0.5,'#d6ac63',true);
    g.ball(0,2.5,-1,0.35,'#d6ac63');
    for(let i=0;i<12;i++) {
      const a=i*Math.PI/6,x=Math.cos(a),y=Math.sin(a);
      g.box(x*2.1,2.5+y*2.1,-1,0.45,0.45,0.65,'#d6ac63');
      if(i%2===0)g.beam([0,2.5,-1],[x*1.8,2.5+y*1.8,-1],0.13,'#d6ac63');
    }
    for(const [x,z,h] of [[-4,-3,2],[4,-4,2.7],[-4,3,1.3],[4,3,1.7]]) {
      g.box(x,h/2+0.2,z,1.8,h,1.6,'#a87858');g.box(x,h+0.3,z,2,0.2,1.8,'#658b86');
      g.cylinder(x+0.5,h+0.4,z,0.22,1,'#785b47',12);
      for(const dx of [-0.45,0,0.45])g.box(x+dx,0.9,z+0.81,0.22,0.55,0.03,'#edcf90');
    }
    for(let i=-2;i<=2;i++)g.arch(i*1.7,0.2,5.5,0.85,0.2,0.6,'#c6b184');
    g.box(0,1.15,5.5,9,0.2,0.8,'#c6b184');g.box(0,1.27,5.5,9,0.04,0.45,'#71a4a2');
  },
};

/** Tiny themed buildings preserve the space needed for labels and pieces. */
export function expeditionMarker(g: Geometry, theme: string, x: number, y: number, z: number, color: string) {
  if(theme==='mycelium') mushroom(g,x,z,0.3,color);
  else if(theme==='abyss' || theme==='lunar') {g.cylinder(x,y,z,0.3,0.12,color,12);g.ball(x,y+0.2,z,0.25,color);}
  else if(theme==='oasis') g.cylinder(x,y,z,0.4,0.6,color,4,0);
  else if(theme==='confection') {g.cylinder(x,y,z,0.07,0.4,'#fff0d9',8);g.ball(x,y+0.5,z,0.23,color);}
  else {g.box(x,y+0.2,z,0.45,0.4,0.45,color);g.cylinder(x,y+0.4,z,0.1,0.3,'#d6ac63',8);}
}
