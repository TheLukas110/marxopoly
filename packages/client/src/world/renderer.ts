import { BOARD, type GameState } from '@marxopoly/shared';
import { money } from '../lib.js';
import { cameraFrame, intersectBox, project, screenRay, type WorldCamera, type Vec3 } from './math.js';
import { buildPieces, buildWorld, movementPoint, tileOffset } from './scene.js';
import { visibleLabels } from './labels.js';

const VERTEX = `
attribute vec3 aPosition;
attribute vec3 aNormal;
attribute vec3 aColor;
uniform mat4 uMatrix;
varying vec3 vColor;
void main() {
  vec3 normal = normalize(aNormal);
  float sun = max(dot(normal, normalize(vec3(-0.6, 1.0, 0.8))), 0.0);
  float sky = normal.y * 0.13 + 0.73;
  vColor = aColor * (sky + sun * 0.35);
  gl_Position = uMatrix * vec4(aPosition, 1.0);
}`;
const FRAGMENT = `precision mediump float; varying vec3 vColor; void main() { gl_FragColor = vec4(vColor, 1.0); }`;

export function createWorldRenderer(canvas: HTMLCanvasElement, labels: HTMLCanvasElement, theme: string) {
  const gl=canvas.getContext('webgl',{antialias:true,alpha:true,premultipliedAlpha:false});
  if(!gl) throw new Error('3D rendering is unavailable on this device.');
  const context=labels.getContext('2d');
  if(!context) throw new Error('Canvas rendering is unavailable on this device.');
  const compile=(type: number, source: string) => {
    const shader=gl.createShader(type); if(!shader) throw new Error('Could not create the 3D shader.');
    gl.shaderSource(shader,source); gl.compileShader(shader);
    if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS)) { const message=gl.getShaderInfoLog(shader); gl.deleteShader(shader); throw new Error(message ?? 'Shader compilation failed.'); }
    return shader;
  };
  const vertex=compile(gl.VERTEX_SHADER,VERTEX),fragment=compile(gl.FRAGMENT_SHADER,FRAGMENT);
  const program=gl.createProgram(); if(!program) throw new Error('Could not create the 3D scene.');
  gl.attachShader(program,vertex); gl.attachShader(program,fragment); gl.linkProgram(program);
  gl.deleteShader(vertex); gl.deleteShader(fragment);
  if(!gl.getProgramParameter(program,gl.LINK_STATUS)) { gl.deleteProgram(program); throw new Error('Could not link the 3D shaders.'); }
  const world=buildWorld(theme), staticBuffer=gl.createBuffer(), dynamicBuffer=gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER,staticBuffer); gl.bufferData(gl.ARRAY_BUFFER,world.data,gl.STATIC_DRAW);
  const attributes=['aPosition','aNormal','aColor'].map(name=>gl.getAttribLocation(program,name));
  const matrixLocation=gl.getUniformLocation(program,'uMatrix');
  let dynamicCount=0, width=1, height=1, frame=cameraFrame({yaw:0.58,pitch:0.82,zoom:1},1);
  let state: GameState | undefined;
  let selected: number | null=null, hovered: number | null=null;
  const movements=new Map<string,{from:number;to:number;start:number;duration:number}>();
  const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)');
  function uploadPieces() {
    const positions: Record<string,Vec3>={};
    const now=performance.now();
    for(const [id,move] of movements) {
      const progress=reducedMotion.matches?1:Math.max(0,(now-move.start)/move.duration);
      if(progress>=1) movements.delete(id);
      else positions[id]=movementPoint(theme,move.from,move.to,progress);
    }
    const data=buildPieces(theme,state,selected,hovered,positions);dynamicCount=data.length/9;
    gl!.bindBuffer(gl!.ARRAY_BUFFER,dynamicBuffer);gl!.bufferData(gl!.ARRAY_BUFFER,data,gl!.DYNAMIC_DRAW);
  }
  function update(nextState: GameState | undefined, nextSelected: number | null, nextHovered: number | null) {
    if(state && nextState && nextState!==state) {
      const rolled=nextState.dice?.join(',')!==state.dice?.join(',');
      for(const player of nextState.players) {
        const previous=state.players.find(p=>p.id===player.id);
        if(previous && previous.position!==player.position && !player.bankrupt && !reducedMotion.matches) {
          const forward=(player.position-previous.position+40)%40;
          movements.set(player.id,{from:previous.position,to:player.position,start:performance.now()+(rolled?700:0),duration:Math.min(forward,40-forward)*115});
        }
        if(player.bankrupt) movements.delete(player.id);
      }
    }
    state=nextState; selected=nextSelected; hovered=nextHovered;
    uploadPieces();
  }
  function render(camera: WorldCamera, w: number, h: number, showLabels: boolean) {
    width=Math.max(1,w);height=Math.max(1,h);
    const ratio=Math.min(window.devicePixelRatio || 1,2);
    const pixelWidth=Math.round(width*ratio),pixelHeight=Math.round(height*ratio);
    if(canvas.width!==pixelWidth || canvas.height!==pixelHeight) {
      canvas.width=labels.width=pixelWidth;canvas.height=labels.height=pixelHeight;
    }
    frame=cameraFrame(camera,width/height);
    if(movements.size)uploadPieces();
    gl!.viewport(0,0,pixelWidth,pixelHeight);gl!.clearColor(0,0,0,0);gl!.clear(gl!.COLOR_BUFFER_BIT|gl!.DEPTH_BUFFER_BIT);
    gl!.enable(gl!.DEPTH_TEST);gl!.useProgram(program);gl!.uniformMatrix4fv(matrixLocation,false,frame.matrix);
    for(const [buffer,count] of [[staticBuffer,world.data.length/9],[dynamicBuffer,dynamicCount]] as const) {
      if(!count) continue;
      gl!.bindBuffer(gl!.ARRAY_BUFFER,buffer);
      attributes.forEach((location,i)=>{gl!.enableVertexAttribArray(location);gl!.vertexAttribPointer(location,3,gl!.FLOAT,false,36,i*12);});
      gl!.drawArrays(gl!.TRIANGLES,0,count);
    }
    context!.setTransform(ratio,0,0,ratio,0,0);context!.clearRect(0,0,width,height);
    if(!showLabels) return;
    const ctx=context!;
    // Measure all boxes before drawing so selected/hovered spaces win collisions.
    const candidates = world.tiles.flatMap(tile => {
      const data=BOARD[tile.id],corner=tile.id%10===0;
      const active=tile.id===selected || tile.id===hovered;
      if(width<520 && !corner && !active) return [];
      const p=project(tileOffset(tile,0,0.12,0.62),frame,width,height);
      if(p.depth<=0) return [];
      const text=state?.tileNames[tile.id] ?? (corner ? {0:'START',10:'HOLD',20:'PLAZA',30:'DISPATCH'}[tile.id] : data.short ?? data.name) ?? data.name;
      const size=Math.max(10,Math.min(12,width/75));
      ctx.font=`600 ${size}px system-ui, sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';
      const maxWidth=Math.max(36,Math.min(84,width/10));
      let line=text;
      while(ctx.measureText(line).width>maxWidth && line.length>3) line=line.slice(0,-2)+'…';
      const price=active && 'price' in data ? money(data.price) : '';
      const boxWidth=Math.max(ctx.measureText(line).width,ctx.measureText(price).width)+12,boxHeight=price?size*2+9:size+8;
      return [{id:tile.id,x:p.x-boxWidth/2,y:p.y-4,width:boxWidth,height:boxHeight,
        priority:tile.id===hovered?3:tile.id===selected?2:corner?1:0,line,price,size}];
    });
    for(const box of visibleLabels(candidates,width,height)) {
      const highlighted=box.id===selected || box.id===hovered;
      const x=box.x+box.width/2;
      ctx.fillStyle=highlighted?'#f4d7a3':'rgba(16,28,32,0.86)';
      ctx.beginPath();ctx.roundRect(box.x,box.y,box.width,box.height,4);ctx.fill();
      ctx.font=`600 ${box.size}px system-ui, sans-serif`;
      ctx.fillStyle=highlighted?'#29352e':'#f2eee3';ctx.fillText(box.line,x,box.y+box.size/2+5);
      if(box.price) { ctx.font=`500 ${box.size-1}px system-ui, sans-serif`;ctx.fillStyle=highlighted?'#4c5446':'#c6d5cc';ctx.fillText(box.price,x,box.y+box.size*1.5+7); }
    }
  }
  function pick(x: number,y: number) {
    const ray=screenRay(x/width*2-1,1-y/height*2,frame);
    let nearest=Infinity,id: number | null=null;
    for(const tile of world.tiles) {
      const [x,y,z]=tile.center,cos=Math.cos(tile.yaw),sin=Math.sin(tile.yaw);
      const ox=frame.eye[0]-x,oz=frame.eye[2]-z;
      const origin: Vec3=[ox*cos-oz*sin,frame.eye[1]-y,ox*sin+oz*cos];
      const direction: Vec3=[ray[0]*cos-ray[2]*sin,ray[1],ray[0]*sin+ray[2]*cos];
      const min=tile.min.map((v,i)=>v-tile.center[i]) as Vec3,max=tile.max.map((v,i)=>v-tile.center[i]) as Vec3;
      const distance=intersectBox(origin,direction,min,max);
      if(distance!==null && distance<nearest) { nearest=distance;id=tile.id; }
    }
    return id;
  }
  return { render,update,pick,isAnimating:()=>movements.size>0,dispose() { gl.deleteBuffer(staticBuffer);gl.deleteBuffer(dynamicBuffer);gl.deleteProgram(program); } };
}
