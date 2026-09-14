import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { createGame } from '@marxopoly/shared';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const server=await createServer({root:fileURLToPath(new URL('.',import.meta.url)),configFile:false,server:{middlewareMode:true,hmr:false},appType:'custom'});
after(()=>server.close());
const {buildWorld,buildPieces,worldTile,movementPoint}=await server.ssrLoadModule('/src/world/scene.ts');
const {cameraFrame,project,screenRay,intersectBox,WORLD_CAMERA,GAME_CAMERA}=await server.ssrLoadModule('/src/world/math.ts');
const {MAPS}=await server.ssrLoadModule('/src/maps/index.ts');
const {WORLD_THEMES}=await server.ssrLoadModule('/src/world/themes.ts');
const themes=MAPS.map(map=>map.id);

test('every selectable map has a matching world palette and preview', async()=>{
  const {access}=await import('node:fs/promises');
  assert.equal(new Set(themes).size,themes.length);
  assert.deepEqual(Object.keys(WORLD_THEMES).sort(),[...themes].sort());
  for(const theme of themes) await access(new URL(`public/worlds/${theme}.png`,import.meta.url));
});

test('crowded labels preserve inspection priority and reject clipped boxes', async () => {
  const {visibleLabels}=await server.ssrLoadModule('/src/world/labels.ts');
  const box={x:30,y:30,width:80,height:25,priority:0};
  const candidates=[{...box,id:1},{...box,id:2,priority:2},{...box,id:3,x:-1,priority:3},
    {...box,id:4,x:150},{...box,id:5,y:190}];
  assert.deepEqual(visibleLabels(candidates,300,200).map(b=>b.id),[2,4]);
  assert.equal(candidates[0].id,1,'layout must not mutate input order');
});

test('navigation survives hidden labels, fades after arrival and respects reduced motion',async(t)=>{
  const descriptor=Object.getOwnPropertyDescriptor(globalThis,'window');
  const {createWorldRenderer}=await server.ssrLoadModule('/src/world/renderer.ts');
  let now=0,reduced=false,rings=0,lines=0;
  t.mock.method(performance,'now',()=>now);
  try {
    Object.defineProperty(globalThis,'window',{configurable:true,value:{devicePixelRatio:1,matchMedia:()=>({get matches(){return reduced;}})}});
    const gl=new Proxy({createShader:()=>({}),createProgram:()=>({}),getShaderParameter:()=>true,getProgramParameter:()=>true},
      {get:(target,key)=>key in target?target[key]:typeof key==='string' && key===key.toUpperCase()?1:()=>{}});
    const ctx=new Proxy({arc(){rings++;},lineTo(){lines++;}}, {get:(target,key)=>key in target?target[key]:()=>{}});
    const renderer=createWorldRenderer({width:0,height:0,getContext:()=>gl},{getContext:()=>ctx},'cyber');
    const state=createGame('TRAIL',[{id:'p0',name:'Player'}],{seed:123});
    state.players[0].position=39;
    renderer.update(state,null,null);
    renderer.render(WORLD_CAMERA,800,600,false);
    assert.equal(rings,1,'active position stays visible without labels');
    const moved=structuredClone(state);moved.players[0].position=1;
    renderer.update(moved,null,null);
    now=115;lines=0;renderer.render(WORLD_CAMERA,800,600,false);
    assert.ok(lines>=80,'movement draws a sampled trail across Start');
    now=500;renderer.render(WORLD_CAMERA,800,600,false);
    assert.equal(renderer.isAnimating(),true,'trail lingers after the piece arrives');
    now=2000;lines=0;renderer.render(WORLD_CAMERA,800,600,false);
    assert.equal(renderer.isAnimating(),false,'finished trail stops requesting frames');
    assert.ok(lines<80,'expired trail is removed');
    reduced=true;
    const next=structuredClone(moved);next.players[0].position=4;
    renderer.update(next,null,null);rings=0;lines=0;
    renderer.render(WORLD_CAMERA,800,600,false);
    assert.equal(renderer.isAnimating(),false);assert.equal(rings,1);assert.ok(lines<80);
    renderer.dispose();
  } finally {if(descriptor)Object.defineProperty(globalThis,'window',descriptor);else delete globalThis.window;}
});

test('rendered label boxes never overlap or escape the viewport across all worlds and cameras', async () => {
  const descriptor=Object.getOwnPropertyDescriptor(globalThis,'window');
  const {createWorldRenderer}=await server.ssrLoadModule('/src/world/renderer.ts');
  try {
    Object.defineProperty(globalThis,'window',{configurable:true,value:{devicePixelRatio:2,matchMedia:()=>({matches:true})}});
    const state=createGame('TEST',[{id:'p0',name:'Player'}],{seed:123});
    state.tileNames[1]='A very long custom street name 🏘️';
    for(const theme of themes) {
      const boxes=[];
      const gl=new Proxy({createShader:()=>({}),createProgram:()=>({}),getShaderParameter:()=>true,getProgramParameter:()=>true},
        {get:(target,key)=>key in target?target[key]:typeof key==='string' && key===key.toUpperCase()?1:()=>{}});
      const ctx=new Proxy({measureText:text=>({width:Array.from(text).length*6}),roundRect:(x,y,w,h)=>boxes.push({x,y,w,h})},
        {get:(target,key)=>key in target?target[key]:()=>{}});
      const renderer=createWorldRenderer({width:0,height:0,getContext:()=>gl},{getContext:()=>ctx},theme);
      renderer.update(state,1,3);
      for(const [width,height] of [[320,360],[520,400],[800,600],[1100,550]]) {
        for(const yaw of [0,1.5,3,4.5])for(const pitch of [0.3,0.82,1.4])for(const zoom of [0.7,1,1.7]) {
          boxes.length=0;
          renderer.render({yaw,pitch,zoom},width,height,true);
          for(const [index,b] of boxes.entries()) {
            assert.ok(b.x>=0 && b.y>=0 && b.x+b.w<=width && b.y+b.h<=height,`${theme}: viewport bounds`);
            for(const other of boxes.slice(index+1)) {
              assert.ok(b.x+b.w<=other.x || other.x+other.w<=b.x || b.y+b.h<=other.y || other.y+other.h<=b.y,`${theme}: overlapping labels`);
            }
          }
          if(zoom===1) assert.ok(boxes.length>0,`${theme}: default zoom must retain labels`);
        }
      }
      boxes.length=0;renderer.render(WORLD_CAMERA,800,600,false);assert.equal(boxes.length,0);
      renderer.dispose();
    }
  } finally {if(descriptor)Object.defineProperty(globalThis,'window',descriptor);else delete globalThis.window;}
});

test('all worlds contain distinct, finite, solid geometry and exactly forty playable spaces',()=>{
  const counts=new Set();
  for(const theme of themes) {
    const {data,tiles}=buildWorld(theme);counts.add(data.length);
    assert.equal(tiles.length,40);assert.equal(new Set(tiles.map(t=>t.id)).size,40);
    assert.equal(data.length%27,0);assert.ok(data.length>27000);
    assert.ok(data.every(Number.isFinite),theme);
    let highest=0;
    for(let i=0;i<data.length;i+=9) { highest=Math.max(highest,data[i+1]);assert.ok(Math.abs(data[i])<=12.2);assert.ok(Math.abs(data[i+2])<=12.2); }
    assert.ok(highest>= (['standard','cyber','poker','pride','dummy'].includes(theme)?3.8:2.8),`${theme} must have a real vertical skyline`);
    assert.deepEqual(buildWorld(theme).data,data,`${theme} should be deterministic`);
  }
  assert.equal(counts.size,themes.length);
});

test('preview and closer game cameras fit every world on phone, tablet and desktop',()=>{
  for(const camera of [WORLD_CAMERA,GAME_CAMERA])
  for(const [width,height] of [[300,570],[320,360],[390,420],[760,600],[600,400],[1100,550],[930,904]]) {
    const frame=cameraFrame(camera,width/height);
    for(const theme of themes) {
      const {data}=buildWorld(theme);
      for(let i=0;i<data.length;i+=9) {
        const p=project([data[i],data[i+1],data[i+2]],frame,width,height);
        assert.ok(p.depth>0);assert.ok(p.x>=8 && p.x<=width-8,`${theme} horizontal fit ${width}x${height}: ${p.x}`);
        assert.ok(p.y>=8 && p.y<=height-8,`${theme} vertical fit ${width}x${height}: ${p.y}`);
      }
    }
  }
});

test('projection and pointer rays agree through full orbits and extreme pitches',()=>{
  for(const aspect of [0.8,1,1.6,2.4])for(const pitch of [0.3,0.82,1.4])for(let yaw=-Math.PI;yaw<Math.PI;yaw+=Math.PI/6) {
    const frame=cameraFrame({yaw,pitch,zoom:1},aspect);
    for(const point of [[0,0,0],[9,0.22,9],[-5,4,-3]]) {
      const p=project(point,frame,800*aspect,800),ray=screenRay(p.x/(800*aspect)*2-1,1-p.y/800*2,frame);
      const delta=point.map((v,i)=>v-frame.eye[i]),length=Math.hypot(...delta);
      ray.forEach((value,i)=>assert.ok(Math.abs(value-delta[i]/length)<1e-6));
      const m=frame.matrix,clip=Array.from({length:4},(_,i)=>m[i]*point[0]+m[i+4]*point[1]+m[i+8]*point[2]+m[i+12]);
      assert.ok(Math.abs((clip[0]/clip[3]+1)*400*aspect-p.x)<0.001);
      assert.ok(Math.abs((1-clip[1]/clip[3])*400-p.y)<0.001);
    }
  }
  assert.equal(intersectBox([0,2,0],[0,-1,0],[-1,0,-1],[1,1,1]),1);
  assert.equal(intersectBox([2,2,0],[0,-1,0],[-1,0,-1],[1,1,1]),null);
});

test('pieces walk around Start and never cut through the centre of any world',()=>{
  for(const theme of themes)for(const [from,to] of [[38,4],[3,0],[9,15],[29,35]]) {
    assert.deepEqual(movementPoint(theme,from,to,0),worldTile(from,theme).center);
    assert.deepEqual(movementPoint(theme,from,to,1),worldTile(to,theme).center);
    for(let i=0;i<=100;i++) {const [x,y,z]=movementPoint(theme,from,to,i/100);assert.ok(Math.max(Math.abs(x),Math.abs(z))>=7,theme);assert.ok(y>=0);}
  }
});

test('ownership, mortgages, hotels and eight players are reflected without mutating game state',()=>{
  const state=createGame('TEST',Array.from({length:8},(_,i)=>({id:`p${i}`,name:`Player ${i}`})),{seed:123});
  state.deeds[1].ownerId='p0';state.deeds[1].houses=5;state.deeds[3].ownerId='p1';state.deeds[3].mortgaged=true;
  const original=JSON.stringify(state);
  for(const theme of themes) {
    const data=buildPieces(theme,state,1,3);assert.ok(data.every(Number.isFinite));assert.ok(data.length>10000);
    assert.notDeepEqual(data,buildPieces(theme,undefined,1,3));
  }
  assert.equal(JSON.stringify(state),original);
});

test('3D property inspection remains accessible without pointer input',async()=>{
  const {default:WorldBoard}=await server.ssrLoadModule('/src/components/WorldBoard.tsx');
  const state=createGame('TEST',[{id:'p0',name:'Player'}],{seed:123});state.tileNames[1]='Custom street name';
  for(const theme of themes) {
    const html=renderToStaticMarkup(createElement(WorldBoard,{theme,state,selected:1,onSelect(){}}));
    assert.equal((html.match(/<option /g)??[]).length,41);
    assert.ok(html.includes('Custom street name'));assert.ok(html.includes('aria-label="Inspect a board space"'));assert.ok(html.includes('tabindex="0"'));
    assert.ok(html.includes('Zoom in'));assert.ok(html.includes('Reset world view'));
  }
});

test('world selection works when persistence is full or blocked',async()=>{
  const descriptor=Object.getOwnPropertyDescriptor(globalThis,'localStorage');
  try {
    Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:()=> 'standard',setItem(){throw new Error('Quota exceeded');}}});
    const maps=await server.ssrLoadModule('/src/maps/index.ts?storage=blocked');
    maps.setMapId('poker');assert.equal(maps.getMapId(),'poker');maps.setMapId('invalid');assert.equal(maps.getMapId(),'poker');
  } finally {if(descriptor)Object.defineProperty(globalThis,'localStorage',descriptor);else delete globalThis.localStorage;}
});

test('renderer selects every space on square and circular boards, and releases GPU resources',async()=>{
  const descriptor=Object.getOwnPropertyDescriptor(globalThis,'window');
  const {createWorldRenderer}=await server.ssrLoadModule('/src/world/renderer.ts');
  try {
    Object.defineProperty(globalThis,'window',{configurable:true,value:{devicePixelRatio:1,matchMedia:()=>({matches:true})}});
    for(const theme of themes) {
      let buffers=0,programs=0,draws=0;
      const gl=new Proxy({
        createBuffer(){buffers++;return {};},deleteBuffer(){buffers--;},createProgram(){programs++;return {};},deleteProgram(){programs--;},
        createShader:()=>({}),getShaderParameter:()=>true,getProgramParameter:()=>true,getAttribLocation:()=>0,getUniformLocation:()=>({}),drawArrays(){draws++;},
      },{get(target,key){return key in target?target[key]:typeof key==='string' && key===key.toUpperCase()?1:()=>{};}});
      const ctx=new Proxy({measureText:text=>({width:text.length*5})},{get:(target,key)=>key in target?target[key]:()=>{}});
      const canvas={width:0,height:0,getContext:()=>gl},labels={width:0,height:0,getContext:()=>ctx};
      const renderer=createWorldRenderer(canvas,labels,theme);
      renderer.update(undefined,null,null);
      for(const yaw of [0,1.5,3,4.5]) {
        const camera={...WORLD_CAMERA,yaw,pitch:1.1};renderer.render(camera,800,600,true);
        const frame=cameraFrame(camera,800/600);
        for(let id=0;id<40;id++) {const tile=worldTile(id,theme),p=project([tile.center[0],tile.center[1]+0.14,tile.center[2]],frame,800,600);assert.equal(renderer.pick(p.x,p.y),id,`${theme} tile ${id} at yaw ${yaw}`);}
      }
      assert.ok(draws>=4);renderer.dispose();assert.equal(buffers,0);assert.equal(programs,0);
    }
    assert.throws(()=>createWorldRenderer({getContext:()=>null},{getContext:()=>null},'standard'),/unavailable/);
  } finally {if(descriptor)Object.defineProperty(globalThis,'window',descriptor);else delete globalThis.window;}
});
