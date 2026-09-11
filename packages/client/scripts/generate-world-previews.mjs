// Rasterize the actual world meshes for the map gallery. No image service or
// browser is required; the depth buffer and lighting match the live renderer.
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';
import { createServer } from 'vite';

const root=fileURLToPath(new URL('..',import.meta.url));
const server=await createServer({root,configFile:false,server:{middlewareMode:true,hmr:false},appType:'custom'});
try {
  const { buildWorld }=await server.ssrLoadModule('/src/world/scene.ts');
  const { cameraFrame, project, WORLD_CAMERA }=await server.ssrLoadModule('/src/world/math.ts');
  const width=800,height=600,frame=cameraFrame(WORLD_CAMERA,width/height);
  const crcTable=Array.from({length:256},(_,i)=>{let c=i;for(let j=0;j<8;j++)c=c&1?0xedb88320^(c>>>1):c>>>1;return c;});
  function chunk(type,data) {
    const content=Buffer.concat([Buffer.from(type),data]);let crc=0xffffffff;
    for(const byte of content)crc=crcTable[(crc^byte)&255]^(crc>>>8);
    const result=Buffer.alloc(content.length+8);result.writeUInt32BE(data.length);content.copy(result,4);result.writeUInt32BE((crc^0xffffffff)>>>0,result.length-4);return result;
  }
  await mkdir(new URL('../public/worlds/',import.meta.url),{recursive:true});
  for(const theme of ['standard','cyber','poker','pride','dummy']) {
    const {data}=buildWorld(theme),pixels=Buffer.alloc(width*height*4),depth=new Float32Array(width*height);
    for(let offset=0;offset<data.length;offset+=27) {
      const p=[0,9,18].map(i=>project(Array.from(data.slice(offset+i,offset+i+3)),frame,width,height));
      const [a,b,c]=p,area=(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
      if(Math.abs(area)<0.001)continue;
      const minX=Math.max(0,Math.floor(Math.min(...p.map(v=>v.x)))),maxX=Math.min(width-1,Math.ceil(Math.max(...p.map(v=>v.x))));
      const minY=Math.max(0,Math.floor(Math.min(...p.map(v=>v.y)))),maxY=Math.min(height-1,Math.ceil(Math.max(...p.map(v=>v.y))));
      const n=Array.from(data.slice(offset+3,offset+6));
      const light=n[1]*0.13+0.73+Math.max(0,(n[0]*-0.6+n[1]+n[2]*0.8)/Math.sqrt(2))*0.35;
      const color=Array.from(data.slice(offset+6,offset+9)).map(v=>Math.min(255,Math.round(v*light*255)));
      for(let y=minY;y<=maxY;y++)for(let x=minX;x<=maxX;x++) {
        const u=((b.x-x)*(c.y-y)-(b.y-y)*(c.x-x))/area;
        const v=((c.x-x)*(a.y-y)-(c.y-y)*(a.x-x))/area,w=1-u-v;
        if(u<0||v<0||w<0)continue;
        const z=u/a.depth+v/b.depth+w/c.depth,index=y*width+x;
        if(z<=depth[index])continue;
        depth[index]=z;pixels[index*4]=color[0];pixels[index*4+1]=color[1];pixels[index*4+2]=color[2];pixels[index*4+3]=255;
      }
    }
    const header=Buffer.alloc(13);header.writeUInt32BE(width);header.writeUInt32BE(height,4);header[8]=8;header[9]=6;
    const scan=Buffer.alloc((width*4+1)*height);
    for(let y=0;y<height;y++)pixels.copy(scan,y*(width*4+1)+1,y*width*4,(y+1)*width*4);
    const png=Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',deflateSync(scan)),chunk('IEND',Buffer.alloc(0))]);
    await writeFile(new URL(`../public/worlds/${theme}.png`,import.meta.url),png);
    console.log(`${theme}: ${data.length/27} triangles, ${Math.round(png.length/1024)} KB preview`);
  }
} finally { await server.close(); }
